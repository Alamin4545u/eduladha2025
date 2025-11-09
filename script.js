document.addEventListener('DOMContentLoaded', function () {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // --- ADMIN PANEL SIMULATION ---
    const adminSettings = {
        vpnRequired: true,
        allowedCountries: ['US', 'UK', 'CA'], // Using standard 2-letter country codes
        taskLimits: {
            spin: 10,
            scratch: 10,
            video: 10,
        },
        rewards: {
            dailyBonus: 1.00,
            spin: 0.50,
            scratch: 0.75,
            video: 0.25,
        },
        referralNotice: "Invite friends and get a reward for each new user!",
        rewardPerReferral: 1.50,
        botLink: "https://t.me/YourEarningBotName"
    };

    let currentBalance = 125.50;
    const user = tg.initDataUnsafe?.user;
    let taskProgress = {
        spin: 0,
        scratch: 0,
        video: { task1: 0, task2: 0, task3: 0 }
    };

    // --- Element References ---
    const allPages = document.querySelectorAll('.page-content');
    const allNavItems = document.querySelectorAll('.nav-item');
    const allBalanceElements = document.querySelectorAll('.balance-amount');
    const spinWheel = document.querySelector('.spinner-wheel');
    const spinBtn = document.getElementById('spin-btn');
    const scratchCard = document.querySelector('.scratch-card-container');
    const watchAdButtons = document.querySelectorAll('.watch-ad-btn');
    const dailyClaimBtn = document.getElementById('daily-claim-btn');
    const protectedNavs = {
        'nav-spin': 'spin-page',
        'nav-scratch': 'scratch-page',
        'nav-video': 'watch-video-page'
    };

    let isSpinning = false;
    let currentRotation = 0;
    
    // --- Main Functions ---
    const updateBalanceDisplay = () => { allBalanceElements.forEach(el => el.textContent = `$${currentBalance.toFixed(2)}`); };
    const switchPage = (targetPageId) => {
        if (!document.getElementById(targetPageId)) return;
        allPages.forEach(page => page.classList.remove('active-page'));
        document.getElementById(targetPageId).classList.add('active-page');
        allNavItems.forEach(nav => nav.classList.toggle('active', nav.dataset.target === targetPageId));
    };

    // --- NEW: REALISTIC VPN CHECK FUNCTION ---
    async function checkVpnConnection() {
        if (!adminSettings.vpnRequired) return true;
        try {
            const response = await fetch('https://ip-api.com/json/?fields=countryCode');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            const userCountry = data.countryCode;
            
            if (adminSettings.allowedCountries.includes(userCountry)) {
                return true; // Country is allowed
            } else {
                tg.showAlert(`আপনি ভিপিএন চালু করুন ${adminSettings.allowedCountries.join(', ')} কান্ট্রি`);
                return false; // Country is not allowed
            }
        } catch (error) {
            console.error('Failed to check VPN:', error);
            tg.showAlert('ভিপিএন চেক করা সম্ভব হচ্ছে না। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।');
            return false;
        }
    }

    const handleProtectedNav = async (targetPageId, buttonElement) => {
        const originalText = buttonElement.innerHTML;
        buttonElement.innerHTML = '<span>Checking...</span>';
        buttonElement.disabled = true;

        const isAllowed = await checkVpnConnection();
        if (isAllowed) {
            switchPage(targetPageId);
            tg.HapticFeedback.selectionChanged();
        }

        buttonElement.innerHTML = originalText;
        buttonElement.disabled = false;
    };

    const updateTaskCounter = (taskName, progress) => { /* ... (code remains same) */ };
    const showAdSimulation = (callback, button) => { /* ... (code remains same) */ };
    const populateUserData = () => { /* ... (code remains same) */ };
    const populateAdminSettings = () => { /* ... (code remains same) */ };
    const initializeVideoTasks = () => { /* ... (code remains same) */ };
    const updateVideoTaskUI = (card, progress) => { /* ... (code remains same) */ };

    // --- Event Listeners ---
    allNavItems.forEach(item => { item.addEventListener('click', (e) => { e.preventDefault(); switchPage(item.dataset.target); }); });
    document.querySelectorAll('[data-target]').forEach(button => { button.addEventListener('click', () => switchPage(button.dataset.target)); });
    
    Object.entries(protectedNavs).forEach(([buttonId, pageId]) => {
        const buttonElement = document.getElementById(buttonId);
        if (buttonElement) {
            buttonElement.addEventListener('click', (e) => {
                e.preventDefault();
                handleProtectedNav(pageId, buttonElement);
            });
        }
    });

    dailyClaimBtn.addEventListener('click', async (e) => {
        const button = e.target;
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Checking...';

        const isAllowed = await checkVpnConnection();
        if (isAllowed) {
            button.textContent = 'Claiming...';
            showAdSimulation(() => {
                currentBalance += adminSettings.rewards.dailyBonus;
                updateBalanceDisplay();
                tg.showAlert(`Daily bonus of ${adminSettings.rewards.dailyBonus.toFixed(2)} Tk has been added!`);
                button.textContent = 'Claimed';
                // Button remains disabled after claiming
            }, null); // No need to re-enable button here
        } else {
            button.disabled = false;
            button.textContent = originalText;
        }
    });

    // ... (rest of the event listeners for spin, scratch, video, copy, withdraw remain same, but their internal logic is now wrapped)
    // Example for spin button, others follow the same pattern
    spinBtn.addEventListener('click', (e) => {
        if (isSpinning || taskProgress.spin >= adminSettings.taskLimits.spin) return;
        isSpinning = true;
        
        showAdSimulation(() => {
            currentRotation += Math.floor(Math.random() * 360) + 360 * 5;
            spinWheel.style.transform = `rotate(${currentRotation}deg)`;
            setTimeout(() => {
                isSpinning = false;
                taskProgress.spin++;
                updateTaskCounter('spin', taskProgress.spin);
                if (taskProgress.spin === adminSettings.taskLimits.spin) {
                    currentBalance += adminSettings.rewards.spin;
                    updateBalanceDisplay();
                    tg.showAlert(`Task Complete! You earned $${adminSettings.rewards.spin.toFixed(2)}.`);
                }
            }, 2000);
        }, e.target);
    });
    
    // --- Initial Call ---
    updateBalanceDisplay();
    populateUserData();
    populateAdminSettings();
    initializeVideoTasks();
    updateTaskCounter('spin', taskProgress.spin);
    updateTaskCounter('scratch', taskProgress.scratch);
});    // --- Initial Call ---
    updateBalanceDisplay();
    populateUserData();
    populateAdminSettings();
    initializeVideoTasks();
    updateTaskCounter('spin', taskProgress.spin);
    updateTaskCounter('scratch', taskProgress.scratch);
});
