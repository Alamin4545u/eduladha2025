document.addEventListener('DOMContentLoaded', async function () {
    // --- Safety Check for Telegram Environment ---
    if (typeof Telegram === 'undefined' || !window.Telegram.WebApp) {
        const loader = document.getElementById('loader');
        loader.innerHTML = '<div id="loader-message">Please open this app inside Telegram.</div>';
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

    let db, auth, userRef;

    // --- Admin Settings (Replace with your actual settings) ---
    const adminSettings = {
        rewards: { dailyBonus: 1.00, spin: 0.50, scratch: 0.75, video: 0.25, rewardPerReferral: 1.50 },
        taskLimits: { spin: 10, scratch: 10, video: 10 },
        referralNotice: "Invite friends and get a reward!",
        botLink: "https://t.me/Bkash_earn_free_TkBot" // আপনার বোটের লিংক এখানে দিন
    };

    let userData = {
        balance: 0.00,
        lastClaim: null,
        taskProgress: { spin: 0, scratch: 0, video: 0 }
    };

    // --- Element References ---
    const loader = document.getElementById('loader');
    const appContainer = document.querySelector('.app-container');
    const bottomNav = document.querySelector('.bottom-nav');
    const allPages = document.querySelectorAll('.page-content');
    const allNavItems = document.querySelectorAll('.nav-item');
    const pageSwitchers = document.querySelectorAll('.page-switcher');
    const allBalanceElements = document.querySelectorAll('.balance-amount');
    
    // --- Button References ---
    const dailyClaimBtn = document.getElementById('daily-claim-btn');
    const withdrawConfirmBtn = document.getElementById('withdraw-confirm-btn');
    const copyLinkBtn = document.getElementById('copy-link-btn');
    const spinBtn = document.getElementById('spin-btn');
    const scratchCardContainer = document.querySelector('.scratch-card-container');
    const watchAdBtn = document.querySelector('.watch-ad-btn');

    // --- Core Functions ---
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
            gigapay_ad_run(onAdComplete, (error) => {
                console.error("Ad error:", error);
                tg.showAlert("Ad could not be loaded. Please try again.");
                onAdComplete(); // Allow reward even if ad fails for better user experience
            });
        } else {
            tg.showAlert("Ad service is not available.");
            onAdComplete();
        }
    };

    const loadUserData = async (firebaseUser) => {
        const userId = tg.initDataUnsafe?.user?.id.toString() || firebaseUser.uid;
        userRef = db.collection('users').doc(userId);
        const doc = await userRef.get();
        if (doc.exists) {
            const fetchedData = doc.data();
            userData = { ...userData, ...fetchedData, taskProgress: { ...userData.taskProgress, ...fetchedData.taskProgress } };
            if (!fetchedData.authUid) {
                userData.authUid = firebaseUser.uid;
                await saveUserData();
            }
        } else {
            userData.telegramId = tg.initDataUnsafe?.user?.id;
            userData.authUid = firebaseUser.uid;
            await saveUserData();
        }
    };

    const updateUIWithLoadedData = () => {
        updateBalanceDisplay();
        
        // Update user profile info
        const user = tg.initDataUnsafe?.user;
        const name = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'User';
        const username = user?.username ? `@${user.username}` : 'N/A';
        document.getElementById('user-name').textContent = name;
        document.getElementById('user-username').textContent = username;
        document.getElementById('profile-name').textContent = name;
        document.getElementById('profile-username').textContent = username;

        // Update referral info
        document.getElementById('referral-notice').textContent = adminSettings.referralNotice;
        document.getElementById('referral-reward-info').textContent = `$${adminSettings.rewards.rewardPerReferral.toFixed(2)}`;
        document.getElementById('referral-link').value = `${adminSettings.botLink}?start=${user.id}`;
        
        // Check daily claim status
        const lastClaimDate = userData.lastClaim ? new Date(userData.lastClaim).toDateString() : null;
        if (lastClaimDate === new Date().toDateString()) {
            dailyClaimBtn.textContent = 'Claimed';
            dailyClaimBtn.disabled = true;
        }
    };

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        allNavItems.forEach(item => item.addEventListener('click', (e) => {
            e.preventDefault();
            switchPage(item.dataset.target);
        }));

        pageSwitchers.forEach(button => button.addEventListener('click', (e) => {
            e.preventDefault();
            switchPage(button.dataset.target);
        }));

        // Daily Claim
        dailyClaimBtn.addEventListener('click', () => {
            const lastClaimDate = userData.lastClaim ? new Date(userData.lastClaim).toDateString() : null;
            if (lastClaimDate === new Date().toDateString()) {
                tg.showAlert("You have already claimed your bonus for today.");
                return;
            }
            
            tg.showPopup({
                title: 'Daily Bonus',
                message: 'Watch an ad to claim your daily bonus.',
                buttons: [{ type: 'ok', text: 'Watch Ad' }, { type: 'cancel' }]
            }, async (buttonId) => {
                if (buttonId === 'ok') {
                    showGigaAd(async () => {
                        userData.balance += adminSettings.rewards.dailyBonus;
                        userData.lastClaim = new Date().toISOString();
                        await saveUserData();
                        updateBalanceDisplay();
                        tg.showAlert(`Congratulations! $${adminSettings.rewards.dailyBonus.toFixed(2)} has been added to your balance.`);
                        dailyClaimBtn.textContent = 'Claimed';
                        dailyClaimBtn.disabled = true;
                    });
                }
            });
        });

        // Withdraw
        withdrawConfirmBtn.addEventListener('click', async () => {
            const amount = parseFloat(document.getElementById('amount').value);
            const method = document.getElementById('method').value;
            const accountNumber = document.getElementById('account-number').value;

            if (isNaN(amount) || amount <= 0) {
                tg.showAlert("Please enter a valid amount.");
                return;
            }
            if (amount > userData.balance) {
                tg.showAlert("Insufficient balance.");
                return;
            }
            if (!accountNumber.trim()) {
                tg.showAlert("Please enter your account number.");
                return;
            }

            // Here you would typically send the withdrawal request to your backend/Firebase
            tg.showPopup({
                title: 'Confirm Withdrawal',
                message: `Withdraw $${amount.toFixed(2)} to ${accountNumber} via ${method}?`,
                buttons: [{ type: 'ok', text: 'Confirm' }, { type: 'cancel' }]
            }, async (buttonId) => {
                if (buttonId === 'ok') {
                    // This is a simulation. In a real app, you would process this.
                    userData.balance -= amount;
                    await saveUserData();
                    updateBalanceDisplay();
                    tg.showAlert("Withdrawal request submitted successfully!");
                    document.getElementById('amount').value = '';
                    document.getElementById('account-number').value = '';
                }
            });
        });

        // Copy Referral Link
        copyLinkBtn.addEventListener('click', () => {
            const link = document.getElementById('referral-link').value;
            navigator.clipboard.writeText(link).then(() => {
                tg.HapticFeedback.notificationOccurred('success');
                tg.showAlert("Referral link copied!");
            });
        });

        // --- Task Event Listeners (Spin, Scratch, etc.) ---
        // Spin
        spinBtn.addEventListener('click', () => tg.showAlert('Spin feature is under development.'));
        // Scratch
        scratchCardContainer.addEventListener('click', () => tg.showAlert('Scratch card feature is under development.'));
        // Watch Video
        watchAdBtn.addEventListener('click', () => tg.showAlert('Watch video feature is under development.'));
    }

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
                updateUIWithLoadedData();
                setupEventListeners();
                showApp();
            } else {
                throw new Error("Anonymous authentication failed.");
            }
        } catch (error) {
            console.error("Critical Error:", error);
            const loader = document.getElementById('loader');
            loader.innerHTML = `<div id="loader-message" style="color:red; padding: 20px; text-align: center;">Failed to load. Details: ${error.message}</div>`;
        }
    }

    main();
});
