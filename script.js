document.addEventListener('DOMContentLoaded', function () {
    // --- Safety Check for Telegram Environment ---
    if (typeof Telegram === 'undefined' || !window.Telegram.WebApp) {
        document.body.innerHTML = `<div style="text-align: center; padding: 50px; color: white; font-size: 18px;">Please open this app inside Telegram.</div>`;
        return;
    }
    
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

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

    const checkVpnAndProceed = async (button, action) => {
        if (!adminSettings.vpnRequired) { action(); return; }

        const originalHTML = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<span>Checking...</span>';

        try {
            const response = await fetch('https://ipinfo.io/json?token=1151161c93b97a');
            if (!response.ok) throw new Error('Network response failed');
            
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
            if (button.textContent !== 'Claimed') {
                button.disabled = false;
                button.innerHTML = originalHTML;
            }
        }
    };

    const showGigaAd = (callback, button) => {
        if (button) button.disabled = true;
        const originalHTML = button ? button.innerHTML : '';

        // Check if GigaPay script is loaded
        if (typeof window.showGiga === 'function') {
            window.showGiga()
                .then(() => { if (callback) callback(); })
                .catch(e => {
                    tg.showAlert('Ad could not be loaded. Please try again.');
                    console.error("GigaPay Ad Error: ", e);
                })
                .finally(() => {
                    if (button && button.textContent !== 'Claimed') {
                        button.disabled = false;
                        button.innerHTML = originalHTML;
                    }
                });
        } else {
            // Fallback if GigaPay fails to load
            tg.showAlert('Ad service is currently unavailable.');
            if (button) {
                button.disabled = false;
                button.innerHTML = originalHTML;
            }
        }
    };
    
    const populateUserData = () => {
        const name = user?.first_name || 'User';
        const username = user?.username ? `@${user.username}` : '@username';
        document.getElementById('user-name').textContent = name;
        document.getElementById('user-username').textContent = username;
        document.getElementById('profile-name').textContent = name;
        document.getElementById('profile-username').textContent = username;
        if (user) document.getElementById('referral-link').value = `${adminSettings.botLink}?start=${user.id}`;
    };
    
    const updateTaskCounter = (taskName, progress) => {
        const counter = document.getElementById(`${taskName}-counter`);
        if (counter) counter.textContent = `${progress}/${adminSettings.taskLimits[taskName]}`;
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
    allNavItems.forEach(item => {
        const targetPage = item.dataset.target;
        if (!Object.values(protectedNavs).includes(targetPage)) {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                switchPage(targetPage);
            });
        }
    });
    
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
            showGigaAd(() => {
                currentBalance += adminSettings.rewards.dailyBonus;
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
            if (taskProgress.video[taskId] >= adminSettings.taskLimits.video) return;

            showGigaAd(() => {
                taskProgress.video[taskId]++;
                updateVideoTaskUI(card, taskProgress.video[taskId]);
                tg.HapticFeedback.notificationOccurred('success');
            }, e.target);
        });
    });

    spinBtn.addEventListener('click', (e) => {
        if (isSpinning || taskProgress.spin >= adminSettings.taskLimits.spin) return;
        isSpinning = true;
        
        showGigaAd(() => {
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
        
        showGigaAd(() => {
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

    // --- Other Event Listeners ---
    document.getElementById('copy-link-btn').addEventListener('click', (e) => { /* ... (code remains same) */ });
    document.querySelector('.withdraw-confirm-btn').addEventListener('click', () => { /* ... (code remains same) */ });
    
    // --- Initial Call ---
    updateBalanceDisplay();
    populateUserData();
    document.getElementById('referral-notice').textContent = adminSettings.referralNotice;
    document.getElementById('referral-reward-info').textContent = `$${adminSettings.rewardPerReferral.toFixed(2)}`;
    initializeVideoTasks();
    updateTaskCounter('spin', taskProgress.spin);
    updateTaskCounter('scratch', taskProgress.scratch);
});
