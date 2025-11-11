document.addEventListener('DOMContentLoaded', async function () {
    // --- Safety Check for Telegram Environment ---
    if (typeof Telegram === 'undefined' || !window.Telegram.WebApp) {
        document.getElementById('loader').innerHTML = '<div id="loader-message">Error: This must be opened in Telegram.</div>';
        return;
    }

    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // --- Firebase Configuration (Corrected) ---
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
    const loaderMessage = document.getElementById('loader-message');
    const spinner = document.querySelector('.spinner');
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

    // --- Event Listeners ---
    allNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchPage(item.dataset.target);
        });
    });
    pageSwitchers.forEach(button => button.addEventListener('click', () => switchPage(button.dataset.target)));

    // --- Main Execution Logic ---
    async function main() {
        try {
            // Step 1: Initialize Firebase App
            loaderMessage.textContent = "Initializing Firebase...";
            loaderMessage.style.display = 'block';
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.firestore();
            auth = firebase.auth();
            loaderMessage.textContent = "Firebase Initialized. Signing in...";

            // Step 2: Sign in
            const userCredential = await auth.signInAnonymously();
            const firebaseUser = userCredential.user;
            
            if (firebaseUser) {
                loaderMessage.textContent = "Signed In. Loading data...";
                // Step 3: Load User Data
                await loadUserData(firebaseUser);

                // Step 4: Finalize UI
                loaderMessage.textContent = "Finalizing...";
                populateUserData();
                document.getElementById('referral-notice').textContent = adminSettings.referralNotice;
                document.getElementById('referral-reward-info').textContent = `$${adminSettings.rewardPerReferral.toFixed(2)}`;
                showApp();
            } else {
                throw new Error("Anonymous authentication failed, user object is null.");
            }
        } catch (error) {
            console.error("Critical Error:", error);
            let errorMessage = "An unknown error occurred.";
            if (error.code) {
                errorMessage = `Error Code: ${error.code}\nMessage: ${error.message}`;
            } else if (error.message) {
                errorMessage = error.message;
            }
            loaderMessage.textContent = "Failed to load.\n\nDetails:\n" + errorMessage;
            loaderMessage.style.whiteSpace = 'pre-wrap'; // To show line breaks
            loaderMessage.style.color = '#ff6b6b';
            loaderMessage.style.display = 'block';
            spinner.style.display = 'none';
        }
    }

    main();
});
