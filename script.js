document.addEventListener('DOMContentLoaded', function() {
    // --- Supabase Setup ---
    const supabaseUrl = "https://fwikhcittcaadwziitdv.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aWtoY2l0dGNhYWR3emlpdGR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMzY0MjIsImV4cCI6MjA3ODcxMjQyMn0.wLBcy29HNFPZ5dRzJ11CaIjD_zQvBi3vNLE66HlI2es";
    const { createClient } = supabase;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    const sb = supabaseClient; // Alias for simplicity
    const tg = window.Telegram.WebApp;

    // --- GU-RU-TW-PO-OR-N-NO- ---
    // এই ফাংশনটি আপনার index.html ফাইলে অবশ্যই থাকতে হবে।
    // এটি ছাড়া কোনো টাস্ক, স্পিন বা চেক-ইন কাজ করবে না।
    // window.showGiga = function() {
    //     return new Promise((resolve, reject) => {
    //         // আপনার বিজ্ঞাপনের কোড এখানে...
    //         console.log("Ad function called");
    //         // উদাহরণ: ৫ সেকেন্ড পর সফলভাবে সমাধান করুন
    //         setTimeout(() => {
    //             resolve();
    //         }, 1500);
    //     });
    // };

    // --- Constants & Global Variables ---
    const BOT_USERNAME = "Bkash_earn_free_TkBot";
    const MINIMUM_WITHDRAW_AMOUNT = 10;
    let appConfig = { dailyReward: 1, dailyCheckinLimit: 1, referralBonus: 5, affiliateCommissionRate: 0.1 };
    let spinConfig = { dailyLimit: 5, rewards: [0.5, 1, 2, 0.5, 1.5, 1, 0.5, 2, 1, 1.5] };
    let quizConfig = { dailyLimit: 3, reward: 2, clickTarget: 3 };
    let paymentMethods = [];
    let telegramUser, userData = {};
    let supabaseUid = null;
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
    function main() {
        if (!tg) {
            document.body.innerHTML = "<h1>ত্রুটি: টেলিগ্রাম অবজেক্ট পাওয়া যায়নি।</h1>";
            return;
        }
        
        tg.ready();
        tg.expand();

        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            telegramUser = tg.initDataUnsafe.user;
            sb.auth.signInAnonymously()
                .then(({ data, error }) => {
                    if (error) {
                        handleError("ব্যবহারকারী যাচাইকরণে সমস্যা হয়েছে। অনুগ্রহ করে অ্যাপটি রিস্টার্ট করুন।", error);
                        return;
                    }
                    if (data && data.user) {
                        supabaseUid = data.user.id;
                        initializeApp();
                    } else {
                        handleError("Supabase থেকে ব্যবহারকারীর ডেটা পাওয়া যায়নি।");
                    }
                });
        } else {
            document.body.innerHTML = "<h1>অনুগ্রহ করে টেলিগ্রাম অ্যাপ থেকে খুলুন।</h1>";
        }
    }

    async function initializeApp() {
        try {
            await fetchAdminSettings();
            setupEventListeners();
            createSvgWheel();
            await fetchUserData();
            setupSubscription();
        } catch (error) {
            handleError("অ্যাপ চালু করতে সমস্যা হয়েছে।", error);
        }
    }

    async function fetchUserData() {
        const today = new Date().toISOString().slice(0, 10);
        const userId = telegramUser.id.toString();

        try {
            const { data: user, error: fetchError } = await sb.from('users').select('*').eq('id', userId).single();

            if (fetchError && fetchError.message !== 'JSON object requested, multiple (or no) rows returned') {
                throw fetchError;
            }

            if (user) {
                // ব্যবহারকারী থাকলে, তার ডেটা আপডেট করুন (যদি প্রয়োজন হয়)
                userData = {
                    ...user,
                    checkinsToday: user.checkinsToday?.date === today ? user.checkinsToday : { date: today, count: 0 },
                    spinsToday: user.spinsToday?.date === today ? user.spinsToday : { date: today, count: 0 },
                    quizProgress: user.quizProgress?.date === today ? user.quizProgress : { date: today, completedToday: 0, currentStep: 0 },
                    referrals: user.referrals ?? [],
                    completedTasks: user.completedTasks ?? []
                };
            } else {
                // নতুন ব্যবহারকারী তৈরি করুন
                const referrerId = tg.initDataUnsafe.start_param;
                const newUser = {
                    id: userId,
                    telegramId: userId,
                    username: telegramUser.username || '',
                    fullName: `${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`.trim(),
                    balance: 0,
                    lastCheckin: null, // এটি আর ব্যবহার না হলেও রাখা হলো
                    checkinsToday: { date: today, count: 0 },
                    spinsToday: { date: today, count: 0 },
                    completedTasks: [],
                    quizProgress: { date: today, completedToday: 0, currentStep: 0 },
                    referredBy: referrerId || null,
                    referrals: [],
                    referralEarnings: 0,
                    affiliateCode: generateUniqueAffiliateCode(telegramUser.username || telegramUser.id.toString()),
                    createdAt: new Date().toISOString(),
                    uid: supabaseUid
                };
                const { error: insertError } = await sb.from('users').insert(newUser);
                if (insertError) {
                    throw insertError;
                }
                userData = newUser;
                if (referrerId && referrerId !== newUser.affiliateCode) {
                    await handleAffiliateSignup(referrerId, newUser.id);
                }
            }
            updateUI();
        } catch (error) {
            console.error("Supabase fetch/insert error:", error);
            handleError("ব্যবহারকারীর ডেটা লোড করতে ব্যর্থ হয়েছে। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।");
        }
    }

    function setupSubscription() {
        const userId = telegramUser.id.toString();
        try {
            sb.channel('user-updates')
              .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'users',
                    filter: `id=eq.${userId}`
                }, payload => {
                    // নতুন ডেটা দিয়ে লোকাল 'userData' আপডেট করুন
                    userData = {
                        ...userData, // পুরানো ডেটা রাখুন
                        ...payload.new // নতুন ডেটা দিয়ে ওভাররাইট করুন
                    };
                    updateUI();
                })
              .subscribe((status, err) => {
                    if (err) console.error("Subscription error:", err);
                    // console.log("Subscription status:", status);
                });
        } catch (error) {
            console.error("Subscription setup failed:", error);
        }
    }

    async function fetchAdminSettings() {
        try {
            const { data: settings, error } = await sb.from('settings').select('*');
            if (error) throw error;

            const getSetting = (id, defaultConfig) => {
                const doc = settings.find(s => s.id === id);
                return doc ? { ...defaultConfig, ...(doc.config || {}) } : defaultConfig;
            };

            appConfig = getSetting('appConfig', appConfig);
            spinConfig = getSetting('spinConfig', spinConfig);
            quizConfig = getSetting('quizConfig', { ...quizConfig, clickTarget: quizConfig.clickTarget || 3 }); // Ensure clickTarget has default

            const paymentMethodsDoc = settings.find(s => s.id === 'paymentMethods');
            if (paymentMethodsDoc && paymentMethodsDoc.config?.methods) {
                paymentMethods = paymentMethodsDoc.config.methods.filter(method => method.enabled);
            }

            updateWalletUI();
        } catch (error) {
            handleError("অ্যাপ সেটিংস লোড করা যায়নি।", error);
        }
    }

    function updateUI() {
        if (!userData) return; // ডেটা লোড না হলে UI আপডেট করা থেকে বিরত থাকুন

        const balance = userData.balance ?? 0;
        const fullName = userData.fullName || telegramUser.first_name || 'ব্যবহারকারী';
        const username = userData.username || telegramUser.id;
        const formattedBalance = `৳ ${balance.toFixed(2)}`;

        headerElements.balance.innerText = formattedBalance;
        headerElements.fullName.innerText = fullName;
        headerElements.username.innerText = username ? `@${username}` : `#${telegramUser.id}`;
        headerElements.pic.innerText = getInitials(fullName);

        walletElements.balance.innerText = formattedBalance;
        const canWithdraw = balance >= MINIMUM_WITHDRAW_AMOUNT;
        walletElements.submitBtn.disabled = !canWithdraw;
        walletElements.submitBtn.innerText = canWithdraw ? "উইথড্র সাবমিট করুন" : `ন্যূনতম ৳${MINIMUM_WITHDRAW_AMOUNT} প্রয়োজন`;

        referElements.notice.textContent = `প্রতি সফল রেফারে আপনি পাবেন ৳${(appConfig.referralBonus ?? 0).toFixed(2)}! অ্যাফিলিয়েট কমিশন: ${((appConfig.affiliateCommissionRate ?? 0) * 100).toFixed(0)}%`;
        referElements.linkInput.value = `https://t.me/${BOT_USERNAME}?start=${userData.affiliateCode || telegramUser.id}`;
        
        const today = new Date().toISOString().slice(0, 10);
        const spinsTodayCount = userData.spinsToday?.date === today ? (userData.spinsToday?.count ?? 0) : 0;
        const spinsLeftCount = spinConfig.dailyLimit - spinsTodayCount;
        spinScreenElements.spinsLeft.innerText = spinsLeftCount > 0 ? spinsLeftCount : 0;

        if (referElements.count) {
            referElements.count.textContent = userData.referrals?.length ?? 0;
        }
        if (referElements.earnings) {
            referElements.earnings.textContent = `৳ ${(userData.referralEarnings ?? 0).toFixed(2)}`;
        }

        if (document.getElementById('quiz-screen').classList.contains('active')) {
            displayCurrentQuiz();
        }
    }

    function updateWalletUI() {
        const container = walletElements.paymentContainer;
        container.innerHTML = '';
        if (paymentMethods.length === 0) {
            container.innerHTML = '<p>কোনো পেমেন্ট পদ্ধতি উপলব্ধ নেই।</p>';
            return;
        }

        container.innerHTML = `
            <label for="paymentMethodSelect">পেমেন্ট পদ্ধতি নির্বাচন করুন:</label>
            <select id="paymentMethodSelect">
                ${paymentMethods.map(method => `<option value="${method.id}">${method.name}</option>`).join('')}
            </select>
            <label for="accountNumberInput" id="accountNumberLabel"></label>
            <input type="text" id="accountNumberInput">
        `;

        const select = document.getElementById('paymentMethodSelect');
        const input = document.getElementById('accountNumberInput');
        const label = document.getElementById('accountNumberLabel');

        const updateInputForMethod = () => {
            const selectedMethod = paymentMethods.find(m => m.id === select.value);
            if (selectedMethod) {
                label.textContent = `আপনার ${selectedMethod.name} নম্বর দিন:`;
                input.placeholder = selectedMethod.placeholder || '';
                input.inputMode = selectedMethod.inputMode || 'text';
            }
        };
        select.addEventListener('change', updateInputForMethod);
        updateInputForMethod();
    }

    function setupEventListeners() {
        navButtons.forEach(btn => btn.addEventListener('click', (e) => {
            const screenId = e.currentTarget.dataset.screen;
            showScreen(screenId);
            if (screenId === 'task-screen') {
                loadAndDisplayTasks();
            } else if (screenId === 'refer-screen') {
                updateUI(); // Referral screen খোলার সময় UI আপডেট করুন
            }
        }));

        homeButtons.dailyCheckin.addEventListener('click', () => handleDailyCheckin(homeButtons.dailyCheckin));
        homeButtons.spin.addEventListener('click', () => showScreen('spin-screen'));
        homeButtons.quiz.addEventListener('click', startQuiz);

        spinScreenElements.backBtn.addEventListener('click', () => showScreen('home-screen'));
        quizScreenElements.backBtn.addEventListener('click', () => showScreen('home-screen'));
        spinScreenElements.triggerBtn.addEventListener('click', handleSpin);

        walletElements.submitBtn.addEventListener('click', () => handleSubmitWithdraw(walletElements.submitBtn));
        referElements.shareBtn.addEventListener('click', handleShareReferral);

        taskListContainer.addEventListener('click', handleTaskClick);
        quizScreenElements.optionsContainer.addEventListener('click', handleOptionSelect);
        quizScreenElements.nextBtn.addEventListener('click', handleNextQuiz);
    }

    function showScreen(screenId) {
        screens.forEach(s => s.classList.remove('active'));
        const activeScreen = document.getElementById(screenId);
        if (activeScreen) {
            activeScreen.classList.add('active');
        }
        navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.screen === screenId));
    }

    async function loadAndDisplayTasks() {
        taskListContainer.innerHTML = '<p>টাস্ক লোড হচ্ছে...</p>';
        try {
            const { data: tasks, error } = await sb.from('tasks').select('*').eq('isActive', true).order('createdAt', { ascending: false });
            if (error) throw error;
            if (tasks.length === 0) {
                taskListContainer.innerHTML = '<p>নতুন টাস্ক শীঘ্রই আসছে...</p>';
                return;
            }
            taskListContainer.innerHTML = '';
            const completedTasks = userData.completedTasks ?? [];
            tasks.forEach(task => {
                const isCompleted = completedTasks.includes(task.id);
                const taskElement = document.createElement('div');
                taskElement.className = `task-item ${isCompleted ? 'completed' : ''}`;
                taskElement.dataset.taskId = task.id;
                taskElement.dataset.reward = task.reward;
                taskElement.innerHTML = `
                    <div class="task-item-header">
                        <h3 class="task-title">${task.title}</h3>
                        <span class="task-reward">৳ ${task.reward.toFixed(2)}</span>
                    </div>
                    <p class="task-description">${task.description}</p>`;
                taskListContainer.appendChild(taskElement);
            });
        } catch (error) {
            handleError('টাস্ক লোড করতে সমস্যা হয়েছে।', error);
        }
    }

    async function handleTaskClick(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem || taskItem.classList.contains('completed')) {
            if (taskItem) tg.showAlert('আপনি এই টাস্কটি ইতোমধ্যে সম্পন্ন করেছেন।');
            return;
        }
        
        if (typeof window.showGiga !== 'function') {
            handleError("বিজ্ঞাপন ফাংশন (showGiga) পাওয়া যায়নি।");
            return;
        }

        const taskId = taskItem.dataset.taskId;
        const reward = parseFloat(taskItem.dataset.reward);
        tg.HapticFeedback.impactOccurred('light');

        try {
            await window.showGiga();
            tg.HapticFeedback.notificationOccurred('success');
            const updatedCompletedTasks = [...(userData.completedTasks ?? []), taskId];
            await awardEarnings(reward, { completedTasks: updatedCompletedTasks });
            
            tg.showAlert(`অভিনন্দন! টাস্ক সম্পন্ন করে ৳ ${reward.toFixed(2)} পেয়েছেন।`);
            taskItem.classList.add('completed');
            // await fetchUserData(); // সাবস্ক্রিপশন এটি হ্যান্ডেল করবে, তবে রিয়াল-টাইম আপডেটের জন্য এটি রাখা যায়
        } catch (e) {
            handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে।", e);
        }
    }

    async function startQuiz() {
        try {
            // সর্বদা সর্বশেষ ব্যবহারকারীর ডেটা পান
            const { data: freshUserData, error } = await sb.from('users').select('quizProgress').eq('id', telegramUser.id.toString()).single();
            if (error) throw new Error("ব্যবহারকারীর তথ্য পাওয়া যায়নি।");

            const today = new Date().toISOString().slice(0, 10);
            let currentQuizProgress = (freshUserData.quizProgress?.date === today)
                ? freshUserData.quizProgress
                : { date: today, completedToday: 0, currentStep: 0 };
            
            if (currentQuizProgress.completedToday >= quizConfig.dailyLimit) {
                tg.showAlert(`আপনি আজকের জন্য আপনার সব কুইজ সম্পন্ন করেছেন।`);
                return;
            }

            currentQuizProgress.currentStep = 0;
            const { error: updateError } = await sb.from('users').update({ quizProgress: currentQuizProgress }).eq('id', telegramUser.id.toString());
            if (updateError) throw updateError;

            userData.quizProgress = currentQuizProgress; // লোকাল ডেটা সিঙ্ক করুন

            showScreen('quiz-screen');
            quizScreenElements.questionText.textContent = 'প্রশ্ন লোড হচ্ছে...';
            quizScreenElements.optionsContainer.innerHTML = '';

            const { data: quizzes, error: quizError } = await sb.from('quizzes').select('*');
            if (quizError) throw quizError;
            if (quizzes.length === 0) throw new Error('কোনো কুইজ পাওয়া যায়নি।');

            quizQuestions = quizzes.sort(() => 0.5 - Math.random());
            currentQuizIndex = 0;
            displayCurrentQuiz();
        } catch (error) {
            handleError(error.message || 'কুইজ শুরু করতে একটি অপ্রত্যাশিত সমস্যা হয়েছে।', error);
            showScreen('home-screen');
        }
    }

    function displayCurrentQuiz() {
        const { completedToday = 0, currentStep = 0 } = userData.quizProgress ?? {};
        const remaining = quizConfig.dailyLimit - completedToday;
        quizScreenElements.progressText.textContent = `দৈনিক কুইজ সেশন বাকি আছে: ${remaining}`;
        
        const clickTarget = quizConfig.clickTarget || 3;
        quizScreenElements.stepText.textContent = `ধাপ: ${currentStep}/${clickTarget}`;
        quizScreenElements.progressInner.style.width = `${(currentStep / clickTarget) * 100}%`;

        if (currentStep >= clickTarget) {
            showScreen('home-screen'); // কুইজ সেশন শেষ
            return;
        }

        if (currentQuizIndex >= quizQuestions.length) currentQuizIndex = 0;
        const quiz = quizQuestions[currentQuizIndex];
        
        if (!quiz) {
            handleError("কুইজের প্রশ্ন লোড করা যায়নি।");
            showScreen('home-screen');
            return;
        }

        quizScreenElements.questionText.textContent = quiz.question;
        quizScreenElements.optionsContainer.innerHTML = '';
        quiz.options.forEach(optionText => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'quiz-option';
            optionDiv.textContent = optionText;
            quizScreenElements.optionsContainer.appendChild(optionDiv);
        });

        selectedQuizOption = null;
        quizScreenElements.nextBtn.disabled = true;

        if (currentStep === clickTarget - 1) {
            quizScreenElements.instruction.textContent = 'এটি শেষ ধাপ! পুরস্কার জিততে বিজ্ঞাপনে ক্লিক করুন।';
            quizScreenElements.nextBtn.textContent = 'Claim Reward';
        } else {
            quizScreenElements.instruction.textContent = 'সঠিক উত্তর দিয়ে পরবর্তী ধাপে যান';
            quizScreenElements.nextBtn.textContent = 'পরবর্তী কুইজ';
        }
    }

    function handleOptionSelect(e) {
        const option = e.target.closest('.quiz-option');
        if (!option) return;
        document.querySelectorAll('.quiz-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        selectedQuizOption = option;
        quizScreenElements.nextBtn.disabled = false;
    }

    function handleNextQuiz() {
        if (!selectedQuizOption) return;
        if (selectedQuizOption.textContent !== quizQuestions[currentQuizIndex].correctAnswer) {
            tg.showAlert('ভুল উত্তর! অনুগ্রহ করে সঠিক উত্তরটি নির্বাচন করুন।');
            return;
        }
        
        if (typeof window.showGiga !== 'function') {
            handleError("বিজ্ঞাপন ফাংশন (showGiga) পাওয়া যায়নি।");
            return;
        }

        quizScreenElements.nextBtn.disabled = true;
        const currentStep = userData.quizProgress?.currentStep ?? 0;
        const clickTarget = quizConfig.clickTarget || 3;
        const isClickTask = currentStep === clickTarget - 1;
        tg.HapticFeedback.impactOccurred('light');

        window.showGiga().then(() => {
            if (isClickTask) {
                // --- অ্যাড ক্লিক টাস্ক ---
                adClicked = false;
                const handleVisibilityChange = () => {
                    if (document.visibilityState === 'hidden') {
                        adClicked = true;
                        document.removeEventListener('visibilitychange', handleVisibilityChange);
                    }
                };
                document.addEventListener('visibilitychange', handleVisibilityChange);

                tg.showPopup({
                    title: 'গুরুত্বপূর্ণ নির্দেশনা',
                    message: 'পুরস্কার পেতে, অনুগ্রহ করে পরবর্তী বিজ্ঞাপনে ক্লিক করুন। ক্লিক না করলে ব্যালেন্স যোগ হবে না।',
                    buttons: [{ type: 'ok', text: 'ঠিক আছে' }]
                });

                setTimeout(async () => {
                    document.removeEventListener('visibilitychange', handleVisibilityChange);
                    if (adClicked) {
                        tg.HapticFeedback.notificationOccurred('success');
                        const updatedProgress = { 
                            ...userData.quizProgress, 
                            completedToday: (userData.quizProgress.completedToday ?? 0) + 1, 
                            currentStep: 0 
                        };
                        try {
                            await awardEarnings(quizConfig.reward, { quizProgress: updatedProgress });
                            tg.showAlert(`অভিনন্দন! কুইজ সম্পন্ন করে ৳ ${quizConfig.reward.toFixed(2)} পেয়েছেন।`);
                            showScreen('home-screen');
                        } catch (e) {
                            handleError("পুরস্কার দিতে সমস্যা হয়েছে।", e);
                            quizScreenElements.nextBtn.disabled = false;
                        }
                    } else {
                        tg.HapticFeedback.notificationOccurred('error');
                        tg.showAlert("পুরস্কার পেতে বিজ্ঞাপনে ক্লিক করা আবশ্যক ছিল।");
                        quizScreenElements.nextBtn.disabled = false;
                    }
                }, 3000); // ব্যবহারকারীকে ক্লিক করার জন্য ৩ সেকেন্ড সময় দিন

            } else {
                // --- পরবর্তী ধাপ ---
                tg.HapticFeedback.notificationOccurred('success');
                const updatedProgress = { ...userData.quizProgress, currentStep: currentStep + 1 };
                sb.from('users').update({ quizProgress: updatedProgress }).eq('id', telegramUser.id.toString())
                  .then(({ error }) => {
                    if (error) throw error;
                    userData.quizProgress = updatedProgress; // লোকাল ডেটা সিঙ্ক করুন
                    currentQuizIndex++;
                    displayCurrentQuiz();
                  })
                  .catch(e => {
                      handleError("পরবর্তী ধাপে যেতে সমস্যা হয়েছে।", e);
                      quizScreenElements.nextBtn.disabled = false;
                  });
            }
        }).catch(e => {
            handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে।", e);
            quizScreenElements.nextBtn.disabled = false;
        });
    }

    function handleSpin() {
        if (isSpinning) return;

        const today = new Date().toISOString().slice(0, 10);
        const spinsTodayCount = userData.spinsToday?.date === today ? (userData.spinsToday?.count ?? 0) : 0;
        const spinsLeftCount = spinConfig.dailyLimit - spinsTodayCount;

        if (spinsLeftCount <= 0) {
            tg.showAlert("আপনার আজকের জন্য আর কোনো স্পিন বাকি নেই।");
            return;
        }
        
        if (typeof window.showGiga !== 'function') {
            handleError("বিজ্ঞাপন ফাংশন (showGiga) পাওয়া যায়নি।");
            return;
        }

        isSpinning = true;
        spinScreenElements.triggerBtn.disabled = true;
        tg.HapticFeedback.impactOccurred('light');

        // অ্যাড আগে দেখান
        window.showGiga().then(() => {
            // অ্যাড সফলভাবে দেখানোর পর স্পিন করুন
            tg.HapticFeedback.notificationOccurred('success');
            
            const numSegments = spinConfig.rewards.length;
            const targetSegment = Math.floor(Math.random() * numSegments);
            const segmentAngle = 360 / numSegments;
            const randomInSegment = (Math.random() * 0.8 + 0.1) * segmentAngle; // মাঝখানের দিকে রাখুন
            const targetRotation = (targetSegment * segmentAngle) + randomInSegment + (360 * 5); // 5 full spins

            spinScreenElements.wheelGroup.style.transform = `rotate(${targetRotation}deg)`;
            currentRotation = targetRotation % 360;

            setTimeout(() => spinFinished(targetSegment, today, spinsTodayCount), 5000);

        }).catch(e => {
            handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে।", e);
            isSpinning = false;
            spinScreenElements.triggerBtn.disabled = false;
        });
    }

    async function spinFinished(targetSegment, today, spinsTodayCount) {
        try {
            const reward = spinConfig.rewards[targetSegment];
            await awardEarnings(reward, {
                spinsToday: { date: today, count: spinsTodayCount + 1 }
            });
            tg.showAlert(`অভিনন্দন! স্পিন থেকে ৳ ${reward.toFixed(2)} পেয়েছেন।`);
        } catch (e) {
            handleError("স্পিনের পুরস্কার দিতে সমস্যা হয়েছে।", e);
        } finally {
            isSpinning = false;
            spinScreenElements.triggerBtn.disabled = false;
            
            // স্পিন অ্যানিমেশন রিসেট করুন
            spinScreenElements.wheelGroup.style.transition = 'none';
            spinScreenElements.wheelGroup.style.transform = `rotate(${currentRotation}deg)`;
            setTimeout(() => {
                spinScreenElements.wheelGroup.style.transition = 'transform 5s cubic-bezier(0.25, 0.1, 0.25, 1)';
            }, 50);
        }
    }

    async function handleDailyCheckin(buttonElement) {
        const today = new Date().toISOString().slice(0, 10);
        const checkinsTodayCount = userData.checkinsToday?.date === today ? (userData.checkinsToday?.count ?? 0) : 0;
        
        if (checkinsTodayCount >= appConfig.dailyCheckinLimit) {
            tg.showAlert("আপনি আজকের জন্য আপনার সব Daily Check সম্পন্ন করেছেন।");
            return;
        }
        
        if (typeof window.showGiga !== 'function') {
            handleError("বিজ্ঞাপন ফাংশন (showGiga) পাওয়া যায়নি।");
            return;
        }

        buttonElement.disabled = true;
        tg.HapticFeedback.impactOccurred('light');

        try {
            await window.showGiga();
            tg.HapticFeedback.notificationOccurred('success');
            await awardEarnings(appConfig.dailyReward, {
                checkinsToday: { date: today, count: checkinsTodayCount + 1 }
                // 'lastCheckin' আর প্রয়োজন নেই, তবে রাখলে সমস্যা নেই
            });
            tg.showAlert(`অভিনন্দন! Daily Check বোনাস হিসেবে ৳ ${appConfig.dailyReward.toFixed(2)} পেয়েছেন।`);
        } catch (e) {
            handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে।", e);
        } finally {
            buttonElement.disabled = false;
        }
    }

    async function handleSubmitWithdraw(buttonElement) {
        const methodSelect = document.getElementById('paymentMethodSelect');
        const accountNumberInput = document.getElementById('accountNumberInput');
        if (!methodSelect || !accountNumberInput) {
            handleError("পেমেন্ট ফর্ম সঠিকভাবে লোড হয়নি।");
            return;
        }

        const selectedMethod = paymentMethods.find(m => m.id === methodSelect.value);
        const accountNumber = accountNumberInput.value.trim();

        if (!selectedMethod) {
            tg.showAlert("অনুগ্রহ করে একটি বৈধ পেমেন্ট পদ্ধতি নির্বাচন করুন।");
            return;
        }
        if (accountNumber.length < (selectedMethod.minLength || 1)) {
            tg.showAlert(`অনুগ্রহ করে একটি সঠিক ${selectedMethod.name} নম্বর দিন।`);
            return;
        }
        if ((userData.balance ?? 0) < MINIMUM_WITHDRAW_AMOUNT) {
            tg.showAlert(`আপনার অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই।`);
            return;
        }

        buttonElement.disabled = true;
        const withdrawalAmount = userData.balance ?? 0;

        const withdrawal = {
            userId: telegramUser.id.toString(),
            username: telegramUser.username || '',
            amount: withdrawalAmount,
            methodId: selectedMethod.id,
            methodName: selectedMethod.name,
            accountNumber: accountNumber,
            status: 'pending',
            timestamp: new Date().toISOString()
        };

        try {
            // প্রথমে ব্যালেন্স 0 করুন, তারপর উইথড্রল রিকোয়েস্ট পাঠান
            const { error: updateError } = await sb.from('users').update({ balance: 0 }).eq('id', telegramUser.id.toString());
            if (updateError) throw updateError;
            
            const { error: insertError } = await sb.from('withdrawals').insert(withdrawal);
            if (insertError) {
                // যদি উইথড্রল রিকোয়েস্ট ফেইল হয়, ব্যালেন্স ফেরত দিন
                await sb.from('users').update({ balance: withdrawalAmount }).eq('id', telegramUser.id.toString());
                throw insertError;
            }

            tg.showAlert("আপনার উইথড্র অনুরোধ সফলভাবে জমা হয়েছে।");
            showScreen('home-screen');
            accountNumberInput.value = '';
        } catch (e) {
            handleError("উইথড্র অনুরোধে সমস্যা হয়েছে।", e);
            buttonElement.disabled = false;
        }
        // finally-তে বাটন enable করা হয়নি, কারণ সফল হলে ব্যবহারকারী অন্য স্ক্রিনে চলে যাবে
    }

    function handleShareReferral() {
        const link = referElements.linkInput.value;
        const text = `এখানে প্রতিদিন আয় করুন! আমার অ্যাফিলিয়েট লিংক দিয়ে জয়েন করুন: ${link}`;
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
    }

    function handleError(message, error) {
        if (error) console.error("Error Details:", error);
        tg.showAlert(typeof message === 'string' ? message : "একটি অপ্রত্যাশিত সমস্যা হয়েছে।");
    }

    function getInitials(fullName) {
        if (!fullName) return '?';
        const names = fullName.split(' ').filter(Boolean); // খালি স্ট্রিং বাদ দিন
        if (names.length === 0) return '?';
        const firstInitial = names[0][0] || '';
        const lastInitial = names.length > 1 ? names[names.length - 1][0] : '';
        return `${firstInitial}${lastInitial}`.toUpperCase();
    }

    function createSvgWheel() {
        const wheelGroup = spinScreenElements.wheelGroup;
        if (!wheelGroup) return;
        wheelGroup.innerHTML = '';
        const numSegments = spinConfig.rewards.length;
        if (numSegments === 0) return; // সেগমেন্ট না থাকলে কিছু করবেন না

        const angle = 360 / numSegments;
        const colors = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#d81b60', '#00acc1', '#fb8c00', '#5e35b1', '#6d4c41'];
        const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
            const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
            return { x: centerX + (radius * Math.cos(angleInRadians)), y: centerY + (radius * Math.sin(angleInRadians)) };
        };

        for (let i = 0; i < numSegments; i++) {
            const startAngle = i * angle;
            const endAngle = startAngle + angle;
            const start = polarToCartesian(250, 250, 210, endAngle);
            const end = polarToCartesian(250, 250, 210, startAngle);
            const largeArcFlag = angle > 180 ? "1" : "0";
            const pathData = `M 250 250 L ${start.x} ${start.y} A 210 210 0 ${largeArcFlag} 0 ${end.x} ${end.y} z`;
            
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathData);
            path.setAttribute("fill", colors[i % colors.length]); // রঙ চক্রাকারে ব্যবহার করুন
            path.setAttribute("stroke", "#8d6e63");
            path.setAttribute("stroke-width", "4");
            wheelGroup.appendChild(path);

            const textAngle = startAngle + (angle / 2);
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
        // ... (sparkles কোডটি অপরিবর্তিত রাখা হয়েছে, কারণ এটি ঠিক ছিল)
    }

    function generateUniqueAffiliateCode(base) {
        const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const cleanBase = base.replace(/[^a-zA-Z0-9]/g, ''); // স্পেশাল অক্ষর বাদ দিন
        return cleanBase.slice(0, 8).toUpperCase() + randomPart;
    }

    async function handleAffiliateSignup(affiliateCode, newUserId) {
        try {
            const { data: referrer, error } = await sb.from('users').select('*').eq('affiliateCode', affiliateCode).single();
            if (error || !referrer) {
                if(error) console.error("Referrer fetch error:", error);
                return;
            }
            if (!referrer.referrals || !referrer.referrals.includes(newUserId)) {
                const bonus = appConfig.referralBonus ?? 0;
                await sb.from('users').update({
                    balance: (referrer.balance ?? 0) + bonus,
                    referrals: [...(referrer.referrals ?? []), newUserId],
                    referralEarnings: (referrer.referralEarnings ?? 0) + bonus
                }).eq('id', referrer.id);
            }
        } catch (error) {
            console.error("Affiliate signup handling failed:", error);
        }
    }

    async function awardEarnings(amount, additionalUpdates = {}) {
        if (!userData || !userData.id) {
            throw new Error("User data not available for awarding earnings.");
        }

        // প্রথমে ইউজারের নিজের ব্যালেন্স আপডেট করুন
        const currentUserId = userData.id;
        const newBalance = (userData.balance ?? 0) + amount;
        
        const { error: selfUpdateError } = await sb.from('users').update({
            balance: newBalance,
            ...additionalUpdates
        }).eq('id', currentUserId);
        
        if (selfUpdateError) throw selfUpdateError;

        // লোকাল ডেটা আপডেট করুন (সাবস্ক্রিপশনের উপর সম্পূর্ণ নির্ভর না করে)
        userData = { ...userData, balance: newBalance, ...additionalUpdates };
        updateUI(); // তাৎক্ষণিক UI আপডেট

        // এখন অ্যাফিলিয়েট কমিশন গণনা করুন
        if (!userData.referredBy || (appConfig.affiliateCommissionRate ?? 0) <= 0) {
            return; // কোনো রেফারার নেই বা কমিশন রেট 0
        }

        try {
            let commissionAmount = amount * appConfig.affiliateCommissionRate;
            let currentReferrerId = userData.referredBy;

            while (currentReferrerId && commissionAmount >= 0.01) {
                const { data: referrer, error: refErr } = await sb.from('users').select('id, balance, referralEarnings, referredBy').eq('id', currentReferrerId).single();
                
                if (refErr || !referrer) break; // রেফারার পাওয়া না গেলে লুপ ব্রেক করুন

                const { error: commissionError } = await sb.from('users').update({
                    balance: (referrer.balance ?? 0) + commissionAmount,
                    referralEarnings: (referrer.referralEarnings ?? 0) + commissionAmount
                }).eq('id', referrer.id);
                
                if (commissionError) break; // আপডেট ফেইল হলে ব্রেক করুন

                // পরবর্তী স্তরের জন্য প্রস্তুত হোন (যদি মাল্টি-লেভেল হয়)
                // আপনার কোড অনুযায়ী এটি শুধুমাত্র এক-স্তর (single-level) কমিশন দেয়
                // যদি মাল্টি-লেভেল করতে চান, তাহলে commissionAmount আবার গুণ করতে হবে এবং currentReferrerId আপডেট করতে হবে
                // currentReferrerId = referrer.referredBy; 
                // commissionAmount *= appConfig.affiliateCommissionRate;
                
                // আপনার বর্তমান লজিক অনুযায়ী, এটি শুধু প্রথম রেফারারকে কমিশন দেয় এবং থেমে যায়।
                // যদি মাল্টি-লেভেল চান, নিচের 'break' টি রিমুভ করুন এবং উপরের ২টি লাইন আনকমেন্ট করুন।
                break;
                // --- অথবা, আপনার কোডের মূল লজিকটি এমন ছিল:
                // currentUserId = currUser.referredBy; // এটি ভুল ছিল, এটি হওয়া উচিত:
                // currentReferrerId = referrer.referredBy;
            }
        } catch (e) {
            console.error("Affiliate commission processing error:", e);
        }
    }

    // --- App Start ---
    main();
});
