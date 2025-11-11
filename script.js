// This function runs when the entire HTML page is loaded, ensuring all elements are ready.
window.addEventListener('load', main);

async function main() {
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
        botLink: "https://t.me/Bkash_earn_free_TkBot" // আপনার সঠিক বোট লিংক
    };
    let userData = { balance: 0.00, lastClaim: null };

    // 4. Element References
    const loader = document.getElementById('loader');
    const appContainer = document.querySelector('.app-container');
    const bottomNav = document.querySelector('.bottom-nav');
    const allPages = document.querySelectorAll('.page-content');
    const allNavItems = document.querySelectorAll('.nav-item');
    const pageSwitchers = document.querySelectorAll('.page-switcher');
    const allBalanceElements = document.querySelectorAll('.balance-amount');
    const dailyClaimBtn = document.getElementById('daily-claim-btn');
    const withdrawConfirmBtn = document.getElementById('withdraw-confirm-btn');
    const copyLinkBtn = document.getElementById('copy-link-btn');
    
    // --- Helper Functions ---
    const showApp = () => { loader.style.display = 'none'; appContainer.style.display = 'flex'; bottomNav.style.display = 'flex'; };
    const updateBalanceDisplay = () => allBalanceElements.forEach(el => el.textContent = `$${userData.balance.toFixed(2)}`);
    const saveUserData = async () => { if (userRef) await userRef.set(userData, { merge: true }); };
    const switchPage = (targetPageId) => {
        if (!document.getElementById(targetPageId)) return;
        allPages.forEach(page => page.classList.remove('active-page'));
        document.getElementById(targetPageId).classList.add('active-page');
        allNavItems.forEach(nav => nav.classList.toggle('active', nav.dataset.target === targetPageId));
    };
    const showGigaAd = (onAdComplete) => {
        if (typeof gigapay_ad_run === 'function') {
            gigapay_ad_run(onAdComplete, () => {
                tg.showAlert("Ad failed to load, but you still received the reward!");
                onAdComplete();
            });
        } else {
            console.log("GigaPub ad function not found, skipping ad.");
            onAdComplete();
        }
    };
    
    try {
        // 5. Initialize Firebase and Authenticate User
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        const { user: firebaseUser } = await auth.signInAnonymously();
        if (!firebaseUser) throw new Error("Authentication failed.");

        // 6. Load or Create User Data in Firestore
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

        // 7. Update UI with Data
        const user = tg.initDataUnsafe.user;
        document.getElementById('user-name').textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        document.getElementById('user-username').textContent = `@${user.username || 'N/A'}`;
        document.getElementById('profile-name').textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        document.getElementById('profile-username').textContent = `@${user.username || 'N/A'}`;
        document.getElementById('referral-link').value = `${adminSettings.botLink}?start=${userId}`;
        document.getElementById('referral-reward-info').textContent = `$${adminSettings.rewards.rewardPerReferral.toFixed(2)}`;
        updateBalanceDisplay();
        
        const lastClaimDate = userData.lastClaim ? new Date(userData.lastClaim).toDateString() : null;
        if (lastClaimDate === new Date().toDateString()) {
            dailyClaimBtn.textContent = 'Claimed Today';
            dailyClaimBtn.disabled = true;
        }

        // 8. SETUP ALL EVENT LISTENERS (CRITICAL STEP)
        allNavItems.forEach(item => item.addEventListener('click', (e) => { e.preventDefault(); switchPage(item.dataset.target); }));
        pageSwitchers.forEach(button => button.addEventListener('click', (e) => { e.preventDefault(); switchPage(button.dataset.target); }));

        dailyClaimBtn.addEventListener('click', () => {
            if (dailyClaimBtn.disabled) return;
            showGigaAd(async () => {
                userData.balance += adminSettings.rewards.dailyBonus;
                userData.lastClaim = new Date().toISOString();
                await saveUserData();
                updateBalanceDisplay();
                tg.showAlert(`Congratulations! $${adminSettings.rewards.dailyBonus.toFixed(2)} added.`);
                dailyClaimBtn.textContent = 'Claimed Today';
                dailyClaimBtn.disabled = true;
            });
        });

        withdrawConfirmBtn.addEventListener('click', async () => {
            const amount = parseFloat(document.getElementById('amount').value);
            const accountNumber = document.getElementById('account-number').value;
            if (isNaN(amount) || amount <= 0) return tg.showAlert("Please enter a valid amount.");
            if (amount > userData.balance) return tg.showAlert("Insufficient balance.");
            if (!accountNumber.trim()) return tg.showAlert("Please enter your account number.");
            
            // This is a simulation. You should send this data to your backend/Firebase collection for processing.
            userData.balance -= amount;
            await saveUserData();
            updateBalanceDisplay();
            tg.showAlert("Withdrawal request submitted successfully!");
            document.getElementById('amount').value = '';
            document.getElementById('account-number').value = '';
        });
        
        copyLinkBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(document.getElementById('referral-link').value)
                .then(() => tg.HapticFeedback.notificationOccurred('success'));
        });
        
        // 9. Show the App
        showApp();

    } catch (error) {
        console.error("App initialization failed:", error);
        loader.innerHTML = `<div style="color:red; padding:20px; text-align:center;">Failed to load. Error: ${error.message}</div>`;
    }
}
