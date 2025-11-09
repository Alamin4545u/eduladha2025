document.addEventListener('DOMContentLoaded', function () {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // --- VPN CHECK SIMULATION ---
    // -------------------------------------------------------------------------
    //  গুরুত্বপূর্ণ: পরীক্ষার জন্য এই মানটি পরিবর্তন করুন।
    //  'true' মানে হলো VPN চালু আছে বলে ধরে নেওয়া হবে।
    //  'false' মানে হলো VPN বন্ধ আছে বলে ধরে নেওয়া হবে।
    // -------------------------------------------------------------------------
    const isVpnConnected = true; 

    // --- ADMIN PANEL SIMULATION ---
    const adminSettings = {
        vpnRequired: true,
        allowedCountries: ['US', 'UK', 'Canada'],
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
    const pageSwitchButtons = document.querySelectorAll('[data-target]');
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

    const checkVPN = () => {
        if (!adminSettings.vpnRequired) return true;
        if (isVpnConnected) {
            return true;
        } else {
            tg.showAlert(`আপনি ভিপিএন চালু করুন ${adminSettings.allowedCountries.join(', ')} কান্ট্রি`);
            return false;
        }
    };

    const handleProtectedNav = (targetPageId) => {
        if (checkVPN()) {
            switchPage(targetPageId);
            tg.HapticFeedback.selectionChanged();
        }
    };

    const updateTaskCounter = (taskName, progress) => {
        const counter = document.getElementById(`${taskName}-counter`);
        if (counter) {
            counter.textContent = `${progress}/${adminSettings.taskLimits[taskName]}`;
        }
    };
    
    const showAdSimulation = (callback, button) => {
        if (button) button.disabled = true;
        tg.showPopup({ title: 'Advertisement', message: 'Simulating an ad view. Please wait...', buttons: [] });
        setTimeout(() => {
            tg.closePopup();
            if (callback) callback();
            if (button) button.disabled = false;
        }, 2000);
    };

    const populateUserData = () => {
        const telegramUser = tg.initDataUnsafe?.user;
        const name = telegramUser?.first_name || 'User';
        const username = telegramUser?.username ? `@${telegramUser.username}` : '@username';
        
        document.getElementById('user-name').textContent = name;
        document.getElementById('user-username').textContent = username;
        document.getElementById('profile-name').textContent = name;
        document.getElementById('profile-username').textContent = username;
        
        if (telegramUser) {
            document.getElementById('referral-link').value = `${adminSettings.botLink}?start=${telegramUser.id}`;
        }
    };

    const populateAdminSettings = () => {
        document.getElementById('referral-notice').textContent = adminSettings.referralNotice;
        document.getElementById('referral-reward-info').textContent = `$${adminSettings.rewardPerReferral.toFixed(2)} per referral`;
    };

    const initializeVideoTasks = () => {
        document.querySelectorAll('.video-task-card').forEach(card => {
            const progressBlocksContainer = card.querySelector('.progress-blocks');
            progressBlocksContainer.innerHTML = '';
            for (let i = 0; i < adminSettings.taskLimits.video; i++) {
                const block = document.createElement('div');
                block.classList.add('progress-block');
                progressBlocksContainer.appendChild(block);
            }
            updateVideoTaskUI(card, taskProgress.video[card.dataset.taskId]);
        });
    };

    const updateVideoTaskUI = (card, progress) => {
        card.querySelector('.progress-text').textContent = `${progress}/${adminSettings.taskLimits.video}`;
        card.querySelectorAll('.progress-block').forEach((block, index) => {
            block.classList.toggle('completed', index < progress);
        });
        card.querySelector('.watch-ad-btn').style.display = progress >= adminSettings.taskLimits.video ? 'none' : 'block';
        card.querySelector('.claim-reward-btn').style.display = progress >= adminSettings.taskLimits.video ? 'block' : 'none';
    };

    // --- Event Listeners ---
    allNavItems.forEach(item => { item.addEventListener('click', (e) => { e.preventDefault(); switchPage(item.dataset.target); }); });
    pageSwitchButtons.forEach(button => { button.addEventListener('click', () => switchPage(button.dataset.target)); });
    
    Object.entries(protectedNavs).forEach(([buttonId, pageId]) => {
        document.getElementById(buttonId).addEventListener('click', () => handleProtectedNav(pageId));
    });

    dailyClaimBtn.addEventListener('click', (e) => {
        showAdSimulation(() => {
            currentBalance += adminSettings.rewards.dailyBonus;
            updateBalanceDisplay();
            tg.showAlert(`Daily bonus of ${adminSettings.rewards.dailyBonus.toFixed(2)} Tk has been added!`);
            e.target.disabled = true;
            e.target.textContent = 'Claimed';
        }, e.target);
    });

    watchAdButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const card = e.target.closest('.video-task-card');
            const taskId = card.dataset.taskId;
            if (taskProgress.video[taskId] >= adminSettings.taskLimits.video) return;

            showAdSimulation(() => {
                taskProgress.video[taskId]++;
                updateVideoTaskUI(card, taskProgress.video[taskId]);
                tg.HapticFeedback.notificationOccurred('success');
            }, e.target);
        });
    });

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
    
    scratchCard.addEventListener('click', () => {
        if (scratchCard.classList.contains('is-flipped') || taskProgress.scratch >= adminSettings.taskLimits.scratch) return;
        
        showAdSimulation(() => {
            scratchCard.classList.add('is-flipped');
            tg.HapticFeedback.impactOccurred('medium');
            taskProgress.scratch++;
            updateTaskCounter('scratch', taskProgress.scratch);
            if (taskProgress.scratch === adminSettings.taskLimits.scratch) {
                currentBalance += adminSettings.rewards.scratch;
                updateBalanceDisplay();
                tg.showAlert(`Task Complete! You earned $${adminSettings.rewards.scratch.toFixed(2)}.`);
            }
            setTimeout(() => { scratchCard.classList.remove('is-flipped'); }, 3000);
        });
    });

    document.getElementById('copy-link-btn').addEventListener('click', (e) => {
        navigator.clipboard.writeText(document.getElementById('referral-link').value).then(() => {
            e.target.textContent = 'Copied!';
            setTimeout(() => { e.target.textContent = 'Copy'; }, 2000);
        });
    });

    document.querySelector('.withdraw-confirm-btn').addEventListener('click', () => {
        const amount = parseFloat(document.getElementById('amount').value);
        if (amount > 0 && amount <= currentBalance) {
            currentBalance -= amount; updateBalanceDisplay();
            tg.showAlert(`Successfully withdrew $${amount.toFixed(2)}.`);
        } else {
            tg.showAlert('Invalid amount or insufficient balance.');
        }
    });
    
    // --- Initial Call ---
    updateBalanceDisplay();
    populateUserData();
    populateAdminSettings();
    initializeVideoTasks();
    updateTaskCounter('spin', taskProgress.spin);
    updateTaskCounter('scratch', taskProgress.scratch);
});
