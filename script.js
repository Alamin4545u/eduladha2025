document.addEventListener('DOMContentLoaded', function() {
    // --- Firebase & Telegram Setup ---
    const firebaseConfig = { apiKey: "AIzaSyDW4TSXHbpP92hyeLvuBdSdVu56xKayTd8", authDomain: "test-dc90d.firebaseapp.com", databaseURL: "https://test-dc90d-default-rtdb.firebaseio.com", projectId: "test-dc90d", storageBucket: "test-dc90d.appspot.com", messagingSenderId: "804710782593", appId: "1:804710782593:web:48921608aad6d348afdf80", measurementId: "G-29YGNDZ2J4" };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const tg = window.Telegram.WebApp;

    // --- Constants & Global Variables ---
    const BOT_USERNAME = "Bkash_earn_free_TkBot";
    const MINIMUM_WITHDRAW_AMOUNT = 10;
    let appConfig = { dailyReward: 1, referralBonus: 5 };
    let spinConfig = { dailyLimit: 5, rewardAmount: 1 };
    let quizConfig = { dailyLimit: 3, reward: 2, clickTarget: 2 };
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
    const walletElements = { balance: document.getElementById('withdrawBalance'), bkashNumber: document.getElementById('bkashNumber'), submitBtn: document.getElementById('submitWithdrawBtn') };
    const referElements = { linkInput: document.getElementById('referralLink'), shareBtn: document.getElementById('shareReferralBtn'), notice: document.getElementById('referral-notice') };
    const taskListContainer = document.getElementById('task-list');
    const quizScreenElements = { backBtn: document.getElementById('quizBackBtn'), progressText: document.getElementById('quiz-progress-text'), stepText: document.getElementById('quiz-step-text'), progressInner: document.getElementById('quiz-progress-inner'), instruction: document.getElementById('quiz-instruction'), questionText: document.getElementById('quiz-question-text'), optionsContainer: document.getElementById('quiz-options-container'), nextBtn: document.getElementById('next-quiz-btn') };

    // --- Main Logic ---
    tg.ready();
    tg.expand();
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        currentUser = tg.initDataUnsafe.user;
        userRef = db.collection('users').doc(currentUser.id.toString());
        fetchAdminSettings();
        fetchUserData();
        setupEventListeners();
        createSvgWheel();
    } else { document.body.innerHTML = "<h1>অনুগ্রহ করে টেলিগ্রাম অ্যাপ থেকে খুলুন।</h1>"; }

    function createSvgWheel() {
        const wheelGroup = spinScreenElements.wheelGroup; if (!wheelGroup) return; wheelGroup.innerHTML = ''; const numSegments = 10; const angle = 360 / numSegments; const colors = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#d81b60', '#00acc1', '#fb8c00', '#5e35b1', '#6d4c41']; const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => { const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0; return { x: centerX + (radius * Math.cos(angleInRadians)), y: centerY + (radius * Math.sin(angleInRadians)) }; }; for (let i = 0; i < numSegments; i++) { const startAngle = i * angle; const endAngle = startAngle + angle; const start = polarToCartesian(250, 250, 210, endAngle); const end = polarToCartesian(250, 250, 210, startAngle); const pathData = `M 250 250 L ${start.x} ${start.y} A 210 210 0 0 0 ${end.x} ${end.y} z`; const path = document.createElementNS("http://www.w3.org/2000/svg", "path"); path.setAttribute("d", pathData); path.setAttribute("fill", colors[i]); path.setAttribute("stroke", "#8d6e63"); path.setAttribute("stroke-width", "4"); wheelGroup.appendChild(path); } for (let i = 0; i < numSegments; i++) { const sparkleAngle = (i * angle) + (angle / 2); const sparklePos = polarToCartesian(250, 250, 180, sparkleAngle); const sparkle = document.createElementNS("http://www.w3.org/2000/svg", "circle"); sparkle.setAttribute("cx", sparklePos.x); sparkle.setAttribute("cy", sparklePos.y); sparkle.setAttribute("r", "5"); sparkle.setAttribute("fill", "white"); sparkle.setAttribute("filter", "url(#glow)"); wheelGroup.appendChild(sparkle); }
    }

    async function fetchAdminSettings() {
        try {
            const appConfigDoc = await db.collection('settings').doc('appConfig').get(); if (appConfigDoc.exists) appConfig = appConfigDoc.data();
            const spinConfigDoc = await db.collection('settings').doc('spinConfig').get(); if (spinConfigDoc.exists) spinConfig = spinConfigDoc.data();
            const quizConfigDoc = await db.collection('settings').doc('quizConfig').get(); if (quizConfigDoc.exists) quizConfig = quizConfigDoc.data();
        } catch (error) { console.error("Error fetching settings:", error); }
    }

    function fetchUserData() {
        userRef.onSnapshot((doc) => {
            const today = new Date().toISOString().slice(0, 10);
            if (doc.exists) {
                userData = doc.data();
                if (!userData.spinsToday || userData.spinsToday.date !== today) { userData.spinsToday = { date: today, count: 0 }; userRef.update({ 'spinsToday': userData.spinsToday }); }
                if (!userData.completedTasks) userData.completedTasks = [];
                if (!userData.quizProgress || userData.quizProgress.date !== today) { userData.quizProgress = { date: today, completedToday: 0, currentStep: 0 }; userRef.update({ 'quizProgress': userData.quizProgress }); }
            } else {
                const referrerId = tg.initDataUnsafe.start_param;
                const newUser = { username: currentUser.username || '', fullName: `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim(), balance: 0, lastCheckin: null, spinsToday: { date: today, count: 0 }, completedTasks: [], quizProgress: { date: today, completedToday: 0, currentStep: 0 }, referredBy: referrerId || null, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
                userRef.set(newUser).then(() => { userData = newUser; if (referrerId) { handleReferralBonus(referrerId); } });
            }
            updateUI();
        }, (error) => handleError("Failed to fetch user data.", error));
    }

    function handleReferralBonus(referrerId) { const referrerRef = db.collection('users').doc(referrerId); db.runTransaction((transaction) => { return transaction.get(referrerRef).then((doc) => { if (doc.exists) { transaction.update(referrerRef, { balance: firebase.firestore.FieldValue.increment(appConfig.referralBonus || 0) }); } }); }).catch(err => console.error("Referral bonus error:", err)); }
    function getInitials(fullName) { if (!fullName) return ''; const names = fullName.split(' '); const firstInitial = names[0] ? names[0][0] : ''; const lastInitial = names.length > 1 ? names[names.length - 1][0] : ''; return `${firstInitial}${lastInitial}`.toUpperCase(); }

    function updateUI() {
        const balance = userData.balance || 0; const fullName = userData.fullName || currentUser.first_name; const username = userData.username || currentUser.id; const formattedBalance = `৳ ${balance.toFixed(2)}`; headerElements.balance.innerText = formattedBalance; headerElements.fullName.innerText = fullName; headerElements.username.innerText = username ? `@${username}` : `#${currentUser.id}`; headerElements.pic.innerText = getInitials(fullName); walletElements.balance.innerText = formattedBalance; walletElements.submitBtn.disabled = balance < MINIMUM_WITHDRAW_AMOUNT; walletElements.submitBtn.innerText = balance < MINIMUM_WITHDRAW_AMOUNT ? `ন্যূনতম ৳${MINIMUM_WITHDRAW_AMOUNT} প্রয়োজন` : "উইথড্র সাবমিট করুন";
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

    async function loadAndDisplayTasks() { /* ... এই ফাংশনটি অপরিবর্তিত ... */ }
    function handleTaskClick(e) { /* ... এই ফাংশনটি অপরিবর্তিত ... */ }

    async function startQuiz() {
        try {
            const doc = await userRef.get(); if (!doc.exists) { handleError("ব্যবহারকারীর তথ্য পাওয়া যায়নি।"); return; }
            const freshUserData = doc.data(); const today = new Date().toISOString().slice(0, 10);
            let currentQuizProgress = freshUserData.quizProgress;
            if (!currentQuizProgress || currentQuizProgress.date !== today) { currentQuizProgress = { date: today, completedToday: 0, currentStep: 0 }; await userRef.update({ quizProgress: currentQuizProgress }); }
            userData.quizProgress = currentQuizProgress;
            if (currentQuizProgress.completedToday >= quizConfig.dailyLimit) { tg.showAlert(`আপনি আজকের জন্য আপনার সব কুইজ সম্পন্ন করেছেন।`); return; }
            showScreen('quiz-screen');
            quizScreenElements.questionText.textContent = 'প্রশ্ন লোড হচ্ছে...';
            quizScreenElements.optionsContainer.innerHTML = '';
            const snapshot = await db.collection('quizzes').get();
            quizQuestions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            if (quizQuestions.length === 0) { handleError('কোনো কুইজ পাওয়া যায়নি।'); return; }
            quizQuestions.sort(() => 0.5 - Math.random());
            currentQuizIndex = 0;
            displayCurrentQuiz();
        } catch (error) { handleError('কুইজ শুরু করতে একটি অপ্রত্যাশিত সমস্যা হয়েছে।', error); }
    }

    function displayCurrentQuiz() { /* ... এই ফাংশনটি অপরিবর্তিত ... */ }
    function handleOptionSelect(e) { /* ... এই ফাংশনটি অপরিবর্তিত ... */ }
    
    // =======================================================
    // === এই ফাংশনটি সম্পূর্ণরূপে আপডেট করা হয়েছে (Function Fully Updated) ===
    // =======================================================
    function handleNextQuiz() {
        if (!selectedQuizOption) return;
        const isCorrect = selectedQuizOption.textContent === quizQuestions[currentQuizIndex].correctAnswer;
        if (!isCorrect) { tg.showAlert('ভুল উত্তর! অনুগ্রহ করে সঠিক উত্তরটি নির্বাচন করুন।'); return; }

        quizScreenElements.nextBtn.disabled = true;
        const currentStep = userData.quizProgress?.currentStep || 0;
        const isClickTask = currentStep === quizConfig.clickTarget - 1;

        tg.HapticFeedback.impactOccurred('light');

        if (isClickTask) {
            adClicked = false;
            const handleVisibilityChange = () => {
                if (document.visibilityState === 'hidden') {
                    adClicked = true;
                    // একবার ক্লিক শনাক্ত হয়ে গেলে, লিসেনারটি সরিয়ে ফেলা নিরাপদ
                    document.removeEventListener('visibilitychange', handleVisibilityChange);
                }
            };
            document.addEventListener('visibilitychange', handleVisibilityChange);

            tg.showPopup({ title: 'গুরুত্বপূর্ণ নির্দেশনা', message: 'পুরস্কার পেতে, অনুগ্রহ করে পরবর্তী বিজ্ঞাপনে ক্লিক করুন এবং কমপক্ষে ৩০ সেকেন্ড অপেক্ষা করুন। ক্লিক না করলে ব্যালেন্স যোগ হবে না।', buttons: [{ type: 'ok', text: 'ঠিক আছে' }] });
            
            // বিজ্ঞাপন দেখানোর জন্য Promise ব্যবহার করা হচ্ছে
            const adPromise = new Promise((resolve, reject) => {
                window.showGiga()
                    .then(() => resolve())
                    .catch((err) => reject(err));
            });

            adPromise.then(() => {
                // বিজ্ঞাপন বন্ধ হওয়ার পর এই কোডটি চলবে
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                if (adClicked) {
                    tg.HapticFeedback.notificationOccurred('success');
                    userRef.update({
                        balance: firebase.firestore.FieldValue.increment(quizConfig.reward),
                        'quizProgress.completedToday': firebase.firestore.FieldValue.increment(1),
                        'quizProgress.currentStep': 0
                    }).then(() => {
                        if(userData.quizProgress) { userData.quizProgress.completedToday++; userData.quizProgress.currentStep = 0; }
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
            // সাধারণ ধাপ
            window.showGiga().then(() => {
                tg.HapticFeedback.notificationOccurred('success');
                userRef.update({ 'quizProgress.currentStep': firebase.firestore.FieldValue.increment(1) })
                    .then(() => {
                        if(userData.quizProgress) { userData.quizProgress.currentStep++; }
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
        if (isSpinning) return; const spinsLeftCount = spinConfig.dailyLimit - (userData.spinsToday?.count || 0); if (spinsLeftCount <= 0) { tg.showAlert("আপনার আজকের জন্য আর কোনো স্পিন বাকি নেই।"); return; } isSpinning = true; spinScreenElements.triggerBtn.disabled = true; const randomExtraRotation = Math.floor(Math.random() * 360); const totalRotation = currentRotation + (360 * 5) + randomExtraRotation; spinScreenElements.wheelGroup.style.transform = `rotate(${totalRotation}deg)`; currentRotation = totalRotation; setTimeout(spinFinished, 5000);
    }

    function spinFinished() {
        tg.HapticFeedback.impactOccurred('light'); window.showGiga().then(() => { tg.HapticFeedback.notificationOccurred('success'); const today = new Date().toISOString().slice(0, 10); userRef.update({ balance: firebase.firestore.FieldValue.increment(spinConfig.rewardAmount), 'spinsToday.date': today, 'spinsToday.count': firebase.firestore.FieldValue.increment(1) }).then(() => { tg.showAlert(`অভিনন্দন! স্পিন থেকে ৳ ${spinConfig.rewardAmount.toFixed(2)} পেয়েছেন।`); }); }).catch(e => handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে।", e)).finally(() => { isSpinning = false; spinScreenElements.triggerBtn.disabled = false; const finalRotation = currentRotation % 360; spinScreenElements.wheelGroup.style.transition = 'none'; spinScreenElements.wheelGroup.style.transform = `rotate(${finalRotation}deg)`; currentRotation = finalRotation; setTimeout(() => { spinScreenElements.wheelGroup.style.transition = 'transform 5s cubic-bezier(0.25, 0.1, 0.25, 1)'; }, 50); });
    }

    function handleDailyCheckin() {
        const today = new Date().toISOString().slice(0, 10); if (userData.lastCheckin === today) { tg.showAlert("আপনি আজকের বোনাস ইতোমধ্যে সংগ্রহ করেছেন।"); return; } this.disabled = true; tg.HapticFeedback.impactOccurred('light'); window.showGiga().then(() => { tg.HapticFeedback.notificationOccurred('success'); userRef.update({ balance: firebase.firestore.FieldValue.increment(appConfig.dailyReward), lastCheckin: today }).then(() => { tg.showAlert(`অভিনন্দন! Daily Check বোনাস হিসেবে ৳ ${appConfig.dailyReward.toFixed(2)} পেয়েছেন।`); }); }).catch(e => handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে।", e)).finally(() => { this.disabled = false; });
    }

    function handleSubmitWithdraw() {
        const bkashNumber = walletElements.bkashNumber.value.trim(); if (bkashNumber.length < 11 || !/^\d+$/.test(bkashNumber)) { tg.showAlert("অনুগ্রহ করে একটি সঠিক বিকাশ নম্বর দিন।"); return; } if ((userData.balance || 0) < MINIMUM_WITHDRAW_AMOUNT) { tg.showAlert(`ন্যূনতম ৳${MINIMUM_WITHDRAW_AMOUNT} প্রয়োজন।`); return; } this.disabled = true; const amountToWithdraw = userData.balance; db.collection('withdrawals').add({ userId: currentUser.id.toString(), username: currentUser.username || '', amount: amountToWithdraw, bkashNumber: bkashNumber, status: 'pending', timestamp: firebase.firestore.FieldValue.serverTimestamp() }).then(() => { userRef.update({ balance: 0 }).then(() => { tg.showAlert("আপনার উইথড্র অনুরোধ সফলভাবে জমা হয়েছে।"); showScreen('home-screen'); }); }).catch(e => handleError("উইথড্র অনুরোধে সমস্যা হয়েছে।", e)).finally(() => { this.disabled = false; walletElements.bkashNumber.value = ''; });
    }

    function handleShareReferral() {
        const link = referElements.linkInput.value; const text = `এখানে প্রতিদিন আয় করুন! আমার রেফারেল লিংক দিয়ে জয়েন করুন: ${link}`; tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
    }

    function handleError(message, error) {
        if (error) { console.error("Error:", error); } if (typeof message === 'string') { tg.showAlert(message); } else { console.error("Snapshot Error:", message); tg.showAlert("একটি অপ্রত্যাশিত সমস্যা হয়েছে।"); }
    }
});
