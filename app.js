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

async function initializeApp() {
    tg.ready();
    const tgUser = tg.initDataUnsafe?.user;
    if (!tgUser) { statusElem.textContent = 'Telegram user not found.'; return; }

    const { data: user, error } = await supabase.from('users').select('*').eq('telegram_id', tgUser.id).single();
    currentUser = user;

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

async function loadTasks() {
    const { data: tasks, error: tasksError } = await supabase.from('tasks').select('*');
    const { data: progress, error: progressError } = await supabase.from('user_task_progress').select('*').eq('user_telegram_id', currentUser.telegram_id);
    
    if (tasksError || progressError) {
        taskListElem.innerHTML = '<p>Could not load tasks.</p>';
        return;
    }

    taskListElem.innerHTML = '';
    tasks.forEach(task => {
        const userProgress = progress.find(p => p.task_id === task.id) || { ads_watched: 0, completed: false };
        const percentage = (userProgress.ads_watched / task.required_ads) * 100;

        const card = document.createElement('div');
        card.className = 'task-card';
        card.innerHTML = `
            <h3>${task.title}</h3>
            <p>${task.description}</p>
            <p>Reward: ৳${task.reward}</p>
            <div class="progress-bar"><div style="width: ${percentage}%"></div></div>
            <p>Progress: ${userProgress.ads_watched} / ${task.required_ads} ads</p>
            <button class="btn" onclick="startTask(${task.id})" ${userProgress.completed ? 'disabled' : ''}>
                ${userProgress.completed ? 'Completed' : 'Watch Ad'}
            </button>
        `;
        taskListElem.appendChild(card);
    });
}

window.startTask = async function(taskId) {
    const button = event.target;
    button.disabled = true;
    button.textContent = 'Loading Ad...';

    // এখানে GigaPub অ্যাড দেখানোর কোড বসবে
    // এই উদাহরণে, আমরা সফলভাবে অ্যাড দেখা হয়েছে ধরে নিচ্ছি
    try {
        // await window.showGiga(); // বাস্তব অ্যাপে এটি আনকমেন্ট করতে হবে
        
        // অ্যাড দেখা সফল হলে, সার্ভারে অগ্রগতি আপডেট করা
        const { data, error } = await supabase.rpc('update_task_progress', {
            task_id_param: taskId,
            user_id_param: currentUser.telegram_id
        });

        if (error) throw error;
        
        // UI আপডেট করা
        currentUser.balance = data.new_balance;
        updateUserUI(currentUser);
        loadTasks(); // টাস্ক লিস্ট রিফ্রেশ করা

        if (data.is_completed) {
            alert(`Task completed! You earned ৳${data.reward_amount}`);
        }

    } catch (e) {
        button.textContent = 'Ad Failed';
        console.error('Task Ad Error:', e);
    }
};

initializeApp();
