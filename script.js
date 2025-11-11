document.addEventListener('DOMContentLoaded', async function () {
    // --- Safety Check for Telegram Environment ---
    if (typeof Telegram === 'undefined' || !window.Telegram.WebApp) {
        document.getElementById('loader').innerHTML = '<div id="loader-message">Error: This must be opened in Telegram.</div>';
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
      storageBucket: "mini-bot-735bf.firebasestorage.app",
      messagingSenderId: "1056580233393",
      appId: "1:1056580233393:web:058609b1ca944020755a90",
      measurementId: "G-L50J7R33WZ"
    };

    // --- Initialize Firebase Variables ---
    let db, auth, userRef;

    // --- Admin & App State ---
    const adminSettings = { vpnRequired: true, allowedCountries: ['US', 'UK', 'CA'], taskLimits: { spin: 10, scratch: 10, video: 10 }, rewards: { dailyBonus: 1.00, spin: 0.50, scratch: 0.75, video: 0.25 }, referralNotice: "Invite friends and get a reward!", rewardPerReferral: 1.50, botLink: "https://t.me/YourEarningBotName" };
    let userData = { balance: 0.00, lastClaim: null, taskProgress: { spin: 0, scratch: 0, video: { task1: 0, task2: 0, task3: 0 }} };

    // --- Element References ---
    const loader = document.getElementById('loader');
    const appContainer = document.querySelector('.app-container');
    const bottomNav = document.querySelector('.bottom-nav');
    const allPages = document.querySelectorAll('.page-content');
    const allNavItems = document.querySelectorAll('.nav-item');
    const allBalanceElements = document.querySelectorAll('.balance-amount');
    const dailyClaimBtn = document.getElementById('daily-claim-btn');
    const pageSwitchers = document.querySelectorAll('.page-switcher');
    
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
            // এই গুরুত্বপূর্ণ লাইনটি যোগ করা হয়েছে
            userData.authUid = firebaseUser.uid; 
            await saveUserData();
        }
        updateUIWithLoadedData();
    };

    const updateUIWithLoadedData = () => {
        updateBalanceDisplay();
        const lastClaimDate = userData.lastClaim ? new Date(userData.lastClaim).toDateString() : null;
        if (lastClaimDate === new Date().toDateString()) {
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

    // --- Event Listeners and other functions would go here as before ---
    // (Rest of the file is the same as the debugging version)

    // --- Main Execution Logic ---
    async function main() {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.firestore();
            auth = firebase.auth();

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
            document.getElementById('loader').innerHTML = `<div id="loader-message">Failed to load. Details: ${error.message}</div>`;
        }
    }

    main();
});
