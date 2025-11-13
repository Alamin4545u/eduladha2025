document.addEventListener('DOMContentLoaded', function() {
    // --- Firebase Configuration ---
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

    // --- Constants ---
    const DAILY_REWARD = 1;
    const MINIMUM_WITHDRAW_AMOUNT = 10;
    const BOT_USERNAME = "Bkash_earn_free_TkBot"; // আপনার দেওয়া বট ইউজারনেম

    // --- UI Elements ---
    const screens = document.querySelectorAll('.screen');
    const navButtons = document.querySelectorAll('.nav-btn');
    const headerElements = { pic: document.getElementById('profilePic'), fullName: document.getElementById('headerFullName'), username: document.getElementById('headerUsername'), balance: document.getElementById('headerBalance'), };
    const dailyCheckinBtn = document.getElementById('dailyCheckinBtn');
    const walletElements = { balance: document.getElementById('withdrawBalance'), bkashNumber: document.getElementById('bkashNumber'), submitBtn: document.getElementById('submitWithdrawBtn'), };
    const referElements = { linkInput: document.getElementById('referralLink'), shareBtn: document.getElementById('shareReferralBtn'), };

    let currentUser = null;
    let userRef = null;
    let userData = {};

    // --- Main Logic ---
    tg.ready();
    tg.expand();

    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        currentUser = tg.initDataUnsafe.user;
        userRef = db.collection('users').doc(currentUser.id.toString());
        fetchUserData();
        setupEventListeners();
    } else {
        document.body.innerHTML = "<h1>অনুগ্রহ করে টেলিগ্রাম অ্যাপ থেকে খুলুন।</h1>";
    }

    // --- Functions ---
    function fetchUserData() {
        userRef.onSnapshot((doc) => {
            if (doc.exists) {
                userData = doc.data();
            } else {
                const newUser = {
                    username: currentUser.username || '',
                    fullName: `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim(),
                    balance: 0,
                    lastCheckin: null
                };
                userRef.set(newUser);
                userData = newUser;
            }
            updateUI();
        }, handleError);
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

        // Header
        headerElements.balance.innerText = formattedBalance;
        headerElements.fullName.innerText = fullName;
        headerElements.username.innerText = username ? `@${username}` : `#${currentUser.id}`;
        headerElements.pic.innerText = getInitials(fullName);

        // Wallet Screen
        walletElements.balance.innerText = formattedBalance;
        walletElements.submitBtn.disabled = balance < MINIMUM_WITHDRAW_AMOUNT;
        walletElements.submitBtn.innerText = balance < MINIMUM_WITHDRAW_AMOUNT ? `ন্যূনতম ৳${MINIMUM_WITHDRAW_AMOUNT} প্রয়োজন` : "উইথড্র সাবমিট করুন";
        
        // Referral Link
        referElements.linkInput.value = `https://t.me/${BOT_USERNAME}?start=${currentUser.id}`;
    }

    function setupEventListeners() {
        navButtons.forEach(btn => btn.addEventListener('click', () => showScreen(btn.dataset.screen)));
        dailyCheckinBtn.addEventListener('click', handleDailyCheckin);
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
                tg.showAlert(`অভিনন্দন! ডেইলি চেক বোনাস হিসেবে ৳ ${DAILY_REWARD.toFixed(2)} পেয়েছেন।`);
            });
        }).catch(e => {
            handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।", e);
        }).finally(() => {
            this.disabled = false;
        });
    }
    
    function handleSubmitWithdraw() {
        const bkashNumber = walletElements.bkashNumber.value.trim();
        if (bkashNumber.length < 11 || !/^\d+$/.test(bkashNumber)) {
            tg.showAlert("অনুগ্রহ করে একটি সঠিক বিকাশ নম্বর দিন।");
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
        }).catch(handleError).finally(() => { this.disabled = false; walletElements.bkashNumber.value = ''; });
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
        }
    }
});
