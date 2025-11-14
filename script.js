document.addEventListener('DOMContentLoaded', function() {
    // --- Firebase & Telegram Setup ---
    const firebaseConfig = {
  apiKey: "AIzaSyB30yhNEJ9YWdeNIFVsBcA57DIpl3TgU3k",
  authDomain: "bkash-mini-bot.firebaseapp.com",
  projectId: "bkash-mini-bot",
  storageBucket: "bkash-mini-bot.firebasestorage.app",
  messagingSenderId: "517103882878",
  appId: "1:517103882878:web:8311ae8d14330697e67e2f",
  measurementId: "G-CYTSLKV4LB"
};
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();
    const tg = window.Telegram.WebApp;

    // --- Constants & Global Variables ---
    const BOT_USERNAME = "Bkash_earn_free_TkBot";
    const MINIMUM_WITHDRAW_AMOUNT = 10;
    let appConfig = { dailyReward: 1, dailyCheckinLimit: 1, referralBonus: 5, affiliateCommissionRate: 0.1 }; // Updated: Added dailyCheckinLimit
    let spinConfig = { dailyLimit: 5, rewards: [0.5, 1, 2, 0.5, 1.5, 1, 0.5, 2, 1, 1.5] };
    let quizConfig = { dailyLimit: 3, reward: 2, clickTarget: 3 };
    let paymentMethods = [];
    let telegramUser, userRef, userData = {};
    let firebaseUid = null;
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

    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        telegramUser = tg.initDataUnsafe.user;
        auth.signInAnonymously()
            .then((userCredential) => {
                firebaseUid = userCredential.user.uid;
                initializeApp();
            })
            .catch((error) => {
                handleError("ব্যবহারকারী যাচাইকরণে সমস্যা হয়েছে। অনুগ্রহ করে অ্যাপটি রিস্টার্ট করুন।", error);
            });
    } else {
        document.body.innerHTML = "<h1>অনুগ্রহ করে টেলিগ্রাম অ্যাপ থেকে খুলুন।</h1>";
    }

    function initializeApp() {
        userRef = db.collection('users').doc(telegramUser.id.toString());
        fetchAdminSettings();
        fetchUserData();
        setupEventListeners();
        createSvgWheel();
    }

    function fetchUserData() {
        userRef.onSnapshot((doc) => {
            const today = new Date().toISOString().slice(0, 10);
            if (doc.exists) {
                userData = doc.data();
            } else {
                const referrerId = tg.initDataUnsafe.start_param;
                const newUser = {
                    telegramId: telegramUser.id.toString(),
                    username: telegramUser.username || '',
                    fullName: `${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`.trim(),
                    balance: 0,
                    lastCheckin: null,
                    checkinsToday: { date: today, count: 0 },
                    spinsToday: { date: today, count: 0 },
                    completedTasks: [],
                    quizProgress: { date: today, completedToday: 0, currentStep: 0 },
                    referredBy: referrerId || null,
                    referrals: [], 
                    referralEarnings: 0, 
                    affiliateCode: generateUniqueAffiliateCode(telegramUser.username || telegramUser.id.toString()), 
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    uid: firebaseUid  // Added uid field
                };
                userRef.set(newUser).then(() => {
                    userData = newUser;
                    if (referrerId && referrerId !== newUser.affiliateCode) { // Prevent self-referral using code
                        handleAffiliateSignup(referrerId, newUser.telegramId);
                    }
                }).catch(err => handleError("নতুন ব্যবহারকারী তৈরিতে সমস্যা হয়েছে।", err));
            }
            updateUI();
        }, (error) => {
            console.error("Firestore onSnapshot error:", error);
            handleError("ব্যবহারকারীর ডেটা লোড করতে ব্যর্থ হয়েছে। আপনার ইন্টারনেট সংযোগ এবং অ্যাপের অনুমতি পরীক্ষা করুন।");
        });
    }

    async function fetchAdminSettings() {
        try {
            const settingsPromises = [
                db.collection('settings').doc('appConfig').get(),
                db.collection('settings').doc('spinConfig').get(),
                db.collection('settings').doc('quizConfig').get(),
                db.collection('settings').doc('paymentMethods').get()
            ];
            const [appConfigDoc, spinConfigDoc, quizConfigDoc, paymentMethodsDoc] = await Promise.all(settingsPromises);

            if (appConfigDoc.exists) {
                const data = appConfigDoc.data();
                appConfig = { 
                    dailyReward: data.dailyReward || 1, 
                    dailyCheckinLimit: data.dailyCheckinLimit || 1, // Updated: Fetch dailyCheckinLimit from admin
                    referralBonus: data.referralBonus || 5,
                    affiliateCommissionRate: data.affiliateCommissionRate || 0.1 // New: Fetch from admin
                };
            }
            if (spinConfigDoc.exists) {
                const data = spinConfigDoc.data();
                spinConfig = { dailyLimit: data.dailyLimit || 5, rewards: data.rewards || [0.5, 1, 2, 0.5, 1.5, 1, 0.5, 2, 1, 1.5] };
            }
            if (quizConfigDoc.exists) {
                quizConfig = quizConfigDoc.data();
                quizConfig.clickTarget = quizConfig.clickTarget || 3;
            }
            if (paymentMethodsDoc.exists) {
                paymentMethods = paymentMethodsDoc.data().methods.filter(method => method.enabled);
            }
            updateWalletUI();
        } catch (error) {
            handleError("অ্যাপ সেটিংস লোড করা যায়নি।", error);
        }
    }

    function updateUI() {
        const balance = userData.balance || 0;
        const fullName = userData.fullName || telegramUser.first_name;
        const username = userData.username || telegramUser.id;
        const formattedBalance = `৳ ${balance.toFixed(2)}`;
        headerElements.balance.innerText = formattedBalance;
        headerElements.fullName.innerText = fullName;
        headerElements.username.innerText = username ? `@${username}` : `#${telegramUser.id}`;
        headerElements.pic.innerText = getInitials(fullName);
        walletElements.balance.innerText = formattedBalance;
        walletElements.submitBtn.disabled = balance < MINIMUM_WITHDRAW_AMOUNT;
        walletElements.submitBtn.innerText = balance < MINIMUM_WITHDRAW_AMOUNT ? `ন্যূনতম ৳${MINIMUM_WITHDRAW_AMOUNT} প্রয়োজন` : "উইথড্র সাবমিট করুন";
        referElements.notice.textContent = `প্রতি সফল রেফারে আপনি পাবেন ৳${(appConfig.referralBonus || 0).toFixed(2)}! অ্যাফিলিয়েট কমিশন: ${(appConfig.affiliateCommissionRate * 100).toFixed(0)}%`; // Updated notice
        referElements.linkInput.value = `https://t.me/${BOT_USERNAME}?start=${userData.affiliateCode || telegramUser.id}`; // Use affiliateCode
        const spinsLeftCount = spinConfig.dailyLimit - (userData.spinsToday?.count || 0);
        spinScreenElements.spinsLeft.innerText = spinsLeftCount > 0 ? spinsLeftCount : 0;

        // Display referral/affiliate stats
        if (referElements.count) {
            referElements.count.textContent = userData.referrals ? userData.referrals.length : 0;
        }
        if (referElements.earnings) {
            referElements.earnings.textContent = `৳ ${(userData.referralEarnings || 0).toFixed(2)}`;
        }

        // Fix: Update quiz UI if quiz screen is active
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

        const selectLabel = document.createElement('label');
        selectLabel.setAttribute('for', 'paymentMethodSelect');
        selectLabel.textContent = 'পেমেন্ট পদ্ধতি নির্বাচন করুন:';
        container.appendChild(selectLabel);
        const select = document.createElement('select');
        select.id = 'paymentMethodSelect';
        paymentMethods.forEach(method => {
            const option = document.createElement('option');
            option.value = method.id;
            option.textContent = method.name;
            select.appendChild(option);
        });
        container.appendChild(select);
        const inputLabel = document.createElement('label');
        inputLabel.setAttribute('for', 'accountNumberInput');
        inputLabel.id = 'accountNumberLabel';
        container.appendChild(inputLabel);
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'accountNumberInput';
        container.appendChild(input);

        const updateInputForMethod = () => {
            const selectedMethod = paymentMethods.find(m => m.id === select.value);
            if (selectedMethod) {
                inputLabel.textContent = `আপনার ${selectedMethod.name} নম্বর দিন:`;
                input.placeholder = selectedMethod.placeholder || '';
                input.inputMode = selectedMethod.inputMode || 'text';
            }
        };
        select.addEventListener('change', updateInputForMethod);
        updateInputForMethod();
    }

    function setupEventListeners() {
        navButtons.forEach(btn => btn.addEventListener('click', (e) => { const screenId = e.currentTarget.dataset.screen; showScreen(screenId); if (screenId === 'task-screen') { loadAndDisplayTasks(); } else if (screenId === 'refer-screen') { updateUI(); } }));
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

    function showScreen(screenId) {
        screens.forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.screen === screenId));
    }

    async function loadAndDisplayTasks() {
        taskListContainer.innerHTML = '<p>টাস্ক লোড হচ্ছে...</p>';
        try {
            const taskSnapshot = await db.collection('tasks').where('isActive', '==', true).orderBy('createdAt', 'desc').get();
            if (taskSnapshot.empty) {
                taskListContainer.innerHTML = '<p>নতুন টাস্ক শীঘ্রই আসছে...</p>';
                return;
            }
            taskListContainer.innerHTML = '';
            taskSnapshot.forEach(doc => {
                const task = doc.data();
                const taskId = doc.id;
                const isCompleted = userData.completedTasks && userData.completedTasks.includes(taskId);
                const taskElement = document.createElement('div');
                taskElement.className = `task-item ${isCompleted ? 'completed' : ''}`;
                taskElement.dataset.taskId = taskId;
                taskElement.dataset.reward = task.reward;
                taskElement.innerHTML = `<div class="task-item-header"><h3 class="task-title">${task.title}</h3><span class="task-reward">৳ ${task.reward.toFixed(2)}</span></div><p class="task-description">${task.description}</p>`;
                taskListContainer.appendChild(taskElement);
            });
        } catch (error) {
            handleError('টাস্ক লোড করতে সমস্যা হয়েছে। সম্ভবত ডেটাবেস ইনডেক্স তৈরি করা হয়নি।', error);
        }
    }

    function handleTaskClick(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem || taskItem.classList.contains('completed')) {
            if (taskItem) tg.showAlert('আপনি এই টাস্কটি ইতোমধ্যে সম্পন্ন করেছেন।');
            return;
        }
        const taskId = taskItem.dataset.taskId;
        const reward = parseFloat(taskItem.dataset.reward);
        tg.HapticFeedback.impactOccurred('light');
        window.showGiga().then(() => {
            tg.HapticFeedback.notificationOccurred('success');
            awardEarnings(reward, { completedTasks: firebase.firestore.FieldValue.arrayUnion(taskId) }).then(() => { // Updated: Use awardEarnings
                tg.showAlert(`অভিনন্দন! টাস্ক সম্পন্ন করে ৳ ${reward.toFixed(2)} পেয়েছেন।`);
                taskItem.classList.add('completed');
            });
        }).catch(e => handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে।", e));
    }

    async function startQuiz() {
        try {
            const doc = await userRef.get();
            if (!doc.exists) throw new Error("ব্যবহারকারীর তথ্য পাওয়া যায়নি।");
            const freshUserData = doc.data();
            const today = new Date().toISOString().slice(0, 10);
            let currentQuizProgress = freshUserData.quizProgress || {};
            if (currentQuizProgress.date !== today) {
                currentQuizProgress = { date: today, completedToday: 0, currentStep: 0 };
            }
            if (currentQuizProgress.completedToday >= quizConfig.dailyLimit) {
                tg.showAlert(`আপনি আজকের জন্য আপনার সব কুইজ সম্পন্ন করেছেন।`);
                return;
            }
            currentQuizProgress.currentStep = 0; // প্রতিবার শুরু করার সময় ধাপ রিসেট করা
            await userRef.update({ quizProgress: currentQuizProgress });
            userData.quizProgress = currentQuizProgress;
            showScreen('quiz-screen');
            quizScreenElements.questionText.textContent = 'প্রশ্ন লোড হচ্ছে...';
            quizScreenElements.optionsContainer.innerHTML = '';
            const snapshot = await db.collection('quizzes').get();
            quizQuestions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            if (quizQuestions.length === 0) throw new Error('কোনো কুইজ পাওয়া যায়নি।');
            quizQuestions.sort(() => 0.5 - Math.random());
            currentQuizIndex = 0;
            displayCurrentQuiz();
        } catch (error) {
            handleError(error.message || 'কুইজ শুরু করতে একটি অপ্রত্যাশিত সমস্যা হয়েছে।', error);
            showScreen('home-screen');
        }
    }

    function displayCurrentQuiz() {
        const { completedToday = 0, currentStep = 0 } = userData.quizProgress || {};
        const remaining = quizConfig.dailyLimit - completedToday;
        quizScreenElements.progressText.textContent = `দৈনিক কুইজ সেশন বাকি আছে: ${remaining}`;
        const clickTarget = quizConfig.clickTarget;
        quizScreenElements.stepText.textContent = `ধাপ: ${currentStep}/${clickTarget}`;
        quizScreenElements.progressInner.style.width = `${(currentStep / clickTarget) * 100}%`;
        
        if (currentStep >= clickTarget) {
            showScreen('home-screen');
            return;
        }
        
        if (currentQuizIndex >= quizQuestions.length) currentQuizIndex = 0;
        const quiz = quizQuestions[currentQuizIndex];
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
            quizScreenElements.instruction.textContent = 'সঠিক উত্তর দিয়ে পরবর্তী ধাপে যান';
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
        
        quizScreenElements.nextBtn.disabled = true;
        const currentStep = userData.quizProgress?.currentStep || 0;
        const isClickTask = currentStep === quizConfig.clickTarget - 1;
        tg.HapticFeedback.impactOccurred('light');
        
        window.showGiga().then(() => {
            if (isClickTask) {
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
                
                setTimeout(() => {
                    document.removeEventListener('visibilitychange', handleVisibilityChange);
                    if (adClicked) {
                        tg.HapticFeedback.notificationOccurred('success');
                        awardEarnings(quizConfig.reward, { 
                            'quizProgress.completedToday': firebase.firestore.FieldValue.increment(1),
                            'quizProgress.currentStep': 0 
                        }).then(() => { // Updated: Use awardEarnings
                            tg.showAlert(`অভিনন্দন! কুইজ সম্পন্ন করে ৳ ${quizConfig.reward.toFixed(2)} পেয়েছেন।`);
                            showScreen('home-screen');
                        });
                    } else {
                        tg.HapticFeedback.notificationOccurred('error');
                        tg.showAlert("পুরস্কার পেতে বিজ্ঞাপনে ক্লিক করা আবশ্যক ছিল।");
                        quizScreenElements.nextBtn.disabled = false;
                    }
                }, 3000);
            } else {
                tg.HapticFeedback.notificationOccurred('success');
                userRef.update({ 'quizProgress.currentStep': firebase.firestore.FieldValue.increment(1) })
                .then(() => {
                    currentQuizIndex++;
                    displayCurrentQuiz();
                });
            }
        }).catch(e => {
            handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে।", e);
            quizScreenElements.nextBtn.disabled = false;
        });
    }

    function handleSpin() {
        if (isSpinning) return;
        const spinsLeftCount = spinConfig.dailyLimit - (userData.spinsToday?.count || 0);
        if (spinsLeftCount <= 0) {
            tg.showAlert("আপনার আজকের জন্য আর কোনো স্পিন বাকি নেই।");
            return;
        }
        isSpinning = true;
        spinScreenElements.triggerBtn.disabled = true;

        // Randomly select target segment
        const numSegments = spinConfig.rewards.length;
        const targetSegment = Math.floor(Math.random() * numSegments);
        const segmentAngle = 360 / numSegments;
        const randomInSegment = Math.random() * segmentAngle; // Random within segment for variety
        const targetRotation = (targetSegment * segmentAngle) + randomInSegment + (360 * 5); // 5 full spins + target

        spinScreenElements.wheelGroup.style.transform = `rotate(${targetRotation}deg)`;
        currentRotation = targetRotation % 360;

        setTimeout(() => spinFinished(targetSegment), 5000); // Pass target segment to finish
    }

    function spinFinished(targetSegment) {
        tg.HapticFeedback.impactOccurred('light');
        window.showGiga().then(() => {
            tg.HapticFeedback.notificationOccurred('success');
            const reward = spinConfig.rewards[targetSegment];
            const today = new Date().toISOString().slice(0, 10);
            awardEarnings(reward, { // Updated: Use awardEarnings
                'spinsToday.date': today,
                'spinsToday.count': firebase.firestore.FieldValue.increment(1)
            }).then(() => {
                tg.showAlert(`অভিনন্দন! স্পিন থেকে ৳ ${reward.toFixed(2)} পেয়েছেন।`);
            });
        }).catch(e => handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে।", e)).finally(() => {
            isSpinning = false;
            spinScreenElements.triggerBtn.disabled = false;
            spinScreenElements.wheelGroup.style.transition = 'none';
            spinScreenElements.wheelGroup.style.transform = `rotate(${currentRotation}deg)`;
            setTimeout(() => {
                spinScreenElements.wheelGroup.style.transition = 'transform 5s cubic-bezier(0.25, 0.1, 0.25, 1)';
            }, 50);
        });
    }

    function handleDailyCheckin() {
        const today = new Date().toISOString().slice(0, 10);
        const checkinsTodayCount = userData.checkinsToday?.count || 0;
        if (userData.checkinsToday?.date !== today) {
            userData.checkinsToday = { date: today, count: 0 };
        }
        if (checkinsTodayCount >= appConfig.dailyCheckinLimit) {
            tg.showAlert("আপনি আজকের জন্য আপনার সব Daily Check সম্পন্ন করেছেন।");
            return;
        }
        this.disabled = true;
        tg.HapticFeedback.impactOccurred('light');
        window.showGiga().then(() => {
            tg.HapticFeedback.notificationOccurred('success');
            awardEarnings(appConfig.dailyReward, { // Updated: Use awardEarnings
                'checkinsToday.date': today,
                'checkinsToday.count': firebase.firestore.FieldValue.increment(1),
                lastCheckin: today
            }).then(() => {
                tg.showAlert(`অভিনন্দন! Daily Check বোনাস হিসেবে ৳ ${appConfig.dailyReward.toFixed(2)} পেয়েছেন।`);
            });
        }).catch(e => handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে।", e)).finally(() => {
            this.disabled = false;
        });
    }

    function handleSubmitWithdraw() {
        const methodSelect = document.getElementById('paymentMethodSelect');
        const accountNumberInput = document.getElementById('accountNumberInput');
        if (!methodSelect || !accountNumberInput) {
            handleError("পেমেন্ট ফর্ম সঠিকভাবে লোড হয়নি।");
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
        if (userData.balance < MINIMUM_WITHDRAW_AMOUNT) {
            tg.showAlert(`আপনার অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই।`);
            return;
        }
        this.disabled = true;
        db.collection('withdrawals').add({
            userId: telegramUser.id.toString(),
            username: telegramUser.username || '',
            amount: userData.balance,
            methodId: selectedMethod.id,
            methodName: selectedMethod.name,
            accountNumber: accountNumber,
            status: 'pending',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            userRef.update({ balance: 0 }).then(() => {
                tg.showAlert("আপনার উইথড্র অনুরোধ সফলভাবে জমা হয়েছে।");
                showScreen('home-screen');
                accountNumberInput.value = '';
            });
        }).catch(e => handleError("উইথড্র অনুরোধে সমস্যা হয়েছে।", e)).finally(() => {
            this.disabled = false;
        });
    }

    function handleShareReferral() {
        const link = referElements.linkInput.value;
        const text = `এখানে প্রতিদিন আয় করুন! আমার অ্যাফিলিয়েট লিংক দিয়ে জয়েন করুন: ${link}`;
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
    }

    function handleError(message, error) {
        if (error) console.error("Error:", error);
        tg.showAlert(typeof message === 'string' ? message : "একটি অপ্রত্যাশিত সমস্যা হয়েছে।");
    }

    function getInitials(fullName) {
        if (!fullName) return '';
        const names = fullName.split(' ');
        return `${names[0]?.[0] || ''}${names.length > 1 ? names[names.length - 1][0] : ''}`.toUpperCase();
    }

    function createSvgWheel() {
        const wheelGroup = spinScreenElements.wheelGroup;
        if (!wheelGroup) return;
        wheelGroup.innerHTML = '';
        const numSegments = spinConfig.rewards.length;
        const angle = 360 / numSegments;
        const colors = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#d81b60', '#00acc1', '#fb8c00', '#5e35b1', '#6d4c41'].slice(0, numSegments);
        const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
            const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
            return { x: centerX + (radius * Math.cos(angleInRadians)), y: centerY + (radius * Math.sin(angleInRadians)) };
        };
        for (let i = 0; i < numSegments; i++) {
            const startAngle = i * angle;
            const endAngle = startAngle + angle;
            const start = polarToCartesian(250, 250, 210, endAngle);
            const end = polarToCartesian(250, 250, 210, startAngle);
            const pathData = `M 250 250 L ${start.x} ${start.y} A 210 210 0 0 0 ${end.x} ${end.y} z`;
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathData);
            path.setAttribute("fill", colors[i]);
            path.setAttribute("stroke", "#8d6e63");
            path.setAttribute("stroke-width", "4");
            wheelGroup.appendChild(path);

            // Add reward text labels to segments
            const textAngle = startAngle + (angle / 2);
            const textPos = polarToCartesian(250, 250, 150, textAngle); // Position text inside segment
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", textPos.x);
            text.setAttribute("y", textPos.y);
            text.setAttribute("fill", "white");
            text.setAttribute("font-size", "20");
            text.setAttribute("font-weight", "bold");
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("dominant-baseline", "middle");
            text.setAttribute("transform", `rotate(${textAngle + 90}, ${textPos.x}, ${textPos.y})`); // Rotate text to align with wheel
            text.textContent = `৳${spinConfig.rewards[i].toFixed(1)}`;
            wheelGroup.appendChild(text);
        }
        for (let i = 0; i < numSegments; i++) {
            const sparkleAngle = (i * angle) + (angle / 2);
            const sparklePos = polarToCartesian(250, 250, 180, sparkleAngle);
            const sparkle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            sparkle.setAttribute("cx", sparklePos.x);
            sparkle.setAttribute("cy", sparklePos.y);
            sparkle.setAttribute("r", "5");
            sparkle.setAttribute("fill", "white");
            sparkle.setAttribute("filter", "url(#glow)");
            wheelGroup.appendChild(sparkle);
        }
    }

    // New: Generate unique affiliate code
    function generateUniqueAffiliateCode(base) {
        return base.slice(0, 8).toUpperCase() + Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // Simple unique code
    }

    // New: Handle affiliate signup and initial bonus
    async function handleAffiliateSignup(affiliateCode, newUserId) {
        const referrerQuery = await db.collection('users').where('affiliateCode', '==', affiliateCode).limit(1).get();
        if (referrerQuery.empty) return;
        const referrerDoc = referrerQuery.docs[0];
        const referrerRef = referrerDoc.ref;
        const referrerData = referrerDoc.data();
        if (!referrerData.referrals.includes(newUserId)) {
            const bonus = appConfig.referralBonus || 0;
            referrerRef.update({
                balance: firebase.firestore.FieldValue.increment(bonus),
                referrals: firebase.firestore.FieldValue.arrayUnion(newUserId),
                referralEarnings: firebase.firestore.FieldValue.increment(bonus)
            });
        }
    }

    // New: Award earnings and propagate affiliate commissions
    async function awardEarnings(amount, additionalUpdates = {}) {
        if (amount <= 0) return userRef.update(additionalUpdates);
        
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new Error('User not found');
            
            transaction.update(userRef, {
                balance: firebase.firestore.FieldValue.increment(amount),
                ...additionalUpdates
            });
            
            let currentUserId = telegramUser.id.toString();
            let commissionAmount = amount;
            while (currentUserId && commissionAmount > 0) {
                const currentUserDoc = await transaction.get(db.collection('users').doc(currentUserId));
                if (!currentUserDoc.exists) break;
                const currentData = currentUserDoc.data();
                const referrerId = currentData.referredBy;
                if (!referrerId) break;
                
                commissionAmount *= appConfig.affiliateCommissionRate;
                if (commissionAmount < 0.01) break; // Minimum commission threshold
                
                const referrerRef = db.collection('users').doc(referrerId);
                transaction.update(referrerRef, {
                    balance: firebase.firestore.FieldValue.increment(commissionAmount),
                    referralEarnings: firebase.firestore.FieldValue.increment(commissionAmount)
                });
                
                currentUserId = referrerId;
            }
        });
    }

    function handleReferralBonus(referrerId, newUserId) {
        // Deprecated: Use handleAffiliateSignup instead
    }
});
