document.addEventListener('DOMContentLoaded', function () {
    // --- Safety Check for Telegram Environment ---
    if (typeof Telegram === 'undefined' || typeof Telegram.WebApp === 'undefined') {
        document.body.innerHTML = `<div style="text-align: center; padding: 50px; color: white; font-size: 18px;">Please open this app inside Telegram.</div>`;
        return;
    }
    
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // --- ADMIN PANEL SIMULATION ---
    const adminSettings = {
        vpnRequired: true,
        allowedCountries: ['US', 'UK', 'CA'], // Standard 2-letter country codes
        taskLimits: { spin: 10, scratch: 10, video: 10 },
        rewards: { dailyBonus: 1.00, spin: 0.50, scratch: 0.75, video: 0.25 },
        referralNotice: "Invite friends and get a reward!",
        rewardPerReferral: 1.50,
        botLink: "https://t.me/YourEarningBotName"
    };

    let currentBalance = 125.50;
    const user = tg.initDataUnsafe?.user;
    let taskProgress = { spin: 0, scratch: 0, video: { task1: 0, task2: 0, task3: 0 }};

    // --- Element References ---
    const allPages = document.querySelectorAll('.page-content');
    const allNavItems = document.querySelectorAll('.nav-item');
    const allBalanceElements = document.querySelectorAll('.balance-amount');
    const spinWheel = document.querySelector('.spinner-wheel');
    const spinBtn = document.getElementById('spin-btn');
    const scratchCard = document.querySelector('.scratch-card-container');
    const watchAdButtons = document.querySelectorAll('.watch-ad-btn');
    const dailyClaimBtn = document.getElementById('daily-claim-btn');
    const protectedNavs = { 'nav-spin': 'spin-page', 'nav-scratch': 'scratch-page', 'nav-video': 'watch-video-page' };

    let isSpinning = false;
    let currentRotation = 0;
    
    // --- Main Functions ---
    const updateBalanceDisplay = () => allBalanceElements.forEach(el => el.textContent = `$${currentBalance.toFixed(2)}`);
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
            const response = await fetch('https://ipinfo.io/json?token=1151161c93b97a'); // Replace with a token for production
            if (!response.ok) throw new Error(`Network response error: ${response.statusText}`);
            
            const data = await response.json();
            const userCountry = data.country;

            if (adminSettings.allowedCountries.includes(userCountry)) {
                action();
            } else {
                tg.showAlert(`আপনি ভিপিএন চালু করুন ${adminSettings.allowedCountries.join(', ')} কান্ট্রি`);
            }
        } catch (error) {
            console.error('VPN Check Error:', error);
            tg.showAlert('ভিপিএন চেক করা সম্ভব হচ্ছে না। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।');
        } finally {
            button.disabled = false;
            button.innerHTML = originalHTML;
        }
    };

    const updateTaskCounter = (taskName, progress) => {
        const counter = document.getElementById(`${taskName}-counter`);
        if (counter) {
            counter.textContent = `${progress}/${adminSettings.taskLimits[taskName]}`;
        }
    };
    
    // CORRECTED: Using showAlert as a fallback for showPopup
    const showAdSimulation = (callback, button) => {
        if (button) button.disabled = true;
        
        // Use showAlert as it's more compatible
        tg.showAlert('Simulating an ad view. Please wait...', () => {
             // This callback for showAlert runs after the user closes the alert.
             // We'll simulate the ad delay with a timeout.
        });

        setTimeout(() => {
            if (callback) callback();
            if (button) button.disabled = false;
        }, 2000); // Simulate a 2-second ad
    };

    const populateUserData = () => { /* ... (code remains same) */ };
    const populateAdminSettings = () => { /* ... (code remains same) */ };
    const initializeVideoTasks = () => { /* ... (code remains same) */ };
    const updateVideoTaskUI = (card, progress) => { /* ... (code remains same) */ };

    // --- Event Listeners ---
    allNavItems.forEach(item => item.addEventListener('click', (e) => { e.preventDefault(); switchPage(item.dataset.target); }));
    document.querySelectorAll('[data-target]:not(.protected-nav)').forEach(button => button.addEventListener('click', () => switchPage(button.dataset.target)));
    
    Object.entries(protectedNavs).forEach(([buttonId, pageId]) => {
        const buttonElement = document.getElementById(buttonId);
        if (buttonElement) {
            buttonElement.classList.add('protected-nav');
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
                e.target.disabled = true;
            }, null);
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
