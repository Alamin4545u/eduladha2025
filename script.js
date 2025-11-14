document.addEventListener('DOMContentLoaded', async function() {
    // --- Firebase & Telegram Setup ---
    const firebaseConfig = {
  apiKey: "AIzaSyB30yhNEJ9YWdeNIFVsBcA57DIpl3TgU3k",
  authDomain: "bkash-mini-bot.firebaseapp.com",
  projectId: "bkash-mini-bot",
  storageBucket: "bkash-mini-bot.firebasestorage.app",
  messagingSenderId: "517103882878",
  appId: "1:517103882878:web:15b89d8a83951596e67e2f",
  measurementId: "G-F4FT22EG6Y"
};
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const tg = window.Telegram.WebApp;

    // --- Constants & Global Variables ---
    const BOT_USERNAME = "Bkash_earn_free_TkBot";
    let appConfig = { dailyReward: 1, referralBonus: 5 };
    let spinConfig = { dailyLimit: 5, rewardAmount: 1 };
    let quizConfig = { dailyLimit: 3, reward: 2, clickTarget: 2 };
    let paymentMethods = [];
    let currentUser, userRef, userData = {};
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
    const walletElements = { balance: document.getElementById('withdrawBalance'), minWithdrawText: document.getElementById('minWithdrawText'), methodSelector: document.getElementById('paymentMethodSelector'), numberLabel: document.getElementById('paymentNumberLabel'), numberInput: document.getElementById('paymentNumberInput'), submitBtn: document.getElementById('submitWithdrawBtn') };
    const referElements = { linkInput: document.getElementById('referralLink'), shareBtn: document.getElementById('shareReferralBtn'), notice: document.getElementById('referral-notice') };
    const taskListContainer = document.getElementById('task-list');
    const quizScreenElements = { backBtn: document.getElementById('quizBackBtn'), progressText: document.getElementById('quiz-progress-text'), stepText: document.getElementById('quiz-step-text'), progressInner: document.getElementById('quiz-progress-inner'), instruction: document.getElementById('quiz-instruction'), questionText: document.getElementById('quiz-question-text'), optionsContainer: document.getElementById('quiz-options-container'), nextBtn: document.getElementById('next-quiz-btn') };

    // --- Main Logic ---
    tg.ready();
    tg.expand();
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        currentUser = tg.initDataUnsafe.user;
        userRef = db.collection('users').doc(currentUser.id.toString());
        await fetchAdminSettings();
        populatePaymentMethods();
        fetchUserData();
        setupEventListeners();
        createSvgWheel();
    } else { document.body.innerHTML = "<h1>অনুগ্রহ করে টেলিগ্রাম অ্যাপ থেকে খুলুন।</h1>"; }

    function createSvgWheel() {
        const wheelGroup = spinScreenElements.wheelGroup;
        if (!wheelGroup) return;
        wheelGroup.innerHTML = '';
        const numSegments = 10;
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
            const pathData = `M 250 250 L ${start.x} ${start.y} A 210 210 0 0 0 ${end.x} ${end.y} z`;
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathData);
            path.setAttribute("fill", colors[i]);
            path.setAttribute("stroke", "#8d6e63");
            path.setAttribute("stroke-width", "4");
            wheelGroup.appendChild(path);
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

    async function fetchAdminSettings() {
        try {
            const appConfigDoc = await db.collection('settings').doc('appConfig').get();
            if (appConfigDoc.exists) appConfig = { ...appConfig, ...appConfigDoc.data() };
            
            const spinConfigDoc = await db.collection('settings').doc('spinConfig').get();
            if (spinConfigDoc.exists) spinConfig = { ...spinConfig, ...spinConfigDoc.data() };

            const quizConfigDoc = await db.collection('settings').doc('quizConfig').get();
            if (quizConfigDoc.exists) quizConfig = { ...quizConfig, ...quizConfigDoc.data() };

            const paymentMethodsDoc = await db.collection('settings').doc('paymentMethods').get();
            if (paymentMethodsDoc.exists && Array.isArray(paymentMethodsDoc.data().methods) && paymentMethodsDoc.data().methods.length > 0) {
                paymentMethods = paymentMethodsDoc.data().methods;
            } else {
                console.warn("Payment methods not configured. Using default.");
                paymentMethods = [{ name: 'বিকাশ', minWithdraw: 10, placeholder: 'e.g., 01700000000' }];
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
            handleError("অ্যাপ সেটিংস লোড করা যায়নি।");
        }
    }
    
    function populatePaymentMethods() {
        if (!walletElements.methodSelector) return;
        walletElements.methodSelector.innerHTML = '';
        paymentMethods.forEach(method => {
            const option = document.createElement('option');
            option.value = method.name;
            option.textContent = method.name;
            walletElements.methodSelector.appendChild(option);
        });
        updateSelectedPaymentMethodUI();
    }
    
    function updateSelectedPaymentMethodUI() {
        const selectedMethodName = walletElements.methodSelector.value;
        const selectedMethod = paymentMethods.find(m => m.name === selectedMethodName);
        if (!selectedMethod) return;

        walletElements.numberLabel.textContent = `আপনার ${selectedMethod.name} নম্বর দিন:`;
        walletElements.numberInput.placeholder = selectedMethod.placeholder || `আপনার ${selectedMethod.name} নম্বর`;
        walletElements.minWithdrawText.innerHTML = `সর্বনিম্ন উইথড্র: <strong>৳ ${selectedMethod.minWithdraw.toFixed(2)}</strong>`;
        updateWithdrawButtonState();
    }

    function updateWithdrawButtonState() {
        const selectedMethodName = walletElements.methodSelector.value;
        const selectedMethod = paymentMethods.find(m => m.name === selectedMethodName);
        if (!selectedMethod) return;
        
        const balance = userData.balance || 0;
        const minAmount = selectedMethod.minWithdraw;

        if (balance < minAmount) {
            walletElements.submitBtn.disabled = true;
            walletElements.submitBtn.innerText = `ন্যূনতম ৳${minAmount.toFixed(2)} প্রয়োজন`;
        } else {
            walletElements.submitBtn.disabled = false;
            walletElements.submitBtn.innerText = "উইথড্র সাবমিট করুন";
        }
    }
    
    function fetchUserData() {
        userRef.onSnapshot((doc) => {
            const today = new Date().toISOString().slice(0, 10);
            if (doc.exists) {
                userData = doc.data();
                if (!userData.spinsToday || userData.spinsToday.date !== today) {
                    userData.spinsToday = { date: today, count: 0 };
                    userRef.update({ 'spinsToday': userData.spinsToday });
                }
                if (!userData.completedTasks) userData.completedTasks = [];
                if (!userData.quizProgress || userData.quizProgress.date !== today) {
                    userData.quizProgress = { date: today, completedToday: 0, currentStep: 0 };
                    userRef.update({ 'quizProgress': userData.quizProgress });
                }
            } else {
                const referrerId = tg.initDataUnsafe.start_param;
                const newUser = {
                    username: currentUser.username || '',
                    fullName: `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim(),
                    balance: 0,
                    lastCheckin: null,
                    spinsToday: { date: today, count: 0 },
                    completedTasks: [],
                    quizProgress: { date: today, completedToday: 0, currentStep: 0 },
                    referredBy: referrerId || null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                userRef.set(newUser).then(() => {
                    userData = newUser;
                    if (referrerId) {
                        handleReferralBonus(referrerId);
                    }
                });
            }
            updateUI();
        }, (error) => handleError("Failed to fetch user data.", error));
    }

    function handleReferralBonus(referrerId) {
        const referrerRef = db.collection('users').doc(referrerId);
        db.runTransaction((transaction) => {
            return transaction.get(referrerRef).then((doc) => {
                if (doc.exists) {
                    transaction.update(referrerRef, {
                        balance: firebase.firestore.FieldValue.increment(appConfig.referralBonus || 0)
                    });
                }
            });
        }).catch(err => console.error("Referral bonus error:", err));
    }

    function getInitials(fullName) {
        if (!fullName) return '';
        const names = fullName.split(' ');
        const firstInitial = names[0] ? names[0][0] : '';
        const lastInitial = names.length > 1 ? names[names.length - 1][0] : '';
        return `${firstInitial}${lastInitial}`.toUpperCase();
    }

    function updateUI() {
        const balance = userData.balance || 0;
        const fullName = userData.fullName || currentUser.first_name;
        const username = userData.username || currentUser.id;
        const formattedBalance = `৳ ${balance.toFixed(2)}`;
        headerElements.balance.innerText = formattedBalance;
        headerElements.fullName.innerText = fullName;
        headerElements.username.innerText = username ? `@${username}` : `#${currentUser.id}`;
        headerElements.pic.innerText = getInitials(fullName);
        walletElements.balance.innerText = formattedBalance;
        updateWithdrawButtonState();
        referElements.notice.textContent = `প্রতি সফল রেফারে আপনি পাবেন ৳${(appConfig.referralBonus || 0).toFixed(2)}!`;
        referElements.linkInput.value = `https://t.me/${BOT_USERNAME}?start=${currentUser.id}`;
        const spinsLeftCount = spinConfig.dailyLimit - (userData.spinsToday?.count || 0);
        spinScreenElements.spinsLeft.innerText = spinsLeftCount > 0 ? spinsLeftCount : 0;
    }

    function setupEventListeners() {
        navButtons.forEach(btn => btn.addEventListener('click', (e) => { const screenId = e.currentTarget.dataset.screen; showScreen(screenId); if (screenId === 'task-screen') { loadAndDisplayTasks(); } }));
        homeButtons.dailyCheckin.addEventListener('click', handleDailyCheckin);
        homeButtons.spin.addEventListener('click', () => showScreen('spin-screen'));
        homeButtons.quiz.addEventListener('click', startQuiz);
        spinScreenElements.backBtn.addEventListener('click', () => showScreen('home-screen'));
        quizScreenElements.backBtn.addEventListener('click', () => showScreen('home-screen'));
        spinScreenElements.triggerBtn.addEventListener('click', handleSpin);
        walletElements.submitBtn.addEventListener('click', handleSubmitWithdraw);
        walletElements.methodSelector.addEventListener('change', updateSelectedPaymentMethodUI);
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
            console.error("টাস্ক লোড করার সময় Firestore ত্রুটি:", error);
            handleError('টাস্ক লোড করতে সমস্যা হয়েছে। সম্ভবত ডেটাবেস ইনডেক্স তৈরি করা হয়নি।', error);
            taskListContainer.innerHTML = '<p>টাস্ক লোড করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।</p>';
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
            userRef.update({
                balance: firebase.firestore.FieldValue.increment(reward),
                completedTasks: firebase.firestore.FieldValue.arrayUnion(taskId)
            }).then(() => {
                tg.showAlert(`অভিনন্দন! টাস্ক সম্পন্ন করে ৳ ${reward.toFixed(2)} পেয়েছেন।`);
                taskItem.classList.add('completed');
            });
        }).catch(e => handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে।", e));
    }

    async function startQuiz() {
        try {
            const doc = await userRef.get();
            if (!doc.exists) {
                handleError("ব্যবহারকারীর তথ্য পাওয়া যায়নি।");
                return;
            }
            const freshUserData = doc.data();
            const today = new Date().toISOString().slice(0, 10);
            
            let currentQuizProgress = freshUserData.quizProgress;
            if (!currentQuizProgress || currentQuizProgress.date !== today) {
                currentQuizProgress = { date: today, completedToday: 0, currentStep: 0 };
                await userRef.update({ quizProgress: currentQuizProgress });
            }
            
            userData.quizProgress = currentQuizProgress;

            if (currentQuizProgress.completedToday >= quizConfig.dailyLimit) {
                tg.showAlert(`আপনি আজকের জন্য আপনার সব কুইজ সম্পন্ন করেছেন।`);
                return;
            }
            
            showScreen('quiz-screen');
            quizScreenElements.questionText.textContent = 'প্রশ্ন লোড হচ্ছে...';
            quizScreenElements.optionsContainer.innerHTML = '';
            
            const snapshot = await db.collection('quizzes').get();
            quizQuestions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            if (quizQuestions.length === 0) {
                handleError('কোনো কুইজ পাওয়া যায়নি।');
                return;
            }
            
            quizQuestions.sort(() => 0.5 - Math.random());
            currentQuizIndex = 0;
            displayCurrentQuiz();
        } catch (error) {
            handleError('কুইজ শুরু করতে একটি অপ্রত্যাশিত সমস্যা হয়েছে।', error);
        }
    }

    function displayCurrentQuiz() {
        const completedToday = userData.quizProgress?.completedToday || 0;
        const remaining = quizConfig.dailyLimit - completedToday;
        quizScreenElements.progressText.textContent = `দৈনিক কুইজ সেশন বাকি আছে: ${remaining}`;
        const currentStep = userData.quizProgress?.currentStep || 0;
        const clickTarget = quizConfig.clickTarget;
        quizScreenElements.stepText.textContent = `ধাপ: ${currentStep}/${clickTarget}`;
        quizScreenElements.progressInner.style.width = `${(currentStep / clickTarget) * 100}%`;
        if (currentStep >= clickTarget) {
            userRef.update({'quizProgress.currentStep': 0});
            handleError('একটি অপ্রত্যাশিত সমস্যা হয়েছে, অনুগ্রহ করে আবার শুরু করুন।');
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
            quizScreenElements.instruction.textContent = `এটি শেষ ধাপ! পুরস্কার জিততে বিজ্ঞাপনে ক্লিক করুন।`;
            quizScreenElements.nextBtn.textContent = 'Claim Reward';
        } else {
            quizScreenElements.instruction.textContent = `সঠিক উত্তর দিয়ে পরবর্তী ধাপে যান`;
            quizScreenElements.nextBtn.textContent = 'পরবর্তী কুইজ';
        }
    }

    function handleOptionSelect(e) {
        if (!e.target.classList.contains('quiz-option')) return;
        document.querySelectorAll('.quiz-option').forEach(opt => opt.classList.remove('selected'));
        e.target.classList.add('selected');
        selectedQuizOption = e.target;
        quizScreenElements.nextBtn.disabled = false;
    }

    function handleNextQuiz() {
        if (!selectedQuizOption) return;
        const isCorrect = selectedQuizOption.textContent === quizQuestions[currentQuizIndex].correctAnswer;
        if (!isCorrect) {
            tg.showAlert('ভুল উত্তর! অনুগ্রহ করে সঠিক উত্তরটি নির্বাচন করুন।');
            return;
        }

        quizScreenElements.nextBtn.disabled = true;
        const currentStep = userData.quizProgress?.currentStep || 0;
        const isClickTask = currentStep === quizConfig.clickTarget - 1;

        tg.HapticFeedback.impactOccurred('light');

        if (isClickTask) {
            adClicked = false;
            const handleVisibilityChange = () => {
                if (document.visibilityState === 'hidden') {
                    adClicked = true;
                    document.removeEventListener('visibilitychange', handleVisibilityChange);
                }
            };
            document.addEventListener('visibilitychange', handleVisibilityChange);

            tg.showPopup({ title: 'গুরুত্বপূর্ণ নির্দেশনা', message: 'পুরস্কার পেতে, অনুগ্রহ করে পরবর্তী বিজ্ঞাপনে ক্লিক করুন এবং কমপক্ষে ৩০ সেকেন্ড অপেক্ষা করুন। ক্লিক না করলে ব্যালেন্স যোগ হবে না।', buttons: [{ type: 'ok', text: 'ঠিক আছে' }] });
            
            window.showGiga().then(() => {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                if (adClicked) {
                    tg.HapticFeedback.notificationOccurred('success');
                    userRef.update({
                        balance: firebase.firestore.FieldValue.increment(quizConfig.reward),
                        'quizProgress.completedToday': firebase.firestore.FieldValue.increment(1),
                        'quizProgress.currentStep': 0
                    }).then(() => {
                        if(userData.quizProgress) {
                            userData.quizProgress.completedToday++;
                            userData.quizProgress.currentStep = 0;
                        }
                        tg.showAlert(`অভিনন্দন! কুইজ সম্পন্ন করে ৳ ${quizConfig.reward.toFixed(2)} পেয়েছেন।`);
                        showScreen('home-screen');
                    });
                } else {
                    tg.HapticFeedback.notificationOccurred('error');
                    tg.showAlert("পুরস্কার পেতে বিজ্ঞাপনে ক্লিক করা আবশ্যক ছিল। আপনি ক্লিক করেননি।");
                    quizScreenElements.nextBtn.disabled = false;
                }
            }).catch(e => {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে।", e);
                quizScreenElements.nextBtn.disabled = false;
            });

        } else {
            window.showGiga().then(() => {
                tg.HapticFeedback.notificationOccurred('success');
                userRef.update({ 'quizProgress.currentStep': firebase.firestore.FieldValue.increment(1) })
                    .then(() => {
                        if(userData.quizProgress) {
                            userData.quizProgress.currentStep++;
                        }
                        currentQuizIndex++;
                        displayCurrentQuiz();
                    });
            }).catch(e => {
                handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে।", e);
                quizScreenElements.nextBtn.disabled = false;
            });
        }
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
        const randomExtraRotation = Math.floor(Math.random() * 360);
        const totalRotation = currentRotation + (360 * 5) + randomExtraRotation;
        spinScreenElements.wheelGroup.style.transform = `rotate(${totalRotation}deg)`;
        currentRotation = totalRotation;
        setTimeout(spinFinished, 5000);
    }

    function spinFinished() {
        tg.HapticFeedback.impactOccurred('light');
        window.showGiga().then(() => {
            tg.HapticFeedback.notificationOccurred('success');
            const today = new Date().toISOString().slice(0, 10);
            userRef.update({
                balance: firebase.firestore.FieldValue.increment(spinConfig.rewardAmount),
                'spinsToday.date': today,
                'spinsToday.count': firebase.firestore.FieldValue.increment(1)
            }).then(() => {
                tg.showAlert(`অভিনন্দন! স্পিন থেকে ৳ ${spinConfig.rewardAmount.toFixed(2)} পেয়েছেন।`);
            });
        }).catch(e => handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে।", e)).finally(() => {
            isSpinning = false;
            spinScreenElements.triggerBtn.disabled = false;
            const finalRotation = currentRotation % 360;
            spinScreenElements.wheelGroup.style.transition = 'none';
            spinScreenElements.wheelGroup.style.transform = `rotate(${finalRotation}deg)`;
            currentRotation = finalRotation;
            setTimeout(() => {
                spinScreenElements.wheelGroup.style.transition = 'transform 5s cubic-bezier(0.25, 0.1, 0.25, 1)';
            }, 50);
        });
    }

    function handleDailyCheckin() {
        const today = new Date().toISOString().slice(0, 10);
        if (userData.lastCheckin === today) {
            tg.showAlert("আপনি আজকের বোনাস ইতোমধ্যে সংগ্রহ করেছেন।");
            return;
        }
        this.disabled = true;
        tg.HapticFeedback.impactOccurred('light');
        window.showGiga().then(() => {
            tg.HapticFeedback.notificationOccurred('success');
            userRef.update({
                balance: firebase.firestore.FieldValue.increment(appConfig.dailyReward),
                lastCheckin: today
            }).then(() => {
                tg.showAlert(`অভিনন্দন! Daily Check বোনাস হিসেবে ৳ ${appConfig.dailyReward.toFixed(2)} পেয়েছেন।`);
            });
        }).catch(e => handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে।", e)).finally(() => {
            this.disabled = false;
        });
    }

    function handleSubmitWithdraw() {
        const selectedMethodName = walletElements.methodSelector.value;
        const selectedMethod = paymentMethods.find(m => m.name === selectedMethodName);

        if (!selectedMethod) {
            tg.showAlert("অনুগ্রহ করে একটি পেমেন্ট মেথড বেছে নিন।");
            return;
        }

        const paymentNumber = walletElements.numberInput.value.trim();
        if (paymentNumber.length < 11 || !/^\d+$/.test(paymentNumber)) {
            tg.showAlert(`অনুগ্রহ করে একটি সঠিক ${selectedMethod.name} নম্বর দিন।`);
            return;
        }
        if ((userData.balance || 0) < selectedMethod.minWithdraw) {
            tg.showAlert(`ন্যূনতম ৳${selectedMethod.minWithdraw.toFixed(2)} প্রয়োজন।`);
            return;
        }
        
        this.disabled = true;
        const amountToWithdraw = userData.balance;
        db.collection('withdrawals').add({
            userId: currentUser.id.toString(),
            username: currentUser.username || '',
            amount: amountToWithdraw,
            method: selectedMethod.name,
            accountNumber: paymentNumber,
            status: 'pending',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            userRef.update({ balance: 0 }).then(() => {
                tg.showAlert("আপনার উইথড্র অনুরোধ সফলভাবে জমা হয়েছে।");
                showScreen('home-screen');
            });
        }).catch(e => handleError("উইথড্র অনুরোধে সমস্যা হয়েছে।", e)).finally(() => {
            this.disabled = false;
            walletElements.numberInput.value = '';
        });
    }

    function handleShareReferral() {
        const link = referElements.linkInput.value;
        const text = `এখানে প্রতিদিন আয় করুন! আমার রেফারেল লিংক দিয়ে জয়েন করুন: ${link}`;
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
    }

    function handleError(message, error) {
        if (error) {
            console.error("Error:", error);
        }
        if (typeof message === 'string') {
            tg.showAlert(message);
        } else {
            console.error("Snapshot Error:", message);
            tg.showAlert("একটি অপ্রত্যাশিত সমস্যা হয়েছে।");
        }
    }
});
