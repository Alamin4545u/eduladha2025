document.addEventListener('DOMContentLoaded', function() {
    // --- Firebase & Telegram Setup ---
    const firebaseConfig = {
        apiKey: "AIzaSyDW4TSXHbpP92hyeLvuBdSdVu56xKayTd8",
        authDomain: "test-dc90d.firebaseapp.com",
        databaseURL: "https://test-dc90d-default-rtdb.firebaseio.com",
        projectId: "test-dc90d",
        storageBucket: "test-dc90d.appspot.com",
        messagingSenderId: "804710782593",
        appId: "1:804710782593:web:48921608aad6d348afdf80",
        measurementId: "G-29YGNDZ2J4"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const tg = window.Telegram.WebApp;

    // --- Constants & Global Variables ---
    const BOT_USERNAME = "Bkash_earn_free_TkBot";
    const MINIMUM_WITHDRAW_AMOUNT = 10;
    const DAILY_REWARD = 1;

    let spinConfig = { dailyLimit: 5, rewardAmount: 1 }; // Default values
    let theWheel, currentUser, userRef, userData = {};
    let isSpinning = false;

    // --- UI Elements ---
    const screens = document.querySelectorAll('.screen');
    const navButtons = document.querySelectorAll('.nav-btn');
    const headerElements = { pic: document.getElementById('profilePic'), fullName: document.getElementById('headerFullName'), username: document.getElementById('headerUsername'), balance: document.getElementById('headerBalance') };
    const homeButtons = { dailyCheckin: document.getElementById('dailyCheckinBtn'), spin: document.getElementById('spinWheelBtn') };
    const spinScreenElements = { backBtn: document.getElementById('spinBackBtn'), triggerBtn: document.getElementById('spinTriggerBtn'), spinsLeft: document.getElementById('spinsLeft') };
    const walletElements = { balance: document.getElementById('withdrawBalance'), bkashNumber: document.getElementById('bkashNumber'), submitBtn: document.getElementById('submitWithdrawBtn') };
    const referElements = { linkInput: document.getElementById('referralLink'), shareBtn: document.getElementById('shareReferralBtn') };

    // --- Main Logic ---
    tg.ready();
    tg.expand();

    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        currentUser = tg.initDataUnsafe.user;
        userRef = db.collection('users').doc(currentUser.id.toString());
        fetchAdminSettings();
        fetchUserData();
        setupEventListeners();
        initializeSpinWheel();
    } else {
        document.body.innerHTML = "<h1>অনুগ্রহ করে টেলিগ্রাম অ্যাপ থেকে খুলুন।</h1>";
    }

    // --- Functions ---
    function fetchAdminSettings() {
        db.collection('settings').doc('spinConfig').get().then(doc => {
            if (doc.exists) {
                spinConfig = doc.data();
            } else {
                console.warn("Spin configuration not found in Firestore. Using default values.");
            }
        }).catch(e => console.error("Could not fetch admin settings:", e));
    }

    function fetchUserData() {
        userRef.onSnapshot((doc) => {
            const today = new Date().toISOString().slice(0, 10);
            if (doc.exists) {
                userData = doc.data();
                if (!userData.spinsToday || userData.spinsToday.date !== today) {
                    userData.spinsToday = { date: today, count: 0 };
                }
            } else {
                const newUser = {
                    username: currentUser.username || '',
                    fullName: `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim(),
                    balance: 0,
                    lastCheckin: null,
                    spinsToday: { date: today, count: 0 }
                };
                userRef.set(newUser).then(() => {
                    userData = newUser;
                });
            }
            updateUI();
        }, (error) => handleError("Failed to fetch user data.", error));
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
        walletElements.submitBtn.disabled = balance < MINIMUM_WITHDRAW_AMOUNT;
        walletElements.submitBtn.innerText = balance < MINIMUM_WITHDRAW_AMOUNT ? `ন্যূনতম ৳${MINIMUM_WITHDRAW_AMOUNT} প্রয়োজন` : "উইথড্র সাবমিট করুন";
        referElements.linkInput.value = `https://t.me/${BOT_USERNAME}?start=${currentUser.id}`;
        const spinsLeftCount = spinConfig.dailyLimit - (userData.spinsToday?.count || 0);
        spinScreenElements.spinsLeft.innerText = spinsLeftCount > 0 ? spinsLeftCount : 0;
    }

    function setupEventListeners() {
        navButtons.forEach(btn => btn.addEventListener('click', (e) => {
            e.preventDefault();
            showScreen(btn.dataset.screen);
        }));
        homeButtons.dailyCheckin.addEventListener('click', handleDailyCheckin);
        homeButtons.spin.addEventListener('click', () => showScreen('spin-screen'));
        spinScreenElements.backBtn.addEventListener('click', () => showScreen('home-screen'));
        spinScreenElements.triggerBtn.addEventListener('click', handleSpin);
        walletElements.submitBtn.addEventListener('click', handleSubmitWithdraw);
        referElements.shareBtn.addEventListener('click', handleShareReferral);
    }
    
    function showScreen(screenId) {
        screens.forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.screen === screenId);
        });
    }

    function initializeSpinWheel() {
        if (typeof Winwheel === 'undefined') {
            console.error("Winwheel library is not loaded.");
            return;
        }
        theWheel = new Winwheel({
            'numSegments': 8,
            'outerRadius': 145,
            'innerRadius': 40,
            'textFontSize': 16,
            'segments': [
                {'fillStyle' : '#26c6da', 'text': 'Try'}, {'fillStyle' : '#ff7043', 'text': 'Again'}, 
                {'fillStyle' : '#7e57c2', 'text': 'Spin'}, {'fillStyle' : '#FFEE58', 'text': 'More'},
                {'fillStyle' : '#9ccc65', 'text': 'Win'}, {'fillStyle' : '#ec407a', 'text': 'Now'}, 
                {'fillStyle' : '#5c6bc0', 'text': 'Play'}, {'fillStyle' : '#29b6f6', 'text': 'Daily'}
            ],
            'animation': { 'type': 'spinToStop', 'duration': 5, 'spins': 8, 'callbackFinished': spinFinished }
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
        theWheel.startAnimation();
    }
    
    function spinFinished(indicatedSegment) {
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
        }).catch(e => {
            handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।", e);
        }).finally(() => {
            isSpinning = false;
            spinScreenElements.triggerBtn.disabled = false;
            theWheel.stopAnimation(false);
            theWheel.rotationAngle = 0;
            theWheel.draw();
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
                balance: firebase.firestore.FieldValue.increment(DAILY_REWARD),
                lastCheckin: today
            }).then(() => {
                tg.showAlert(`অভিনন্দন! Daily Check বোনাস হিসেবে ৳ ${DAILY_REWARD.toFixed(2)} পেয়েছেন।`);
            });
        }).catch(e => {
            handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।", e);
        }).finally(() => { this.disabled = false; });
    }
    
    function handleSubmitWithdraw() {
        const bkashNumber = walletElements.bkashNumber.value.trim();
        if (bkashNumber.length < 11 || !/^\d+$/.test(bkashNumber)) {
            tg.showAlert("অনুগ্রহ করে একটি সঠিক বিকাশ নম্বর দিন।");
            return;
        }
        if (userData.balance < MINIMUM_WITHDRAW_AMOUNT) {
            tg.showAlert(`ন্যূনতম ৳${MINIMUM_WITHDRAW_AMOUNT} প্রয়োজন।`);
            return;
        }
        this.disabled = true;
        const amountToWithdraw = userData.balance;
        db.collection('withdrawals').add({
            userId: currentUser.id.toString(), username: currentUser.username || '', amount: amountToWithdraw, bkashNumber: bkashNumber, status: 'pending', timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            userRef.update({ balance: 0 }).then(() => {
                tg.showAlert("আপনার উইথড্র অনুরোধ সফলভাবে জমা হয়েছে।");
                showScreen('home-screen');
            });
        }).catch(e => handleError("উইথড্র অনুরোধে সমস্যা হয়েছে।", e)).finally(() => { 
            this.disabled = false; 
            walletElements.bkashNumber.value = ''; 
        });
    }

    function handleShareReferral() {
        const link = referElements.linkInput.value;
        const text = `এখানে প্রতিদিন আয় করুন! আমার রেফারেল লিংক দিয়ে জয়েন করুন: ${link}`;
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
    }

    function handleError(message, error) {
        if (error) console.error("Error:", error);
        if (typeof message === 'string') {
            tg.showAlert(message);
        } else {
            console.error("Snapshot Error:", message);
            tg.showAlert("একটি অপ্রত্যাশিত সমস্যা হয়েছে।");
        }
    }
});
