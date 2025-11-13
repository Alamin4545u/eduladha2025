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
    const AD_REWARD = 1;
    const MINIMUM_WITHDRAW_AMOUNT = 10;

    // --- UI Elements ---
    const screens = { home: document.getElementById('home-screen'), withdraw: document.getElementById('withdraw-screen') };
    
    // Header elements
    const headerFirstNameElement = document.getElementById('headerFirstName');
    const headerUsernameElement = document.getElementById('headerUsername');
    const headerBalanceElement = document.getElementById('headerBalance');

    // Home screen elements
    const balanceElement = document.getElementById('balance');
    const watchAdBtn = document.getElementById('watchAdBtn');
    const goToWithdrawBtn = document.getElementById('goToWithdrawBtn');

    // Withdraw screen elements
    const withdrawBalanceElement = document.getElementById('withdrawBalance');
    const bkashNumberInput = document.getElementById('bkashNumber');
    const submitWithdrawBtn = document.getElementById('submitWithdrawBtn');
    const backBtn = document.getElementById('backBtn');
    const withdrawStatusElement = document.getElementById('withdraw-status');

    let currentUser = null;
    let userRef = null;
    let userBalance = 0;

    // --- Main Logic ---
    tg.ready();
    tg.expand(); // Expands the web app to full height

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
                userBalance = doc.data().balance;
            } else {
                userRef.set({
                    username: currentUser.username || '',
                    firstName: currentUser.first_name || '',
                    balance: 0
                });
                userBalance = 0;
            }
            updateUI();
        }).catch(handleError);
    }

    function updateUI() {
        const formattedBalance = `৳ ${userBalance.toFixed(2)}`;
        // Update header
        headerBalanceElement.innerText = formattedBalance;
        headerFirstNameElement.innerText = currentUser.first_name || 'ব্যবহারকারী';
        headerUsernameElement.innerText = currentUser.username ? `@${currentUser.username}` : `#${currentUser.id}`;
        
        // Update main content
        balanceElement.innerText = formattedBalance;
        withdrawBalanceElement.innerText = formattedBalance;
        
        if (userBalance < MINIMUM_WITHDRAW_AMOUNT) {
            submitWithdrawBtn.disabled = true;
            submitWithdrawBtn.innerText = `ন্যূনতম ৳${MINIMUM_WITHDRAW_AMOUNT} প্রয়োজন`;
        } else {
            submitWithdrawBtn.disabled = false;
            submitWithdrawBtn.innerText = "সাবমিট করুন";
        }
    }

    function setupEventListeners() {
        watchAdBtn.addEventListener('click', handleWatchAd);
        goToWithdrawBtn.addEventListener('click', () => showScreen('withdraw'));
        backBtn.addEventListener('click', () => showScreen('home'));
        submitWithdrawBtn.addEventListener('click', handleSubmitWithdraw);
    }

    function handleWatchAd() {
        tg.HapticFeedback.impactOccurred('light');
        watchAdBtn.disabled = true;
        watchAdBtn.innerText = "লোড হচ্ছে...";

        window.showGiga()
            .then(() => {
                tg.HapticFeedback.notificationOccurred('success');
                userRef.update({ balance: firebase.firestore.FieldValue.increment(AD_REWARD) })
                    .then(() => {
                        userBalance += AD_REWARD;
                        updateUI();
                        tg.showAlert(`অভিনন্দন! আপনি ৳ ${AD_REWARD.toFixed(2)} পেয়েছেন।`);
                    });
            })
            .catch(e => {
                tg.HapticFeedback.notificationOccurred('error');
                tg.showAlert('দুঃখিত, এই মুহূর্তে কোনো বিজ্ঞাপন উপলব্ধ নেই।');
                console.error("Ad failed:", e);
            })
            .finally(() => {
                watchAdBtn.disabled = false;
                watchAdBtn.innerText = `বিজ্ঞাপন দেখুন (৳ ${AD_REWARD.toFixed(2)})`;
            });
    }

    function handleSubmitWithdraw() {
        const bkashNumber = bkashNumberInput.value.trim();
        if (bkashNumber.length < 11 || !/^\d+$/.test(bkashNumber)) {
            tg.showAlert("অনুগ্রহ করে একটি সঠিক বিকাশ নম্বর দিন।");
            return;
        }
        if (userBalance < MINIMUM_WITHDRAW_AMOUNT) {
            tg.showAlert(`আপনার ব্যালেন্স পর্যাপ্ত নয়।`);
            return;
        }
        
        submitWithdrawBtn.disabled = true;
        withdrawStatusElement.innerText = "অনুরোধ প্রক্রিয়া করা হচ্ছে...";
        
        const withdrawalAmount = userBalance;

        db.collection('withdrawals').add({
            userId: currentUser.id.toString(),
            username: currentUser.username || '',
            amount: withdrawalAmount,
            bkashNumber: bkashNumber,
            status: 'pending',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            userRef.update({ balance: 0 }).then(() => {
                userBalance = 0;
                updateUI();
                tg.showAlert("আপনার উইথড্র অনুরোধ সফলভাবে জমা হয়েছে।");
                showScreen('home');
            });
        })
        .catch(handleError)
        .finally(() => {
            submitWithdrawBtn.disabled = false;
            withdrawStatusElement.innerText = "";
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
    }
});
