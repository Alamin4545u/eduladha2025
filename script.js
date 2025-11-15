// SUPABASE VERSION (FINAL, COMPLETE, AND FULLY CORRECTED)
document.addEventListener('DOMContentLoaded', function() {
    // --- Supabase Setup ---
    const supabaseUrl = "https://fwikhcittcaadwziitdv.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aWtoY2l0dGNhYWR3emlpdGR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMzY0MjIsImV4cCI6MjA3ODcxMjQyMn0.wLBcy29HNFPZ5dRzJ11CaIjD_zQvBi3vNLE66HlI2es";
    
    // সমাধান: Supabase ক্লায়েন্ট সঠিকভাবে ইনিশিয়ালাইজ করা হয়েছে।
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

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

    // --- Main Logic ---
    tg.ready();
    tg.expand();

    // সমাধান: Firebase-এর signInAnonymously() ফাংশনটি সম্পূর্ণরূপে সরানো হয়েছে।
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        telegramUser = tg.initDataUnsafe.user;
        initializeApp();
    } else {
        document.body.innerHTML = "<h1>অনুগ্রহ করে টেলিগ্রাম অ্যাপ থেকে খুলুন।</h1>";
    }

    async function initializeApp() {
        await fetchAdminSettings();
        await fetchUserData(); // This will also call updateUI()
        setupEventListeners();
        createSvgWheel();
        
        const userChannel = supabaseClient.channel(`public:users:telegram_id=eq.${telegramUser.id.toString()}`);
        userChannel
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'users', 
                filter: `telegram_id=eq.${telegramUser.id.toString()}` 
            }, payload => {
                userData = { ...userData, ...payload.new };
                updateUI();
            })
            .subscribe();
    }

    async function fetchUserData() {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('telegram_id', telegramUser.id.toString())
                .single();

            if (data) {
                userData = data;
            } else if (error && error.code === 'PGRST116') {
                const referrerCode = tg.initDataUnsafe.start_param;
                let referrerId = null;

                if(referrerCode) {
                    const { data: refUser } = await supabaseClient.from('users').select('telegram_id').eq('affiliate_code', referrerCode).single();
                    if(refUser) referrerId = refUser.telegram_id;
                }

                const newUser = {
                    telegram_id: telegramUser.id.toString(),
                    username: telegramUser.username || '',
                    full_name: `${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`.trim(),
                    affiliate_code: generateUniqueAffiliateCode(telegramUser.username || telegramUser.id.toString()),
                    referred_by: referrerId
                };

                const { data: createdUser, error: createError } = await supabaseClient.from('users').insert(newUser).select().single();
                if (createError) throw createError;
                
                userData = createdUser;
                if (referrerId && referrerId !== userData.telegram_id) {
                    await handleAffiliateSignup(referrerId, newUser.telegram_id);
                }
            } else {
                throw error;
            }
            updateUI();
        } catch (error) {
            handleError("ব্যবহারকারীর ডেটা লোড করতে ব্যর্থ হয়েছে।", error);
        }
    }

    async function fetchAdminSettings() {
        try {
            const { data, error } = await supabaseClient.from('settings').select('key, value');
            if (error) throw error;
            
            data.forEach(setting => {
                if (setting.key === 'appConfig') appConfig = { ...appConfig, ...setting.value };
                if (setting.key === 'spinConfig') spinConfig = { ...spinConfig, ...setting.value };
                if (setting.key === 'quizConfig') quizConfig = { ...quizConfig, ...setting.value };
                if (setting.key === 'paymentMethods') paymentMethods = setting.value.methods.filter(m => m.enabled);
            });
            updateWalletUI();
        } catch (error) {
            handleError("অ্যাপ সেটিংস লোড করা যায়নি।", error);
        }
    }

    function updateUI() {
        const balance = userData.balance || 0;
        const fullName = userData.full_name || telegramUser.first_name || 'New User';
        const username = userData.username || telegramUser.id;
        const formattedBalance = `৳ ${balance.toFixed(2)}`;
        headerElements.balance.innerText = formattedBalance;
        headerElements.fullName.innerText = fullName;
        headerElements.username.innerText = username ? `@${username}` : `#${telegramUser.id}`;
        headerElements.pic.innerText = getInitials(fullName);
        walletElements.balance.innerText = formattedBalance;
        walletElements.submitBtn.disabled = balance < MINIMUM_WITHDRAW_AMOUNT;
        walletElements.submitBtn.innerText = balance < MINIMUM_WITHDRAW_AMOUNT ? `ন্যূনতম ৳${MINIMUM_WITHDRAW_AMOUNT} প্রয়োজন` : "উইথড্র সাবমিট করুন";
        referElements.notice.textContent = `প্রতি সফল রেফারে আপনি পাবেন ৳${(appConfig.referralBonus || 0).toFixed(2)}! অ্যাফিলিয়েট কমিশন: ${(appConfig.affiliateCommissionRate * 100).toFixed(0)}%`;
        referElements.linkInput.value = `https://t.me/${BOT_USERNAME}?start=${userData.affiliate_code || ''}`;
        
        const today = new Date().toISOString().slice(0, 10);
        const spinsTodayCount = userData.spins_today?.date === today ? (userData.spins_today.count || 0) : 0;
        const spinsLeftCount = spinConfig.dailyLimit - spinsTodayCount;
        spinScreenElements.spinsLeft.innerText = spinsLeftCount > 0 ? spinsLeftCount : 0;

        if (referElements.count) referElements.count.textContent = userData.referrals ? userData.referrals.length : 0;
        if (referElements.earnings) referElements.earnings.textContent = `৳ ${(userData.referral_earnings || 0).toFixed(2)}`;
        
        if (document.getElementById('quiz-screen').classList.contains('active')) {
            displayCurrentQuiz();
        }
    }
    
    async function awardEarnings(amount, additionalUpdates = {}) {
        const { error } = await supabaseClient.rpc('award_earnings', {
            user_id: telegramUser.id.toString(),
            earn_amount: amount,
            additional_updates: additionalUpdates
        });

        if (error) {
            handleError("আর্নিং যোগ করতে সার্ভারে সমস্যা হয়েছে।", error);
            setTimeout(fetchUserData, 1500); // Re-sync with server on error
        }
    }
    
    async function handleAffiliateSignup(referrerId, newUserId) {
        const bonus = appConfig.referralBonus || 0;
        if(bonus <= 0) return;
        
        const { error } = await supabaseClient.rpc('award_earnings', {
            user_id: referrerId,
            earn_amount: bonus,
            additional_updates: { referrals: newUserId }
        });
        if(error) handleError("রেফারেল বোনাস যোগ করতে সমস্যা হয়েছে।", error);
    }
    
    async function handleSpin() {
        if (isSpinning) return;
        const today = new Date().toISOString().slice(0, 10);
        const spinsTodayCount = userData.spins_today?.date === today ? (userData.spins_today.count || 0) : 0;

        if (spinsTodayCount >= spinConfig.dailyLimit) {
            return tg.showAlert("আপনার আজকের জন্য আর কোনো স্পিন বাকি নেই।");
        }
        
        isSpinning = true;
        spinScreenElements.triggerBtn.disabled = true;
        
        const newCount = spinsTodayCount + 1;
        userData.spins_today = { date: today, count: newCount };
        updateUI();

        const numSegments = spinConfig.rewards.length;
        const targetSegment = Math.floor(Math.random() * numSegments);
        const segmentAngle = 360 / numSegments;
        const targetRotation = (targetSegment * segmentAngle) + (Math.random() * segmentAngle) + (360 * 5);

        spinScreenElements.wheelGroup.style.transform = `rotate(${targetRotation}deg)`;
        currentRotation = targetRotation % 360;
        setTimeout(() => spinFinished(targetSegment), 5000);
    }

    async function spinFinished(targetSegment) {
        tg.HapticFeedback.impactOccurred('light');
        try {
            await window.showGiga();
            tg.HapticFeedback.notificationOccurred('success');
            const reward = spinConfig.rewards[targetSegment];
            
            userData.balance = (userData.balance || 0) + reward;
            updateUI();

            await awardEarnings(reward, { spinsToday: userData.spins_today });
            tg.showAlert(`অভিনন্দন! স্পিন থেকে ৳ ${reward.toFixed(2)} পেয়েছেন।`);
        } catch(e) {
            handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে।", e);
            setTimeout(fetchUserData, 1000);
        } finally {
            isSpinning = false;
            spinScreenElements.triggerBtn.disabled = false;
        }
    }
    
    async function handleDailyCheckin() {
        const today = new Date().toISOString().slice(0, 10);
        const currentCheckins = userData.checkins_today?.date === today ? userData.checkins_today : { date: today, count: 0 };

        if (currentCheckins.count >= appConfig.dailyCheckinLimit) {
            return tg.showAlert("আপনি আজকের জন্য আপনার সব Daily Check সম্পন্ন করেছেন।");
        }
        this.disabled = true;
        tg.HapticFeedback.impactOccurred('light');
        try {
            await window.showGiga();
            tg.HapticFeedback.notificationOccurred('success');
            
            const updates = {
                checkinsToday: { date: today, count: currentCheckins.count + 1 },
                lastCheckin: today
            };
            
            userData.balance = (userData.balance || 0) + appConfig.dailyReward;
            userData.checkins_today = updates.checkinsToday;
            userData.last_checkin = updates.lastCheckin;
            updateUI();
            
            await awardEarnings(appConfig.dailyReward, updates);
            tg.showAlert(`অভিনন্দন! Daily Check বোনাস হিসেবে ৳ ${appConfig.dailyReward.toFixed(2)} পেয়েছেন।`);
        } catch(e) {
            handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে।", e);
            setTimeout(fetchUserData, 1000);
        } finally {
            this.disabled = false;
        }
    }
    
    async function handleSubmitWithdraw() {
        const methodSelect = document.getElementById('paymentMethodSelect');
        const accountNumberInput = document.getElementById('accountNumberInput');
        if (!methodSelect || !accountNumberInput) return handleError("পেমেন্ট ফর্ম সঠিকভাবে লোড হয়নি।");
        
        const selectedMethod = paymentMethods.find(m => m.id === methodSelect.value);
        const accountNumber = accountNumberInput.value.trim();

        if (!selectedMethod || accountNumber.length < (selectedMethod.minLength || 1) || userData.balance < MINIMUM_WITHDRAW_AMOUNT) {
             return tg.showAlert(`অনুগ্রহ করে সঠিক তথ্য দিন এবং নিশ্চিত করুন আপনার ব্যালেন্স ৳${MINIMUM_WITHDRAW_AMOUNT} এর বেশি।`);
        }
        
        this.disabled = true;
        const currentBalance = userData.balance;
        
        userData.balance = 0;
        updateUI();
        
        const { error } = await supabaseClient.from('withdrawals').insert({
            user_id: telegramUser.id.toString(),
            username: telegramUser.username || '',
            amount: currentBalance,
            method_id: selectedMethod.id,
            method_name: selectedMethod.name,
            account_number: accountNumber
        });

        if (error) {
            userData.balance = currentBalance;
            updateUI();
            this.disabled = false;
            return handleError("উইথড্র অনুরোধে সমস্যা হয়েছে।", error);
        }
        
        const { error: updateError } = await supabaseClient.from('users').update({ balance: 0 }).eq('telegram_id', telegramUser.id.toString());
        if(updateError) {
             userData.balance = currentBalance;
             updateUI();
             handleError("ব্যালেন্স আপডেট করতে সমস্যা হয়েছে।", updateError);
        } else {
            tg.showAlert("আপনার উইথড্র অনুরোধ সফলভাবে জমা হয়েছে।");
            showScreen('home-screen');
            accountNumberInput.value = '';
        }
        this.disabled = false;
    }
    
    async function loadAndDisplayTasks() {
        taskListContainer.innerHTML = '<p>টাস্ক লোড হচ্ছে...</p>';
        const { data, error } = await supabaseClient.from('tasks').select('*').eq('is_active', true).order('created_at', { ascending: false });

        if (error) return handleError('টাস্ক লোড করতে সমস্যা হয়েছে।', error);
        if (data.length === 0) return taskListContainer.innerHTML = '<p>নতুন টাস্ক শীঘ্রই আসছে...</p>';
        
        taskListContainer.innerHTML = '';
        data.forEach(task => {
            const isCompleted = userData.completed_tasks && userData.completed_tasks.includes(task.id);
            const taskElement = document.createElement('div');
            taskElement.className = `task-item ${isCompleted ? 'completed' : ''}`;
            taskElement.dataset.taskId = task.id;
            taskElement.dataset.reward = task.reward;
            taskElement.innerHTML = `<div class="task-item-header"><h3 class="task-title">${task.title}</h3><span class="task-reward">৳ ${task.reward.toFixed(2)}</span></div><p class="task-description">${task.description}</p>`;
            taskListContainer.appendChild(taskElement);
        });
    }

    async function handleTaskClick(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem || taskItem.classList.contains('completed')) {
            if (taskItem) tg.showAlert('আপনি এই টাস্কটি ইতোমধ্যে সম্পন্ন করেছেন।');
            return;
        }
        const taskId = taskItem.dataset.taskId;
        const reward = parseFloat(taskItem.dataset.reward);
        tg.HapticFeedback.impactOccurred('light');

        try {
            await window.showGiga();
            tg.HapticFeedback.notificationOccurred('success');
            
            userData.balance = (userData.balance || 0) + reward;
            userData.completed_tasks = [...(userData.completed_tasks || []), taskId];
            updateUI();
            taskItem.classList.add('completed');

            await awardEarnings(reward, { completedTasks: taskId });
            tg.showAlert(`অভিনন্দন! টাস্ক সম্পন্ন করে ৳ ${reward.toFixed(2)} পেয়েছেন।`);
        } catch(err) {
            handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে।", err);
            setTimeout(fetchUserData, 1000);
        }
    }
    
    function handleError(message, error) { if (error) console.error("Error:", error.message || JSON.stringify(error)); tg.showAlert(typeof message === 'string' ? message : "একটি অপ্রত্যাশিত সমস্যা হয়েছে।"); }
    function setupEventListeners() { navButtons.forEach(btn => btn.addEventListener('click', (e) => { const screenId = e.currentTarget.dataset.screen; showScreen(screenId); if (screenId === 'task-screen') { loadAndDisplayTasks(); } else if (screenId === 'refer-screen') { updateUI(); } })); homeButtons.dailyCheckin.addEventListener('click', handleDailyCheckin); homeButtons.spin.addEventListener('click', () => showScreen('spin-screen')); homeButtons.quiz.addEventListener('click', startQuiz); spinScreenElements.backBtn.addEventListener('click', () => showScreen('home-screen')); quizScreenElements.backBtn.addEventListener('click', () => showScreen('home-screen')); spinScreenElements.triggerBtn.addEventListener('click', handleSpin); walletElements.submitBtn.addEventListener('click', handleSubmitWithdraw); referElements.shareBtn.addEventListener('click', handleShareReferral); taskListContainer.addEventListener('click', handleTaskClick); quizScreenElements.optionsContainer.addEventListener('click', handleOptionSelect); quizScreenElements.nextBtn.addEventListener('click', handleNextQuiz); }
    function showScreen(screenId) { screens.forEach(s => s.classList.remove('active')); document.getElementById(screenId).classList.add('active'); navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.screen === screenId)); }
    function handleShareReferral() { const link = referElements.linkInput.value; const text = `এখানে প্রতিদিন আয় করুন! আমার অ্যাফিলিয়েট লিংক দিয়ে জয়েন করুন: ${link}`; tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`); }
    function getInitials(fullName) { if (!fullName) return ''; const names = fullName.split(' '); return `${names[0]?.[0] || ''}${names.length > 1 ? names[names.length - 1][0] : ''}`.toUpperCase(); }
    function createSvgWheel() { const wheelGroup = spinScreenElements.wheelGroup; if (!wheelGroup) return; wheelGroup.innerHTML = ''; const numSegments = spinConfig.rewards.length; const angle = 360 / numSegments; const colors = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#d81b60', '#00acc1', '#fb8c00', '#5e35b1', '#6d4c41'].slice(0, numSegments); const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => { const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0; return { x: centerX + (radius * Math.cos(angleInRadians)), y: centerY + (radius * Math.sin(angleInRadians)) }; }; for (let i = 0; i < numSegments; i++) { const startAngle = i * angle; const endAngle = startAngle + angle; const start = polarToCartesian(250, 250, 210, endAngle); const end = polarToCartesian(250, 250, 210, startAngle); const pathData = `M 250 250 L ${start.x} ${start.y} A 210 210 0 0 0 ${end.x} ${end.y} z`; const path = document.createElementNS("http://www.w3.org/2000/svg", "path"); path.setAttribute("d", pathData); path.setAttribute("fill", colors[i]); path.setAttribute("stroke", "#8d6e63"); path.setAttribute("stroke-width", "4"); wheelGroup.appendChild(path); const textAngle = startAngle + (angle / 2); const textPos = polarToCartesian(250, 250, 150, textAngle); const text = document.createElementNS("http://www.w3.org/2000/svg", "text"); text.setAttribute("x", textPos.x); text.setAttribute("y", textPos.y); text.setAttribute("fill", "white"); text.setAttribute("font-size", "20"); text.setAttribute("font-weight", "bold"); text.setAttribute("text-anchor", "middle"); text.setAttribute("dominant-baseline", "middle"); text.setAttribute("transform", `rotate(${textAngle + 90}, ${textPos.x}, ${textPos.y})`); text.textContent = `৳${spinConfig.rewards[i].toFixed(1)}`; wheelGroup.appendChild(text); } }
    function generateUniqueAffiliateCode(base) { return (base || 'USER').slice(0, 8).toUpperCase() + Math.floor(Math.random() * 1000).toString().padStart(3, '0'); }
    function displayCurrentQuiz() { const today = new Date().toISOString().slice(0, 10); let completedToday = 0; let currentStep = 0; if(userData.quiz_progress?.date === today) { completedToday = userData.quiz_progress.completedToday || 0; currentStep = userData.quiz_progress.currentStep || 0; } const remaining = quizConfig.dailyLimit - completedToday; quizScreenElements.progressText.textContent = `দৈনিক কুইজ সেশন বাকি আছে: ${remaining}`; const clickTarget = quizConfig.clickTarget; quizScreenElements.stepText.textContent = `ধাপ: ${currentStep}/${clickTarget}`; quizScreenElements.progressInner.style.width = `${(currentStep / clickTarget) * 100}%`; if (currentStep >= clickTarget) return showScreen('home-screen'); if (currentQuizIndex >= quizQuestions.length) currentQuizIndex = 0; const quiz = quizQuestions[currentQuizIndex]; quizScreenElements.questionText.textContent = quiz.question; quizScreenElements.optionsContainer.innerHTML = ''; quiz.options.forEach(optionText => { const optionDiv = document.createElement('div'); optionDiv.className = 'quiz-option'; optionDiv.textContent = optionText; quizScreenElements.optionsContainer.appendChild(optionDiv); }); selectedQuizOption = null; quizScreenElements.nextBtn.disabled = true; if (currentStep === clickTarget - 1) { quizScreenElements.instruction.textContent = 'এটি শেষ ধাপ! পুরস্কার জিততে বিজ্ঞাপনে ক্লিক করুন।'; quizScreenElements.nextBtn.textContent = 'Claim Reward'; } else { quizScreenElements.instruction.textContent = 'সঠিক উত্তর দিয়ে পরবর্তী ধাপে যান'; quizScreenElements.nextBtn.textContent = 'পরবর্তী কুইজ'; } }
    function handleOptionSelect(e) { const option = e.target.closest('.quiz-option'); if (!option) return; document.querySelectorAll('.quiz-option').forEach(opt => opt.classList.remove('selected')); option.classList.add('selected'); selectedQuizOption = option; quizScreenElements.nextBtn.disabled = false; }
    function updateWalletUI() { const container = walletElements.paymentContainer; container.innerHTML = ''; if (paymentMethods.length === 0) { container.innerHTML = '<p>কোনো পেমেন্ট পদ্ধতি উপলব্ধ নেই।</p>'; return; } const selectLabel = document.createElement('label'); selectLabel.setAttribute('for', 'paymentMethodSelect'); selectLabel.textContent = 'পেমেন্ট পদ্ধতি নির্বাচন করুন:'; container.appendChild(selectLabel); const select = document.createElement('select'); select.id = 'paymentMethodSelect'; paymentMethods.forEach(method => { const option = document.createElement('option'); option.value = method.id; option.textContent = method.name; select.appendChild(option); }); container.appendChild(select); const inputLabel = document.createElement('label'); inputLabel.setAttribute('for', 'accountNumberInput'); inputLabel.id = 'accountNumberLabel'; container.appendChild(inputLabel); const input = document.createElement('input'); input.type = 'text'; input.id = 'accountNumberInput'; container.appendChild(input); const updateInputForMethod = () => { const selectedMethod = paymentMethods.find(m => m.id === select.value); if (selectedMethod) { inputLabel.textContent = `আপনার ${selectedMethod.name} নম্বর দিন:`; input.placeholder = selectedMethod.placeholder || ''; input.inputMode = selectedMethod.inputMode || 'text'; } }; select.addEventListener('change', updateInputForMethod); updateInputForMethod(); }
    async function startQuiz() { const today = new Date().toISOString().slice(0, 10); let currentQuizProgress = userData.quiz_progress || {}; if (currentQuizProgress.date !== today) { currentQuizProgress = { date: today, completedToday: 0, currentStep: 0 }; } if (currentQuizProgress.completedToday >= quizConfig.dailyLimit) { return tg.showAlert(`আপনি আজকের জন্য আপনার সব কুইজ সম্পন্ন করেছেন।`); } currentQuizProgress.currentStep = 0; userData.quiz_progress = currentQuizProgress; updateUI(); const { error } = await supabaseClient.from('users').update({ quiz_progress: currentQuizProgress }).eq('telegram_id', telegramUser.id.toString()); if(error) return handleError('কুইজ শুরু করতে সমস্যা হয়েছে।', error); showScreen('quiz-screen'); quizScreenElements.questionText.textContent = 'প্রশ্ন লোড হচ্ছে...'; const { data, error: quizError } = await supabaseClient.from('quizzes').select('*'); if(quizError || data.length === 0) return handleError('কোনো কুইজ পাওয়া যায়নি।', quizError); quizQuestions = data.sort(() => 0.5 - Math.random()); currentQuizIndex = 0; displayCurrentQuiz(); }
    async function handleNextQuiz() { if (!selectedQuizOption || selectedQuizOption.textContent !== quizQuestions[currentQuizIndex].correct_answer) { return tg.showAlert('ভুল উত্তর! অনুগ্রহ করে সঠিক উত্তরটি নির্বাচন করুন।'); } quizScreenElements.nextBtn.disabled = true; const today = new Date().toISOString().slice(0, 10); const currentProgress = userData.quiz_progress?.date === today ? userData.quiz_progress : { date: today, completedToday: 0, currentStep: 0 }; const isClickTask = currentProgress.currentStep === quizConfig.clickTarget - 1; tg.HapticFeedback.impactOccurred('light'); try { await window.showGiga(); if (isClickTask) { setTimeout(async () => { tg.HapticFeedback.notificationOccurred('success'); const updates = { quizProgress: { date: today, completedToday: currentProgress.completedToday + 1, currentStep: 0 } }; userData.balance = (userData.balance || 0) + quizConfig.reward; userData.quiz_progress = updates.quizProgress; updateUI(); await awardEarnings(quizConfig.reward, updates); tg.showAlert(`অভিনন্দন! কুইজ সম্পন্ন করে ৳ ${quizConfig.reward.toFixed(2)} পেয়েছেন।`); showScreen('home-screen'); }, 1500); } else { tg.HapticFeedback.notificationOccurred('success'); const newProgress = { ...currentProgress, currentStep: currentProgress.currentStep + 1 }; userData.quiz_progress = newProgress; updateUI(); await supabaseClient.from('users').update({ quiz_progress: newProgress }).eq('telegram_id', telegramUser.id.toString()); currentQuizIndex++; displayCurrentQuiz(); quizScreenElements.nextBtn.disabled = false; } } catch(e) { handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে।", e); quizScreenElements.nextBtn.disabled = false; } }
});
