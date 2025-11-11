// This runs only when the DOM is fully parsed, which is safer.
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    // 1. Safety Check and Telegram App Initialization
    if (typeof Telegram === 'undefined' || !window.Telegram.WebApp) {
        document.body.innerHTML = '<h1>Error</h1><p>This application must be opened inside Telegram.</p>';
        return;
    }
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // 2. Firebase Configuration
    const firebaseConfig = {
      apiKey: "AIzaSyDtp3b0fdEvcjAPvmdupd00qDCbucyFIc0",
      authDomain: "mini-bot-735bf.firebaseapp.com",
      projectId: "mini-bot-735bf",
      storageBucket: "mini-bot-735bf.firebasestorage.app",
      messagingSenderId: "1056580233393",
      appId: "1:1056580233393:web:058609b1ca944020755a90",
    };

    // 3. Global Variables and Settings
    let db, auth, userRef;
    const adminSettings = {
        rewards: { dailyBonus: 1.00, rewardPerReferral: 1.50 },
        botLink: "https://t.me/Bkash_earn_free_TkBot"
    };
    let userData = { balance: 0.00, lastClaim: null };

    // 4. Element References
    const loader = document.getElementById('loader');
    const appContainer = document.querySelector('.app-container');
    const bottomNav = document.querySelector('.bottom-nav');

    try {
        // 5. Initialize Firebase and Authenticate User
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        const { user: firebaseUser } = await auth.signInAnonymously();
        if (!firebaseUser) throw new Error("Authentication failed.");

        // 6. Load or Create User Data
        const userId = tg.initDataUnsafe?.user?.id.toString();
        if (!userId) throw new Error("Could not get Telegram User ID.");
        userRef = db.collection('users').doc(userId);
        const doc = await userRef.get();
        if (doc.exists) {
            userData = { ...userData, ...doc.data() };
            if (!doc.data().authUid) {
                userData.authUid = firebaseUser.uid;
                await saveUserData();
            }
        } else {
            userData.authUid = firebaseUser.uid;
            await saveUserData();
        }

        // 7. Setup UI and Event Listeners (THIS IS THE CRITICAL PART)
        setupUIAndListeners();

        // 8. Show the App
        loader.style.display = 'none';
        appContainer.style.display = 'flex';
        bottomNav.style.display = 'flex';

    } catch (error) {
        console.error("App initialization failed:", error);
        loader.innerHTML = `<div style="color:red; padding:20px; text-align:center;">Failed to load. Error: ${error.message}</div>`;
    }

    // --- All functions are defined here for clarity ---

    function setupUIAndListeners() {
        const allPages = document.querySelectorAll('.page-content');
        const allNavItems = document.querySelectorAll('.nav-item');
        const pageSwitchers = document.querySelectorAll('.page-switcher');
        const allBalanceElements = document.querySelectorAll('.balance-amount');
        const dailyClaimBtn = document.getElementById('daily-claim-btn');
        const withdrawConfirmBtn = document.getElementById('withdraw-confirm-btn');
        const copyLinkBtn = document.getElementById('copy-link-btn');

        // Update UI with initial data
        const user = tg.initDataUnsafe.user;
        document.getElementById('user-name').textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        document.getElementById('user-username').textContent = `@${user.username || 'N/A'}`;
        document.getElementById('profile-name').textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        document.getElementById('profile-username').textContent = `@${user.username || 'N/A'}`;
        document.getElementById('referral-link').value = `${adminSettings.botLink}?start=${tg.initDataUnsafe?.user?.id.toString()}`;
        document.getElementById('referral-reward-info').textContent = `$${adminSettings.rewards.rewardPerReferral.toFixed(2)}`;
        updateBalanceDisplay();

        const lastClaimDate = userData.lastClaim ? new Date(userData.lastClaim).toDateString() : null;
        if (lastClaimDate === new Date().toDateString()) {
            dailyClaimBtn.textContent = 'Claimed';
            dailyClaimBtn.disabled = true;
        }

        // --- Attach ALL event listeners ---
        allNavItems.forEach(item => item.addEventListener('click', (e) => { e.preventDefault(); switchPage(item.dataset.target, allPages, allNavItems); }));
        pageSwitchers.forEach(button => button.addEventListener('click', (e) => { e.preventDefault(); switchPage(button.dataset.target, allPages, allNavItems); }));

        dailyClaimBtn.addEventListener('click', handleDailyClaim);
        withdrawConfirmBtn.addEventListener('click', handleWithdraw);
        copyLinkBtn.addEventListener('click', handleCopyLink);
    }
    
    // --- Event Handler Functions ---

    function switchPage(targetPageId, allPages, allNavItems) {
        if (!document.getElementById(targetPageId)) return;
        allPages.forEach(page => page.classList.remove('active-page'));
        document.getElementById(targetPageId).classList.add('active-page');
        allNavItems.forEach(nav => nav.classList.toggle('active', nav.dataset.target === targetPageId));
    }

    function showGigaAd(onAdComplete) {
        if (typeof gigapay_ad_run === 'function') {
            gigapay_ad_run(onAdComplete, () => {
                tg.showAlert("Ad failed to load, but you still received the reward!");
                onAdComplete();
            });
        } else {
            console.log("GigaPub ad function not found, skipping ad.");
            onAdComplete();
        }
    }

    async function handleDailyClaim() {
        const dailyClaimBtn = document.getElementById('daily-claim-btn');
        if (dailyClaimBtn.disabled) return;
        
        showGigaAd(async () => {
            userData.balance += adminSettings.rewards.dailyBonus;
            userData.lastClaim = new Date().toISOString();
            await saveUserData();
            updateBalanceDisplay();
            tg.showAlert(`Congratulations! $${adminSettings.rewards.dailyBonus.toFixed(2)} added.`);
            dailyClaimBtn.textContent = 'Claimed';
            dailyClaimBtn.disabled = true;
        });
    }

    async function handleWithdraw() {
        const amountInput = document.getElementById('amount');
        const accountInput = document.getElementById('account-number');
        const amount = parseFloat(amountInput.value);

        if (isNaN(amount) || amount <= 0) return tg.showAlert("Please enter a valid amount.");
        if (amount > userData.balance) return tg.showAlert("Insufficient balance.");
        if (!accountInput.value.trim()) return tg.showAlert("Please enter your account number.");

        userData.balance -= amount;
        await saveUserData();
        updateBalanceDisplay();
        tg.showAlert("Withdrawal request submitted successfully!");
        amountInput.value = '';
        accountInput.value = '';
    }

    function handleCopyLink() {
        const linkInput = document.getElementById('referral-link');
        navigator.clipboard.writeText(linkInput.value)
            .then(() => {
                tg.HapticFeedback.notificationOccurred('success');
                tg.showAlert("Link Copied!");
            });
    }
    
    function updateBalanceDisplay() {
        document.querySelectorAll('.balance-amount').forEach(el => el.textContent = `$${userData.balance.toFixed(2)}`);
    }

    async function saveUserData() {
        if (userRef) await userRef.set(userData, { merge: true });
    }
}
