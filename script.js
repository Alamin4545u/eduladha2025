document.addEventListener('DOMContentLoaded', async function () {
    // --- Safety Check for Telegram Environment ---
    if (typeof Telegram === 'undefined' || !window.Telegram.WebApp) {
        document.body.innerHTML = `<div style="text-align: center; padding: 50px; color: white; font-size: 18px;">Please open this app inside Telegram.</div>`;
        return;
    }
    
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // --- Firebase Configuration ---
    const firebaseConfig = {
        apiKey: "AIzaSyBidXnyxl4LjnRW6z5PrQ_iOKzqjjrxRtM",
        authDomain: "comexaple.firebaseapp.com",
        projectId: "comexaple",
        storageBucket: "comexaple.firebasestorage.app",
        messagingSenderId: "799294329351",
        appId: "1:799294329351:web:0bb9620bc1d227a29650a2",
        measurementId: "G-LRBREF5QV6"
    };

    // --- Initialize Firebase ---
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
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
    
    // --- App State ---
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

    const loadUserData = async (userId) => {
        userRef = db.collection('users').doc(String(userId));
        const doc = await userRef.get();
        if (doc.exists) {
            // Merge fetched data with default structure to avoid errors if some fields are missing
            const fetchedData = doc.data();
            userData.balance = fetchedData.balance || 0;
            userData.lastClaim = fetchedData.lastClaim || null;
            userData.taskProgress = { ...userData.taskProgress, ...fetchedData.taskProgress };
        } else {
            await saveUserData(); // Create new user document
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

    const switchPage = (targetPageId) => { /* ... (code remains same) */ };
    const checkVpnAndProceed = async (button, action) => { /* ... (code remains same) */ };
    const showGigaAd = (callback, button) => { /* ... (code remains same) */ };
    const populateUserData = () => { /* ... (code remains same) */ };
    const updateTaskCounter = (taskName, progress) => { /* ... (code remains same) */ };
    const initializeVideoTasks = () => { /* ... (code remains same) */ };
    const updateVideoTaskUI = (card, progress) => { /* ... (code remains same) */ };

    // --- Event Listeners ---
    allNavItems.forEach(item => { item.addEventListener('click', (e) => { e.preventDefault(); switchPage(item.dataset.target); }); });
    pageSwitchers.forEach(button => { button.addEventListener('click', () => switchPage(button.dataset.target)); });
    
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
            const lastClaimDate = userData.lastClaim ? new Date(userData.lastClaim).toDateString() : null;
            if (lastClaimDate === new Date().toDateString()) {
                tg.showAlert("You have already claimed today's bonus.");
                return;
            }
            showGigaAd(async () => {
                userData.balance += adminSettings.rewards.dailyBonus;
                userData.lastClaim = new Date().toISOString();
                await saveUserData();
                updateBalanceDisplay();
                tg.showAlert(`Daily bonus of ${adminSettings.rewards.dailyBonus.toFixed(2)} Tk has been added!`);
                e.target.textContent = 'Claimed';
                e.target.disabled = true;
            }, e.target);
        });
    });

    watchAdButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const card = e.target.closest('.video-task-card');
            const taskId = card.dataset.taskId;
            if (userData.taskProgress.video[taskId] >= adminSettings.taskLimits.video) return;

            showGigaAd(async () => {
                userData.taskProgress.video[taskId]++;
                await saveUserData();
                updateVideoTaskUI(card, userData.taskProgress.video[taskId]);
                tg.HapticFeedback.notificationOccurred('success');
            }, e.target);
        });
    });

    spinBtn.addEventListener('click', (e) => {
        if (isSpinning || userData.taskProgress.spin >= adminSettings.taskLimits.spin) return;
        isSpinning = true;
        
        showGigaAd(async () => {
            currentRotation += Math.floor(Math.random() * 360) + 360 * 5;
            spinWheel.style.transform = `rotate(${currentRotation}deg)`;
            setTimeout(async () => {
                isSpinning = false;
                userData.taskProgress.spin++;
                if (userData.taskProgress.spin === adminSettings.taskLimits.spin) {
                    userData.balance += adminSettings.rewards.spin;
                    tg.showAlert(`Task Complete! You earned $${adminSettings.rewards.spin.toFixed(2)}.`);
                }
                await saveUserData();
                updateTaskCounter('spin', userData.taskProgress.spin);
                updateBalanceDisplay();
            }, 2000);
        }, e.target);
    });
    
    scratchCard.addEventListener('click', () => {
        if (scratchCard.classList.contains('is-flipped') || userData.taskProgress.scratch >= adminSettings.taskLimits.scratch) return;
        
        showGigaAd(async () => {
            scratchCard.classList.add('is-flipped');
            tg.HapticFeedback.impactOccurred('medium');
            userData.taskProgress.scratch++;
            if (userData.taskProgress.scratch === adminSettings.taskLimits.scratch) {
                userData.balance += adminSettings.rewards.scratch;
                tg.showAlert(`Task Complete! You earned $${adminSettings.rewards.scratch.toFixed(2)}.`);
            }
            await saveUserData();
            updateTaskCounter('scratch', userData.taskProgress.scratch);
            updateBalanceDisplay();
            setTimeout(() => { scratchCard.classList.remove('is-flipped'); }, 3000);
        });
    });
    
    // --- Initial App Logic ---
    async function main() {
        populateAdminSettings();
        if (tg.initDataUnsafe?.user) {
            try {
                // Authenticate with Firebase using a custom token from your backend is the secure way.
                // For this example, we'll proceed without auth, relying on Firestore rules.
                await loadUserData(tg.initDataUnsafe.user.id);
                populateUserData();
            } catch (error) {
                console.error("Firebase Auth/Load Error:", error);
                document.body.innerHTML = `<div style="text-align: center; padding: 50px; color: red;">Could not connect to the database.</div>`;
                return;
            }
        } else {
            populateUserData(); // For local testing
            updateUIWithLoadedData();
        }
        showApp();
    }

    main();
});
