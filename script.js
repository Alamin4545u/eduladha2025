document.addEventListener('DOMContentLoaded', function () {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // --- ADMIN PANEL SIMULATION ---
    const adminSettings = {
        vpnRequired: true,
        allowedCountries: ['US', 'UK', 'CA'], // Standard 2-letter country codes
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

    // --- NEW & ROBUST VPN CHECK FUNCTION ---
    const checkVpnAndProceed = async (button, action) => {
        if (!adminSettings.vpnRequired) {
            action();
            return;
        }

        const originalHTML = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<span>Checking...</span>';

        try {
            // Using a reliable IP info service.
            // Note: Public APIs can have rate limits. For a production app, consider a paid plan.
            const response = await fetch('https://ipinfo.io/json?token=YOUR_IPINFO_TOKEN'); // Replace with a token for production
            if (!response.ok) throw new Error('Network response was not ok.');
            
            const data = await response.json();
            const userCountry = data.country; // e.g., 'US'

            if (adminSettings.allowedCountries.includes(userCountry)) {
                action(); // VPN/Country is correct, perform the action
            } else {
                tg.showAlert(`আপনি ভিপিএন চালু করুন ${adminSettings.allowedCountries.join(', ')} কান্ট্রি`);
            }
        } catch (error) {
            console.error('Error checking VPN:', error);
            tg.showAlert('ভিপিএন চেক করা সম্ভব হচ্ছে না। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।');
        } finally {
            // This block will always run, ensuring the button is re-enabled and text is restored.
            button.disabled = false;
            button.innerHTML = originalHTML;
        }
    };

    const updateTaskCounter = (taskName, progress) => { /* ... (code remains same) */ };
    const showAdSimulation = (callback, button) => { /* ... (code remains same) */ };
    const populateUserData = () => { /* ... (code remains same) */ };
    const populateAdminSettings = () => { /* ... (code remains same) */ };
    const initializeVideoTasks = () => { /* ... (code remains same) */ };
    const updateVideoTaskUI = (card, progress) => { /* ... (code remains same) */ };

    // --- Event Listeners ---
    allNavItems.forEach(item => { item.addEventListener('click', (e) => { e.preventDefault(); switchPage(item.dataset.target); }); });
    document.querySelectorAll('[data-target]').forEach(button => {
        if (!Object.values(protectedNavs).includes(button.dataset.target)) {
            button.addEventListener('click', () => switchPage(button.dataset.target));
        }
    });
    
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
            showAdSimulation(() => {
                currentBalance += adminSettings.rewards.dailyBonus;
                updateBalanceDisplay();
                tg.showAlert(`Daily bonus of ${adminSettings.rewards.dailyBonus.toFixed(2)} Tk has been added!`);
                e.target.textContent = 'Claimed';
                e.target.disabled = true; // Keep it disabled after claiming
            }, null); // No need to pass button to re-enable it
        });
    });

    // ... (rest of the event listeners for spin, scratch, video, copy, withdraw remain same)
    
    // --- Initial Call ---
    updateBalanceDisplay();
    populateUserData();
    populateAdminSettings();
    initializeVideoTasks();
    updateTaskCounter('spin', taskProgress.spin);
    updateTaskCounter('scratch', taskProgress.scratch);
});
