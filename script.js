/* 
 * GigaEarn Core Logic
 * Handles User State, Dashboard Updates, and Ad Engine
 */

const CONFIG = {
    adInterval: 10, // Seconds per cycle
    rewardPerAd: 0.0005,
    prefix: 'gigaapp_'
};

// --- User Data Management ---
const User = {
    data: {
        username: null,
        impressions: 0,
        earnings: 0.00,
        id: null
    },

    load() {
        const stored = localStorage.getItem(CONFIG.prefix + 'data');
        if (stored) {
            this.data = JSON.parse(stored);
            return true;
        }
        return false;
    },

    save() {
        localStorage.setItem(CONFIG.prefix + 'data', JSON.stringify(this.data));
    },

    create(username) {
        this.data.username = username;
        this.data.id = 'UID-' + Math.floor(Math.random() * 100000);
        this.save();
    },

    reset() {
        localStorage.removeItem(CONFIG.prefix + 'data');
        location.reload();
    },

    addImpression() {
        this.data.impressions++;
        this.data.earnings += CONFIG.rewardPerAd;
        this.save();
        UI.updateStats();
    }
};

// --- UI Controller ---
const UI = {
    init() {
        // Splash Screen Logic
        setTimeout(() => {
            document.getElementById('splash-screen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('splash-screen').classList.add('hidden');
                this.checkAuth();
            }, 500);
        }, 2000);
    },

    checkAuth() {
        if (User.load()) {
            this.showApp();
        } else {
            document.getElementById('auth-screen').classList.remove('hidden');
        }
    },

    updateStats() {
        // Safe check for DOM elements
        document.getElementById('header-balance').innerText = User.data.earnings.toFixed(4);
        document.getElementById('total-earnings').innerText = '$' + User.data.earnings.toFixed(4);
        document.getElementById('total-impressions').innerText = User.data.impressions;
    },

    showApp() {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        document.getElementById('display-username').innerText = User.data.username;
        document.getElementById('profile-name').innerText = User.data.username;
        document.getElementById('user-id').innerText = User.data.id;
        this.updateStats();
    },

    logger(msg, type = 'system') {
        const consoleEl = document.getElementById('log-console');
        const p = document.createElement('p');
        const time = new Date().toLocaleTimeString().split(' ')[0];
        p.className = `log-entry ${type}`;
        p.innerText = `[${time}] ${msg}`;
        consoleEl.prepend(p);
    },
    
    setTimer(percent, text) {
        const circle = document.getElementById('timer-progress');
        const offset = 283 - (283 * percent) / 100;
        circle.style.strokeDashoffset = offset;
        document.getElementById('countdown').innerText = text;
    }
};

// --- Main App Logic ---
const app = {
    login() {
        const input = document.getElementById('username-input');
        if (input.value.trim().length > 2) {
            User.create(input.value.trim());
            UI.showApp();
        } else {
            alert("Please enter a valid username");
        }
    },

    navTo(viewId, el) {
        // Handle Tab Switching
        document.querySelectorAll('section').forEach(sec => sec.classList.remove('active-view'));
        document.getElementById('view-' + viewId).classList.add('active-view');

        // Handle Nav Highlights
        if (el) {
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            el.classList.add('active');
        }
    },

    logout() {
        location.reload();
    },

    resetData() {
        if(confirm("Are you sure? This will wipe your earnings.")) {
            User.reset();
        }
    }
};

// --- Auto-Impression Engine ---
const engine = {
    isRunning: false,
    timer: null,
    timeLeft: CONFIG.adInterval,

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        document.getElementById('btn-start').classList.add('hidden');
        document.getElementById('btn-stop').classList.remove('hidden');
        document.getElementById('engine-indicator').classList.add('running');
        document.getElementById('engine-text').innerText = "Engine Running";
        
        UI.logger("Engine started. Cycle: 10s");
        this.runCycle();
    },

    stop() {
        this.isRunning = false;
        clearInterval(this.timer);
        this.timeLeft = CONFIG.adInterval;
        UI.setTimer(0, CONFIG.adInterval);
        
        document.getElementById('btn-start').classList.remove('hidden');
        document.getElementById('btn-stop').classList.add('hidden');
        document.getElementById('engine-indicator').classList.remove('running');
        document.getElementById('engine-text').innerText = "Engine Stopped";
        UI.logger("Engine stopped by user.");
    },

    runCycle() {
        this.timeLeft = CONFIG.adInterval;
        
        this.timer = setInterval(() => {
            if (!this.isRunning) return;

            this.timeLeft--;
            const percent = ((CONFIG.adInterval - this.timeLeft) / CONFIG.adInterval) * 100;
            UI.setTimer(percent, this.timeLeft);

            if (this.timeLeft <= 0) {
                this.triggerAd();
                this.timeLeft = CONFIG.adInterval; // Reset for next cycle
            }
        }, 1000);
    },

    async triggerAd() {
        UI.logger("Fetching new ad unit...", "system");
        
        // PAUSE TIMER while ad loads
        clearInterval(this.timer);

        try {
            // Attempt to call Gigapub Function
            if (typeof window.showGiga === 'function') {
                await window.showGiga();
                this.onAdSuccess();
            } else {
                // Fallback for development/demo if script fails to load locally
                console.warn("Gigapub script not detected. Simulating impression.");
                // Simulate network delay
                setTimeout(() => { this.onAdSuccess(); }, 1500);
            }
        } catch (e) {
            UI.logger("Ad load failed. Retrying...", "error");
            this.resumeTimer(); // Just resume if failed
        }
    },

    onAdSuccess() {
        User.addImpression();
        UI.logger("Impression validated! +$" + CONFIG.rewardPerAd, "success");
        
        // Add a cool down visual effect before restarting
        setTimeout(() => {
            this.resumeTimer();
        }, 1000);
    },

    resumeTimer() {
        if(this.isRunning) this.runCycle();
    }
};

// Initialize App on Load
window.addEventListener('DOMContentLoaded', () => {
    UI.init();
});