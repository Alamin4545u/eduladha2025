document.addEventListener('DOMContentLoaded', async function () {
    // --- Safety Check for Telegram Environment ---
    if (typeof Telegram === 'undefined' || !window.Telegram.WebApp) {
        document.getElementById('loader').innerHTML = `<div id="loader-message">Please open this app inside Telegram.</div>`;
        return;
    }
    
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // --- Firebase Configuration ---
    const firebaseConfig = {
      apiKey: "AIzaSyDtp3b0fdEvcjAPvmdupd00qDCbucyFIc0",
      authDomain: "mini-bot-735bf.firebaseapp.com",
      projectId: "mini-bot-735bf",
      storageBucket: "mini-bot-735bf.appspot.com",
      messagingSenderId: "1056580233393",
      appId: "1:1056580233393:web:058609b1ca944020755a90",
      measurementId: "G-L50J7R33WZ"
    };

    // --- Initialize Firebase ---
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
    } catch (e) {
        console.error("Firebase initialization failed:", e);
        document.getElementById('loader').innerHTML = `<div id="loader-message">Firebase configuration error. Please check your config.</div>`;
        return;
    }
    
    const db = firebase.firestore();
    const auth = firebase.auth();
    let userRef;

    // --- ADMIN PANEL SIMULATION ---
    const adminSettings = {
        vpnRequired: true,
        allowedCountries: ['US', 'UK', 'CA'],
        taskLimits: { spin: 10, scratch: 10, video: 10 },
        rewards: { dailyBonus: 1.00, spin: 0.50, scratch: 0.75, video: 0.25 },
        referralNotice: "Invite friends and get a reward!",
        rewardPerReferral: 1.50,
        botLink: "https://t.me/YourEarningBotName"
    };
    
    // --- App State (Default Structure) ---
    let userData = {
        balance: 0.00,
        lastClaim: null,
        taskProgress: { spin: 0, scratch: 0, video: { task1: 0, task2: 0, task3: 0 }}
    };

    // --- Element References ---
    const loader = document.getElementById('loader');
    const appContainer = document.querySelector('.app-container');
    const bottomNav = document.querySelector('.bottom-nav');
    const allPages = document.querySelectorAll('.page-content');
    const allNavItems = document.querySelectorAll('.nav-item');
    const allBalanceElements = document.querySelectorAll('.balance-amount');
    const spinWheel = document.querySelector('.spinner-wheel');
    const spinBtn = document.getElementById('spin-btn');
    const scratchCard = document.querySelector('.scratch-card-container');
    const watchAdButtons = document.querySelectorAll('.watch-ad-btn');
    const dailyClaimBtn = document.getElementById('daily-claim-btn');
    const protectedNavs = { 'nav-spin': 'spin-page', 'nav-scratch': 'scratch-page', 'nav-video': 'watch-video-page' };
    const pageSwitchers = document.querySelectorAll('.page-switcher');

    let isSpinning = false;
    let currentRotation = 0;
    
    // --- Main Functions ---
    const showApp = () => { loader.style.display = 'none'; appContainer.style.display = 'flex'; bottomNav.style.display = 'flex'; };
    const updateBalanceDisplay = () => allBalanceElements.forEach(el => el.textContent = `$${userData.balance.toFixed(2)}`);
    const saveUserData = async () => { if (userRef) await userRef.set(userData, { merge: true }); };

    const loadUserData = async (firebaseUser) => {
        const userId = tg.initDataUnsafe?.user?.id || firebaseUser.uid;
        userRef = db.collection('users').doc(String(userId));
        const doc = await userRef.get();
        if (doc.exists) {
            const fetchedData = doc.data();
            userData = { ...userData, ...fetchedData, taskProgress: { ...userData.taskProgress, ...fetchedData.taskProgress } };
        } else {
            if (tg.initDataUnsafe?.user) userData.telegramId = tg.initDataUnsafe.user.id;
            await saveUserData();
        }
        updateUIWithLoadedData();
    };

    const updateUIWithLoadedData = () => {
        updateBalanceDisplay();
        updateTaskCounter('spin', userData.taskProgress.spin);
        updateTaskCounter('scratch', userData.taskProgress.scratch);
        initializeVideoTasks();
        
        const lastClaimDate = userData.lastClaim ? new Date(userData.lastClaim).toDateString() : null;
        const todayDate = new Date().toDateString();
        if (lastClaimDate === todayDate) {
            dailyClaimBtn.textContent = 'Claimed';
            dailyClaimBtn.disabled = true;
        }
    };

    const switchPage = (targetPageId) => {
        if (!document.getElementById(targetPageId)) return;
        allPages.forEach(page => page.classList.remove('active-page'));
        document.getElementById(targetPageId).classList.add('active-page');
        allNavItems.forEach(nav => nav.classList.toggle('active', nav.dataset.target === targetPageId));
    };
    
    const checkVpnAndProceed = async (button, action) => { /* ... (code remains same) */ };
    const showGigaAd = (callback, button) => { /* ... (code remains same) */ };
    
    const populateUserData = () => {
        const user = tg.initDataUnsafe?.user;
        const name = user?.first_name || 'User';
        const username = user?.username ? `@${user.username}` : '@username';
        document.getElementById('user-name').textContent = name;
        document.getElementById('user-username').textContent = username;
        document.getElementById('profile-name').textContent = name;
        document.getElementById('profile-username').textContent = username;
        if (user) document.getElementById('referral-link').value = `${adminSettings.botLink}?start=${user.id}`;
    };

    const updateTaskCounter = (taskName, progress) => { /* ... (code remains same) */ };
    const initializeVideoTasks = () => { /* ... (code remains same) */ };
    const updateVideoTaskUI = (card, progress) => { /* ... (code remains same) */ };

    // --- Event Listeners ---
    allNavItems.forEach(item => {
        const targetPageId = item.dataset.target;
        // Exclude protected navs from this generic listener
        if (!Object.values(protectedNavs).includes(targetPageId)) {
             item.addEventListener('click', (e) => {
                e.preventDefault();
                switchPage(targetPageId);
            });
        }
    });
    
    pageSwitchers.forEach(button => button.addEventListener('click', () => switchPage(button.dataset.target)));
    
    Object.entries(protectedNavs).forEach(([buttonId, pageId]) => {
        const buttonElement = document.getElementById(buttonId);
        if (buttonElement) {
            buttonElement.addEventListener('click', (e) => {
                e.preventDefault();
                checkVpnAndProceed(buttonElement, () => {
                    switchPage(pageId);
                    tg.HapticFeedback.selectionChanged();
                });
            });
        }
    });

    dailyClaimBtn.addEventListener('click', (e) => {
        checkVpnAndProceed(e.target, () => {
            // ... (rest of the logic)
        });
    });

    // ... (rest of the event listeners for watchAdButtons, spinBtn, scratchCard, etc. remain the same)
    
    // --- Initial App Logic ---
    async function main() {
        try {
            const userCredential = await auth.signInAnonymously();
            const firebaseUser = userCredential.user;

            if (firebaseUser) {
                await loadUserData(firebaseUser);
                populateUserData();
                document.getElementById('referral-notice').textContent = adminSettings.referralNotice;
                document.getElementById('referral-reward-info').textContent = `$${adminSettings.rewardPerReferral.toFixed(2)}`;
                showApp();
            } else {
                throw new Error("Anonymous authentication failed.");
            }
        } catch (error) {
            console.error("Critical Error:", error);
            const loaderMessage = document.getElementById('loader-message');
            loaderMessage.textContent = "Failed to load. Please check Firebase config, security rules, and enable Anonymous Sign-in.";
            loaderMessage.style.display = 'block';
        }
    }

    main();
});
