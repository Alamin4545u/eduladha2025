const SUPABASE_URL = 'https://wcmgdhyizhykqblndnhx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjbWdkaHlpemh5a3FibG5kbmh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMzM0MjAsImV4cCI6MjA3ODgwOTQyMH0.XuBmH3m0IMgdKen-By42CYlMMC9hhiijr_kDRqWJrp4';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const tg = window.Telegram.WebApp;

// DOM Elements
const nameElem = document.getElementById('name');
const balanceElem = document.getElementById('balance');
const adViewsElem = document.getElementById('ad-views');
const watchAdBtn = document.getElementById('watch-ad-btn');
const statusElem = document.getElementById('status');
const taskListElem = document.getElementById('task-list');

let currentUser = null;

// --- Tab Navigation ---
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-button, .tab-content').forEach(el => el.classList.remove('active'));
        button.classList.add('active');
        document.getElementById(button.dataset.tab).classList.add('active');
    });
});

// --- Main App Logic ---
async function initializeApp() {
    tg.ready();
    const tgUser = tg.initDataUnsafe?.user;
    if (!tgUser) { statusElem.textContent = 'Telegram user not found.'; return; }

    const { data: settings } = await supabase.from('settings').select('giga_app_id').single();
    if (settings && settings.giga_app_id) {
        loadGigaScript(settings.giga_app_id);
    } else {
        statusElem.textContent = 'Ad service not configured.';
    }

    const { data: user, error } = await supabase.from('users').select('*').eq('telegram_id', tgUser.id).single();
    if(error && error.code === 'PGRST116') {
        const {data: newUser} = await supabase.from('users').insert({telegram_id: tgUser.id, first_name: tgUser.first_name, last_name: tgUser.last_name, username: tgUser.username}).select().single();
        currentUser = newUser;
    } else {
        currentUser = user;
    }

    if (currentUser) {
        if(currentUser.is_banned) {
            document.body.innerHTML = '<h1>You are banned.</h1>';
            return;
        }
        updateUserUI(currentUser);
        loadTasks();
    }
}

function updateUserUI(user) {
    nameElem.textContent = user.first_name;
    balanceElem.textContent = `৳${parseFloat(user.balance).toFixed(2)}`;
    adViewsElem.textContent = user.ad_views;
}

function loadGigaScript(appId) {
    if (document.querySelector(`script[src*="gigapub.tech"]`)) return;
    const script = document.createElement('script');
    script.src = `https://ad.gigapub.tech/script?id=${appId}`;
    script.onload = () => { watchAdBtn.disabled = false; };
    document.head.appendChild(script);
}

async function loadTasks() {
    const { data: tasks } = await supabase.from('tasks').select('*').eq('is_active', true).order('id');
    const { data: progress } = await supabase.from('user_task_progress').select('*').eq('user_telegram_id', currentUser.telegram_id);
    
    if (!tasks) { taskListElem.innerHTML = '<p>Could not load tasks.</p>'; return; }
    if (tasks.length === 0) { taskListElem.innerHTML = '<p>No tasks available right now.</p>'; return; }

    taskListElem.innerHTML = '';
    tasks.forEach(task => {
        const userProgress = progress.find(p => p.task_id === task.id) || { ads_watched: 0, completed: false };
        const percentage = (userProgress.ads_watched / task.required_ads) * 100;

        const card = document.createElement('div');
        card.className = 'task-card';
        card.innerHTML = `
            <h3>${task.title}</h3>
            <p>${task.description || ''}</p>
            <p>Reward: <b>৳${task.reward}</b></p>
            <div class="progress-bar"><div style="width: ${percentage}%"></div></div>
            <p>Progress: ${userProgress.ads_watched} / ${task.required_ads} ads</p>
            <button class="btn task-btn" data-task-id="${task.id}" ${userProgress.completed ? 'disabled' : ''}>
                ${userProgress.completed ? 'Completed' : 'Watch Ad'}
            </button>
        `;
        taskListElem.appendChild(card);
    });

    document.querySelectorAll('.task-btn').forEach(button => button.addEventListener('click', startTask));
}

async function startTask(event) {
    const button = event.target;
    const taskId = button.dataset.taskId;
    
    button.disabled = true;
    button.textContent = 'Loading Ad...';

    try {
        await window.showGiga();
        
        const { data, error } = await supabase.rpc('update_task_progress', {
            task_id_param: parseInt(taskId),
            user_id_param: currentUser.telegram_id
        });

        if (error) throw error;
        
        const result = data[0];
        currentUser.balance = result.new_balance;
        updateUserUI(currentUser);
        loadTasks();

        if (result.is_completed) {
            statusElem.textContent = `Task completed! You earned ৳${result.reward_amount}`;
        } else {
             statusElem.textContent = 'Ad watched! Keep going.';
        }

    } catch (e) {
        statusElem.textContent = 'Ad failed or was skipped.';
        button.disabled = false;
        button.textContent = 'Watch Ad';
    }
}

watchAdBtn.addEventListener('click', async () => {
    watchAdBtn.disabled = true;
    statusElem.textContent = 'Loading ad...';
    try {
        await window.showGiga();
        const { data, error } = await supabase.rpc('claim_reward', { user_telegram_id: currentUser.telegram_id });
        if (error) throw error;
        
        const result = data[0];
        currentUser.balance = result.new_balance;
        currentUser.ad_views = result.new_ad_views;
        updateUserUI(currentUser);
        statusElem.textContent = 'Reward claimed successfully!';
    } catch (e) {
        statusElem.textContent = e.message || 'Ad failed or was skipped.';
    } finally {
        watchAdBtn.disabled = false;
    }
});

initializeApp();
