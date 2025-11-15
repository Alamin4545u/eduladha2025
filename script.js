document.addEventListener('DOMContentLoaded', async function () {
    const supabase = window.supabase;
    const tg = window.Telegram.WebApp;

    // --- Constants & Global Variables ---
    const BOT_USERNAME = "Bkash_earn_free_TkBot";
    const MINIMUM_WITHDRAW_AMOUNT = 10;
    let appConfig = { dailyReward: 1, dailyCheckinLimit: 1, referralBonus: 5, affiliateCommissionRate: 0.1 };
    let spinConfig = { dailyLimit: 5, rewards: [0.5, 1, 2, 0.5, 1.5, 1, 0.5, 2, 1, 1.5] };
    let quizConfig = { dailyLimit: 3, reward: 2, clickTarget: 3 };
    let paymentMethods = [];
    let telegramUser, userData = {};
    let isSpinning = false;
    let currentRotation = 0;
    let quizQuestions = [];
    let currentQuizIndex = 0;
    let selectedQuizOption = null;
    let adClicked = false;

    // --- UI Elements ---
    const screens = document.querySelectorAll('.screen');
    const navButtons = document.querySelectorAll('.nav-btn');
    const headerElements = { pic: document.getElementById('profilePic'), fullName: document.getElementById('headerFullName'), username: document.getElementById('headerUsername'), balance: document.getElementById('headerBalance') };
    const homeButtons = { dailyCheckin: document.getElementById('dailyCheckinBtn'), spin: document.getElementById('spinWheelBtn'), quiz: document.getElementById('quizBtn') };
    const spinScreenElements = { backBtn: document.getElementById('spinBackBtn'), triggerBtn: document.getElementById('spinTriggerBtn'), spinsLeft: document.getElementById('spinsLeft'), wheelGroup: document.getElementById('wheelGroup') };
    const walletElements = { balance: document.getElementById('withdrawBalance'), submitBtn: document.getElementById('submitWithdrawBtn'), paymentContainer: document.getElementById('payment-method-container') };
    const referElements = { linkInput: document.getElementById('referralLink'), shareBtn: document.getElementById('shareReferralBtn'), notice: document.getElementById('referral-notice'), count: document.getElementById('referral-count'), earnings: document.getElementById('referral-earnings') };
    const taskListContainer = document.getElementById('task-list');
    const quizScreenElements = { backBtn: document.getElementById('quizBackBtn'), progressText: document.getElementById('quiz-progress-text'), stepText: document.getElementById('quiz-step-text'), progressInner: document.getElementById('quiz-progress-inner'), instruction: document.getElementById('quiz-instruction'), questionText: document.getElementById('quiz-question-text'), optionsContainer: document.getElementById('quiz-options-container'), nextBtn: document.getElementById('next-quiz-btn') };

    tg.ready();
    tg.expand();

    if (!tg.initDataUnsafe || !tg.initDataUnsafe.user) {
        document.body.innerHTML = "<h1>অনুগ্রহ করে টেলিগ্রাম অ্যাপ থেকে খুলুন।</h1>";
        return;
    }

    telegramUser = tg.initDataUnsafe.user;

    // --- Init ---
    await fetchAdminSettings();
    await setupUserAndRealtime();
    setupEventListeners();
    createSvgWheel();

    // --- User + Realtime ---
    async function setupUserAndRealtime() {
        const userId = telegramUser.id.toString();
        const today = new Date().toISOString().slice(0, 10);

        // Realtime
        supabase.channel('user-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `id=eq.${userId}` }, payload => {
                userData = payload.new;
                updateUI();
            })
            .subscribe();

        let { data: user, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();

        if (!user) {
            const affiliateCodeFromStart = tg.initDataUnsafe.start_param || null;
            const newUser = {
                id: userId,
                username: telegramUser.username || '',
                full_name: `${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`.trim(),
                balance: 0,
                checkins_today: { date: today, count: 0 },
                spins_today: { date: today, count: 0 },
                completed_tasks: [],
                quiz_progress: { date: today, completedToday: 0, currentStep: 0 },
                referred_by: null,
                referrals: [],
                referral_earnings: 0,
                affiliate_code: await generateUniqueAffiliateCode(telegramUser.username || userId)
            };

            const { error: insertErr } = await supabase.from('users').insert(newUser);
            if (insertErr) return handleError("ইউজার তৈরি করতে সমস্যা", insertErr);

            userData = newUser;

            if (affiliateCodeFromStart && affiliateCodeFromStart !== newUser.affiliate_code) {
                await handleAffiliateSignup(affiliateCodeFromStart, userId);
            }
        } else {
            userData = user;
        }
        updateUI();
    }

    async function fetchAdminSettings() {
        const { data } = await supabase.from('app_settings').select('key,value');
        data.forEach(row => {
            if (row.key === 'appConfig') Object.assign(appConfig, row.value);
            if (row.key === 'spinConfig') spinConfig = row.value;
            if (row.key === 'quizConfig') Object.assign(quizConfig, row.value);
            if (row.key === 'paymentMethods') paymentMethods = (row.value.methods || []).filter(m => m.enabled);
        });
        updateWalletUI();
    }

    // --- Core Earnings + Affiliate ---
    async function awardEarnings(amount, additionalUpdates = {}) {
        if (amount <= 0) {
            await supabase.from('users').update(additionalUpdates).eq('id', telegramUser.id.toString());
            return;
        }

        const userId = telegramUser.id.toString();
        const { data: user } = await supabase.from('users').select('balance,referred_by').eq('id', userId).single();

        await supabase.from('users').update({
            balance: user.balance + amount,
            ...additionalUpdates
        }).eq('id', userId);

        let commission = amount * appConfig.affiliateCommissionRate;
        let referrerId = user.referred_by;

        while (referrerId && commission >= 0.01) {
            const { data: ref } = await supabase.from('users').select('balance,referral_earnings,referred_by').eq('id', referrerId).single();
            if (!ref) break;

            await supabase.from('users').update({
                balance: ref.balance + commission,
                referral_earnings: ref.referral_earnings + commission
            }).eq('id', referrerId);

            commission *= appConfig.affiliateCommissionRate;
            referrerId = ref.referred_by;
        }
    }

    async function handleAffiliateSignup(affiliateCode, newUserId) {
        const { data: referrer } = await supabase.from('users').select('id,balance,referral_earnings,referrals').eq('affiliate_code', affiliateCode).single();
        if (!referrer) return;

        const bonus = appConfig.referralBonus || 0;
        await supabase.from('users').update({
            balance: referrer.balance + bonus,
            referral_earnings: referrer.referral_earnings + bonus,
            referrals: [...referrer.referrals, newUserId]
        }).eq('id', referrer.id);

        await supabase.from('users').update({ referred_by: referrer.id }).eq('id', newUserId);
    }

    async function generateUniqueAffiliateCode(base) {
        let code;
        do {
            code = (base || 'USER').slice(0, 8).toUpperCase() + Math.floor(Math.random() * 999).toString().padStart(3, '0');
            const { data } = await supabase.from('users').select('id').eq('affiliate_code', code).limit(1);
            if (!data || data.length === 0) break;
        } while (true);
        return code;
    }

    // --- UI Functions ---
    function updateUI() {
        const balance = userData.balance || 0;
        const formattedBalance = `৳ ${balance.toFixed(2)}`;
        headerElements.balance.innerText = formattedBalance;
        headerElements.fullName.innerText = userData.full_name || telegramUser.first_name;
        headerElements.username.innerText = userData.username ? `@${userData.username}` : `#${telegramUser.id}`;
        headerElements.pic.innerText = getInitials(userData.full_name || telegramUser.first_name);
        walletElements.balance.innerText = formattedBalance;
        walletElements.submitBtn.disabled = balance < MINIMUM_WITHDRAW_AMOUNT;
        walletElements.submitBtn.innerText = balance < MINIMUM_WITHDRAW_AMOUNT ? `ন্যূনতম ৳${MINIMUM_WITHDRAW_AMOUNT} প্রয়োজন` : "উইথড্র সাবমিট করুন";

        referElements.notice.textContent = `প্রতি রেফারে ৳${appConfig.referralBonus} + ${(appConfig.affiliateCommissionRate * 100).toFixed(0)}% কমিশন`;
        referElements.linkInput.value = `https://t.me/${BOT_USERNAME}?start=${userData.affiliate_code || telegramUser.id}`;
        referElements.count.textContent = userData.referrals?.length || 0;
        referElements.earnings.textContent = `৳ ${(userData.referral_earnings || 0).toFixed(2)}`;

        const spinsLeft = spinConfig.dailyLimit - (userData.spins_today?.count || 0);
        spinScreenElements.spinsLeft.innerText = spinsLeft > 0 ? spinsLeft : 0;

        if (document.getElementById('quiz-screen').classList.contains('active')) displayCurrentQuiz();
    }

    function updateWalletUI() {
        const container = walletElements.paymentContainer;
        container.innerHTML = paymentMethods.length === 0
            ? '<p>কোনো পেমেন্ট মেথড নেই</p>'
            : `
                <label for="paymentMethodSelect">পেমেন্ট মেথড:</label>
                <select id="paymentMethodSelect">${paymentMethods.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}</select>
                <label id="accountNumberLabel">নম্বর দিন:</label>
                <input type="text" id="accountNumberInput">
            `;

        const select = document.getElementById('paymentMethodSelect');
        if (select) {
            select.addEventListener('change', () => {
                const method = paymentMethods.find(m => m.id === select.value);
                document.getElementById('accountNumberLabel').textContent = `আপনার ${method.name} নম্বর দিন:`;
                document.getElementById('accountNumberInput').placeholder = method.placeholder || '';
            });
            select.dispatchEvent(new Event('change'));
        }
    }

    function setupEventListeners() {
        navButtons.forEach(btn => btn.addEventListener('click', e => {
            const screenId = e.currentTarget.dataset.screen;
            showScreen(screenId);
            if (screenId === 'task-screen') loadAndDisplayTasks();
        }));
        homeButtons.dailyCheckin.addEventListener('click', handleDailyCheckin);
        homeButtons.spin.addEventListener('click', () => showScreen('spin-screen'));
        homeButtons.quiz.addEventListener('click', startQuiz);
        spinScreenElements.backBtn.addEventListener('click', () => showScreen('home-screen'));
        quizScreenElements.backBtn.addEventListener('click', () => showScreen('home-screen'));
        spinScreenElements.triggerBtn.addEventListener('click', handleSpin);
        walletElements.submitBtn.addEventListener('click', handleSubmitWithdraw);
        referElements.shareBtn.addEventListener('click', handleShareReferral);
        taskListContainer.addEventListener('click', handleTaskClick);
        quizScreenElements.optionsContainer.addEventListener('click', handleOptionSelect);
        quizScreenElements.nextBtn.addEventListener('click', handleNextQuiz);
    }

    function showScreen(id) {
        screens.forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        navButtons.forEach(b => b.classList.toggle('active', b.dataset.screen === id));
    }

    function handleError(msg, err) {
        console.error(err);
        tg.showAlert(msg || "একটি সমস্যা হয়েছে");
    }

    function getInitials(name) {
        if (!name) return '';
        const parts = name.split(' ');
        return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
    }

    // --- Tasks ---
    async function loadAndDisplayTasks() {
        taskListContainer.innerHTML = '<p>লোড হচ্ছে...</p>';
        const { data: tasks } = await supabase.from('tasks').select('*').eq('is_active', true).order('created_at', { ascending: false });
        if (!tasks || tasks.length === 0) {
            taskListContainer.innerHTML = '<p>নতুন টাস্ক শীঘ্রই আসবে...</p>';
            return;
        }
        taskListContainer.innerHTML = '';
        tasks.forEach(task => {
            const isCompleted = userData.completed_tasks?.includes(task.id);
            const el = document.createElement('div');
            el.className = `task-item ${isCompleted ? 'completed' : ''}`;
            el.dataset.taskId = task.id;
            el.dataset.reward = task.reward;
            el.innerHTML = `<div class="task-item-header"><h3 class="task-title">${task.title}</h3><span class="task-reward">৳ ${task.reward.toFixed(2)}</span></div><p class="task-description">${task.description}</p>`;
            taskListContainer.appendChild(el);
        });
    }

    async function handleTaskClick(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem || taskItem.classList.contains('completed')) return tg.showAlert('ইতোমধ্যে সম্পন্ন');
        const taskId = taskItem.dataset.taskId;
        const reward = parseFloat(taskItem.dataset.reward);
        tg.HapticFeedback.impactOccurred('light');
        window.showGiga().then(async () => {
            await awardEarnings(reward, { completed_tasks: [...(userData.completed_tasks || []), taskId] });
            tg.showAlert(`অভিনন্দন! ৳${reward.toFixed(2)} পেয়েছেন`);
            taskItem.classList.add('completed');
        }).catch(() => handleError("বিজ্ঞাপন সমস্যা"));
    }

    // --- Quiz ---
    async function startQuiz() {
        const today = new Date().toISOString().slice(0, 10);
        let progress = userData.quiz_progress || { date: today, completedToday: 0, currentStep: 0 };
        if (progress.date !== today) progress = { date: today, completedToday: 0, currentStep: 0 };
        if (progress.completedToday >= quizConfig.dailyLimit) return tg.showAlert("আজকের কুইজ শেষ");
        progress.currentStep = 0;
        await supabase.from('users').update({ quiz_progress: progress }).eq('id', telegramUser.id.toString());
        userData.quiz_progress = progress;

        showScreen('quiz-screen');
        const { data: quizzes } = await supabase.from('quizzes').select('*');
        quizQuestions = quizzes.sort(() => 0.5 - Math.random());
        currentQuizIndex = 0;
        displayCurrentQuiz();
    }

    function displayCurrentQuiz() {
        const progress = userData.quiz_progress;
        quizScreenElements.progressText.textContent = `বাকি: ${quizConfig.dailyLimit - progress.completedToday}`;
        quizScreenElements.stepText.textContent = `ধাপ: ${progress.currentStep}/${quizConfig.clickTarget}`;
        quizScreenElements.progressInner.style.width = `${(progress.currentStep / quizConfig.clickTarget) * 100}%`;

        if (progress.currentStep >= quizConfig.clickTarget) return showScreen('home-screen');

        const quiz = quizQuestions[currentQuizIndex];
        quizScreenElements.questionText.textContent = quiz.question;
        quizScreenElements.optionsContainer.innerHTML = quiz.options.map(opt => `<div class="quiz-option">${opt}</div>`).join('');
        selectedQuizOption = null;
        quizScreenElements.nextBtn.disabled = true;

        quizScreenElements.instruction.textContent = progress.currentStep === quizConfig.clickTarget - 1
            ? 'শেষ ধাপ! বিজ্ঞাপনে ক্লিক করুন'
            : 'সঠিক উত্তর দিন';
        quizScreenElements.nextBtn.textContent = progress.currentStep === quizConfig.clickTarget - 1 ? 'Claim Reward' : 'পরবর্তী';
    }

    function handleOptionSelect(e) {
        const opt = e.target.closest('.quiz-option');
        if (!opt) return;
        document.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selectedQuizOption = opt;
        quizScreenElements.nextBtn.disabled = false;
    }

    async function handleNextQuiz() {
        if (!selectedQuizOption || selectedQuizOption.textContent !== quizQuestions[currentQuizIndex].correct_answer) {
            return tg.showAlert('ভুল উত্তর!');
        }

        const step = userData.quiz_progress.currentStep;
        const isLast = step === quizConfig.clickTarget - 1;

        window.showGiga().then(async () => {
            if (isLast) {
                adClicked = false;
                document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') adClicked = true; }, { once: true });
                setTimeout(async () => {
                    if (adClicked) {
                        await awardEarnings(quizConfig.reward, {
                            'quiz_progress.completedToday': userData.quiz_progress.completedToday + 1,
                            'quiz_progress.currentStep': 0
                        });
                        tg.showAlert(`কুইজ পুরস্কার ৳${quizConfig.reward}`);
                        showScreen('home-screen');
                    } else {
                        tg.showAlert("বিজ্ঞাপনে ক্লিক করতে হবে");
                    }
                }, 3000);
            } else {
                await supabase.from('users').update({ 'quiz_progress.currentStep': step + 1 }).eq('id', telegramUser.id.toString());
                currentQuizIndex++;
                displayCurrentQuiz();
            }
        });
    }

    // --- Spin ---
    function handleSpin() {
        if (isSpinning) return;
        const spinsLeft = spinConfig.dailyLimit - (userData.spins_today?.count || 0);
        if (spinsLeft <= 0) return tg.showAlert("আজকের স্পিন শেষ");

        isSpinning = true;
        spinScreenElements.triggerBtn.disabled = true;

        const numSegments = spinConfig.rewards.length;
        const targetSegment = Math.floor(Math.random() * numSegments);
        const segmentAngle = 360 / numSegments;
        const randomInSegment = Math.random() * segmentAngle;
        const targetRotation = (targetSegment * segmentAngle) + randomInSegment + (360 * 5);

        spinScreenElements.wheelGroup.style.transform = `rotate(${targetRotation}deg)`;
        currentRotation = targetRotation % 360;

        setTimeout(() => spinFinished(targetSegment), 5000);
    }

    async function spinFinished(segment) {
        window.showGiga().then(async () => {
            const reward = spinConfig.rewards[segment];
            const today = new Date().toISOString().slice(0, 10);
            await awardEarnings(reward, {
                'spins_today.date': today,
                'spins_today.count': (userData.spins_today?.count || 0) + 1
            });
            tg.showAlert(`স্পিন থেকে ৳${reward.toFixed(2)} পেয়েছেন`);
        }).finally(() => {
            isSpinning = false;
            spinScreenElements.triggerBtn.disabled = false;
            spinScreenElements.wheelGroup.style.transition = 'none';
            spinScreenElements.wheelGroup.style.transform = `rotate(${currentRotation}deg)`;
            setTimeout(() => spinScreenElements.wheelGroup.style.transition = 'transform 5s cubic-bezier(0.25, 0.1, 0.25, 1)', 50);
        });
    }

    // --- Daily Checkin ---
    async function handleDailyCheckin() {
        const today = new Date().toISOString().slice(0, 10);
        let count = userData.checkins_today?.date === today ? userData.checkins_today.count : 0;
        if (count >= appConfig.dailyCheckinLimit) return tg.showAlert("আজকের চেকইন শেষ");

        this.disabled = true;
        window.showGiga().then(async () => {
            await awardEarnings(appConfig.dailyReward, {
                'checkins_today.date': today,
                'checkins_today.count': count + 1,
                last_checkin: today
            });
            tg.showAlert(`Daily Check বোনাস ৳${appConfig.dailyReward.toFixed(2)}`);
        }).finally(() => this.disabled = false);
    }

    // --- Withdraw ---
    async function handleSubmitWithdraw() {
        const select = document.getElementById('paymentMethodSelect');
        const input = document.getElementById('accountNumberInput');
        if (!select || !input) return handleError("ফর্ম লোড হয়নি");

        const method = paymentMethods.find(m => m.id === select.value);
        const number = input.value.trim();
        if (userData.balance < MINIMUM_WITHDRAW_AMOUNT) return tg.showAlert("পর্যাপ্ত ব্যালেন্স নেই");

        this.disabled = true;
        await supabase.from('withdrawals').insert({
            user_id: telegramUser.id.toString(),
            username: telegramUser.username || '',
            amount: userData.balance,
            method_id: method.id,
            method_name: method.name,
            account_number: number
        });
        await supabase.from('users').update({ balance: 0 }).eq('id', telegramUser.id.toString());
        tg.showAlert("উইথড্র অনুরোধ জমা হয়েছে");
        showScreen('home-screen');
        input.value = '';
        this.disabled = false;
    }

    function handleShareReferral() {
        const link = referElements.linkInput.value;
        const text = `প্রতিদিন আয় করুন! আমার লিংক: ${link}`;
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
    }

    // --- Wheel SVG ---
    function createSvgWheel() {
        const wheelGroup = spinScreenElements.wheelGroup;
        wheelGroup.innerHTML = '';
        const numSegments = spinConfig.rewards.length;
        const angle = 360 / numSegments;
        const colors = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#d81b60', '#00acc1', '#fb8c00', '#5e35b1', '#6d4c41'].slice(0, numSegments);

        const polarToCartesian = (cx, cy, r, deg) => {
            const rad = (deg - 90) * Math.PI / 180;
            return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
        };

        for (let i = 0; i < numSegments; i++) {
            const start = polarToCartesian(250, 250, 210, i * angle + angle);
            const end = polarToCartesian(250, 250, 210, i * angle);
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", `M250,250 L${start.x},${start.y} A210,210 0 0,0 ${end.x},${end.y} Z`);
            path.setAttribute("fill", colors[i]);
            path.setAttribute("stroke", "#8d6e63");
            path.setAttribute("stroke-width", "4");
            wheelGroup.appendChild(path);

            const textAngle = i * angle + angle / 2;
            const textPos = polarToCartesian(250, 250, 150, textAngle);
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", textPos.x);
            text.setAttribute("y", textPos.y);
            text.setAttribute("fill", "white");
            text.setAttribute("font-size", "20");
            text.setAttribute("font-weight", "bold");
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("dominant-baseline", "middle");
            text.setAttribute("transform", `rotate(${textAngle + 90}, ${textPos.x}, ${textPos.y})`);
            text.textContent = `৳${spinConfig.rewards[i].toFixed(1)}`;
            wheelGroup.appendChild(text);
        }
    }
});
