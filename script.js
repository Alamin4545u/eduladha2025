document.addEventListener('DOMContentLoaded', function() {
    // --- Firebase Configuration (Provided by you) ---
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

    // --- UI Elements ---
    const screens = { home: document.getElementById('home-screen'), withdraw: document.getElementById('withdraw-screen') };
    
    // Header elements
    const profilePicElement = document.getElementById('profilePic');
    const headerFullNameElement = document.getElementById('headerFullName');
    const headerUsernameElement = document.getElementById('headerUsername');
    const headerBalanceElement = document.getElementById('headerBalance');

    // Home screen elements
    const dailyCheckinBtn = document.getElementById('dailyCheckinBtn');
    const goToWithdrawBtn = document.getElementById('goToWithdrawBtn');

    // Withdraw screen elements
    const withdrawBalanceElement = document.getElementById('withdrawBalance');
    const bkashNumberInput = document.getElementById('bkashNumber');
    const submitWithdrawBtn = document.getElementById('submitWithdrawBtn');
    const backBtn = document.getElementById('backBtn');
    
    let currentUser = null;
    let userRef = null;
    let userData = {};

    // --- Main Logic ---
    tg.ready();
    tg.expand();

    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        currentUser = tg.initDataUnsafe.user;
        const userId = currentUser.id.toString();
        userRef = db.collection('users').doc(userId);

        fetchUserData();
        setupEventListeners();
    } else {
        document.body.innerHTML = "<h1>অনুগ্রহ করে টেলিগ্রাম অ্যাপ থেকে খুলুন।</h1>";
    }

    // --- Functions ---
    function fetchUserData() {
        userRef.get().then((doc) => {
            if (doc.exists) {
                userData = doc.data();
            } else {
                // Create new user data
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
        }).catch(handleError);
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
        
        // Update header
        headerBalanceElement.innerText = formattedBalance;
        headerFullNameElement.innerText = fullName;
        headerUsernameElement.innerText = username ? `@${username}` : `#${currentUser.id}`;
        profilePicElement.innerText = getInitials(fullName);
        
        // Update withdraw screen balance
        withdrawBalanceElement.innerText = formattedBalance;
        
        if (balance < MINIMUM_WITHDRAW_AMOUNT) {
            submitWithdrawBtn.disabled = true;
            submitWithdrawBtn.innerText = `ন্যূনতম ৳${MINIMUM_WITHDRAW_AMOUNT} প্রয়োজন`;
        } else {
            submitWithdrawBtn.disabled = false;
            submitWithdrawBtn.innerText = "সাবমিট করুন";
        }
    }

    function setupEventListeners() {
        dailyCheckinBtn.addEventListener('click', handleDailyCheckin);
        goToWithdrawBtn.addEventListener('click', () => showScreen('withdraw'));
        backBtn.addEventListener('click', () => showScreen('home'));
        submitWithdrawBtn.addEventListener('click', handleSubmitWithdraw);
    }

    function handleDailyCheckin() {
        dailyCheckinBtn.disabled = true;
        const today = new Date().toISOString().slice(0, 10); // Get date as YYYY-MM-DD

        if (userData.lastCheckin === today) {
            tg.showAlert("আপনি আজকের বোনাস ইতোমধ্যে সংগ্রহ করেছেন।");
            dailyCheckinBtn.disabled = false;
            return;
        }

        userRef.update({
            balance: firebase.firestore.FieldValue.increment(DAILY_REWARD),
            lastCheckin: today
        }).then(() => {
            userData.balance += DAILY_REWARD;
            userData.lastCheckin = today;
            updateUI();
            tg.HapticFeedback.notificationOccurred('success');
            tg.showAlert(`অভিনন্দন! আপনি ডেইলি চেকিং বোনাস হিসেবে ৳ ${DAILY_REWARD.toFixed(2)} পেয়েছেন।`);
            dailyCheckinBtn.disabled = false;
        }).catch(handleError);
    }

    function handleSubmitWithdraw() {
        const bkashNumber = bkashNumberInput.value.trim();
        if (bkashNumber.length < 11 || !/^\d+$/.test(bkashNumber)) {
            tg.showAlert("অনুগ্রহ করে একটি সঠিক বিকাশ নম্বর দিন।");
            return;
        }
        if (userData.balance < MINIMUM_WITHDRAW_AMOUNT) {
            tg.showAlert(`আপনার ব্যালেন্স পর্যাপ্ত নয়।`);
            return;
        }
        
        submitWithdrawBtn.disabled = true;
        const withdrawalAmount = userData.balance;

        db.collection('withdrawals').add({
            userId: currentUser.id.toString(),
            username: currentUser.username || '',
            amount: withdrawalAmount,
            bkashNumber: bkashNumber,
            status: 'pending',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            userRef.update({ balance: 0 }).then(() => {
                userData.balance = 0;
                updateUI();
                tg.showAlert("আপনার উইথড্র অনুরোধ সফলভাবে জমা হয়েছে।");
                showScreen('home');
            });
        }).catch(handleError)
        .finally(() => {
            submitWithdrawBtn.disabled = false;
            bkashNumberInput.value = "";
        });
    }

    function showScreen(screenName) {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[screenName].classList.add('active');
    }

    function handleError(error) {
        console.error("An error occurred:", error);
        tg.showAlert("একটি সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
        // Re-enable buttons on error
        dailyCheckinBtn.disabled = false;
        submitWithdrawBtn.disabled = false;
    }
});
