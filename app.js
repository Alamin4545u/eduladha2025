document.addEventListener('DOMContentLoaded', () => {
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
    const withdrawBtn = document.getElementById('withdraw-btn');
    const modal = document.getElementById('withdraw-modal');
    const closeBtn = document.querySelector('.close');
    const withdrawForm = document.getElementById('withdraw-form');
    const methodSelect = document.getElementById('method');
    const amountSelect = document.getElementById('amount');
    const numberInput = document.getElementById('number');
    const withdrawStatus = document.getElementById('withdraw-status');

    let currentUser = null;
    let withdrawMethods = [];

    async function initializeApp() {
        tg.ready();
        statusElem.textContent = 'Loading user data...';
        const tgUser = tg.initDataUnsafe?.user;
        if (!tgUser) { statusElem.textContent = 'Could not get user data from Telegram.'; return; }
        try {
            let { data: user, error: fetchError } = await supabase.from('users').select('*').eq('telegram_id', tgUser.id).single();
            if (fetchError && fetchError.code === 'PGRST116') {
                statusElem.textContent = 'Creating your profile...';
                const { data: newUser, error: insertError } = await supabase.from('users').insert({ telegram_id: tgUser.id, first_name: tgUser.first_name, last_name: tgUser.last_name, username: tgUser.username }).select().single();
                if (insertError) throw insertError;
                user = newUser;
            } else if (fetchError) { throw fetchError; }
            currentUser = user;
            if (currentUser.is_banned) { document.body.innerHTML = '<h1>Your account is banned.</h1>'; return; }
            updateUserUI(currentUser);
            await loadTasks();
            const { data: settings } = await supabase.from('settings').select('giga_app_id').single();
            if (settings && settings.giga_app_id) { loadGigaScript(settings.giga_app_id); } else { statusElem.textContent = 'Ad service not configured.'; }
        } catch (error) { console.error('Initialization Error:', error); statusElem.textContent = `Error: ${error.message}`; }
    }

    function updateUserUI(user) { if (!user) return; nameElem.textContent = user.first_name; balanceElem.textContent = `৳${parseFloat(user.balance).toFixed(2)}`; adViewsElem.textContent = user.ad_views; statusElem.textContent = ''; }
    function loadGigaScript(appId) { if (document.querySelector(`script[src*="gigapub.tech"]`)) { watchAdBtn.disabled = false; return; } const script = document.createElement('script'); script.src = `https://ad.gigapub.tech/script?id=${appId}`; script.onload = () => { watchAdBtn.disabled = false; }; document.head.appendChild(script); }

    document.querySelectorAll('.tab-button').forEach(button => { button.addEventListener('click', () => { document.querySelectorAll('.tab-button, .tab-content').forEach(el => el.classList.remove('active')); button.classList.add('active'); document.getElementById(button.dataset.tab).classList.add('active'); }); });

    async function loadTasks() { if (!currentUser) return; const { data: tasks } = await supabase.from('tasks').select('*').eq('is_active', true).order('id'); const { data: progress } = await supabase.from('user_task_progress').select('*').eq('user_telegram_id', currentUser.telegram_id); if (!tasks || tasks.length === 0) { taskListElem.innerHTML = '<p>No tasks available right now.</p>'; return; } taskListElem.innerHTML = ''; tasks.forEach(task => { const userProgress = progress.find(p => p.task_id === task.id) || { ads_watched: 0, completed: false }; const percentage = Math.min((userProgress.ads_watched / task.required_ads) * 100, 100); const card = document.createElement('div'); card.className = 'task-card'; card.innerHTML = `<h3_>`${task.title}</h3><p>${task.description || ''}</p><p>Reward: <b>৳${task.reward}</b></p><div class="progress-bar"><div style="width: ${percentage}%"></div></div><p>Progress: ${userProgress.ads_watched} / ${task.required_ads} ads</p><button class="btn task-btn" data-task-id="${task.id}" ${userProgress.completed ? 'disabled' : ''}>${userProgress.completed ? 'Completed' : 'Watch Ad'}</button>`; taskListElem.appendChild(card); }); document.querySelectorAll('.task-btn').forEach(button => button.addEventListener('click', startTask)); }
    async function startTask(event) { const button = event.target; const taskId = button.dataset.taskId; button.disabled = true; button.textContent = 'Loading Ad...'; try { await window.showGiga(); const { data, error } = await supabase.rpc('update_task_progress', { task_id_param: parseInt(taskId), user_id_param: currentUser.telegram_id }); if (error) throw error; const result = data[0]; currentUser.balance = result.new_balance; updateUserUI(currentUser); loadTasks(); statusElem.textContent = result.is_completed ? `Task completed! You earned ৳${result.reward_amount}` : 'Ad watched! Keep going.'; } catch (e) { statusElem.textContent = 'Ad failed or was skipped.'; button.disabled = false; button.textContent = 'Watch Ad'; } }
    
    watchAdBtn.addEventListener('click', async () => { watchAdBtn.disabled = true; statusElem.textContent = 'Loading ad...'; try { await window.showGiga(); const { data, error } = await supabase.rpc('claim_reward', { user_telegram_id: currentUser.telegram_id }); if (error) throw error; const result = data[0]; currentUser.balance = result.new_balance; currentUser.ad_views = result.new_ad_views; updateUserUI(currentUser); statusElem.textContent = 'Reward claimed successfully!'; } catch (e) { statusElem.textContent = e.message || 'Ad failed or was skipped.'; } finally { watchAdBtn.disabled = false; } });
    
    withdrawBtn.onclick = async () => { const { data } = await supabase.from('withdraw_methods').select('*').eq('is_active', true); withdrawMethods = data; methodSelect.innerHTML = withdrawMethods.map(m => `<option value="${m.name}">${m.name}</option>`).join(''); updateAmountOptions(); modal.style.display = "flex"; };
    closeBtn.onclick = () => { modal.style.display = "none"; }; window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; };
    methodSelect.onchange = updateAmountOptions; function updateAmountOptions() { const selectedMethod = withdrawMethods.find(m => m.name === methodSelect.value); if (selectedMethod) { amountSelect.innerHTML = selectedMethod.amounts.map(a => `<option value="${a}">৳${a}</option>`).join(''); } }
    withdrawForm.addEventListener('submit', async (e) => { e.preventDefault(); withdrawStatus.textContent = 'Processing...'; const amount = parseFloat(amountSelect.value); if (!currentUser || currentUser.balance < amount) { withdrawStatus.textContent = 'Insufficient balance!'; return; } const { error } = await supabase.from('withdraw_requests').insert({ user_id: currentUser.telegram_id, method: methodSelect.value, amount: amount, account_number: numberInput.value }); if (error) { withdrawStatus.textContent = `Error: ${error.message}`; } else { const newBalance = currentUser.balance - amount; await supabase.from('users').update({ balance: newBalance }).eq('telegram_id', currentUser.telegram_id); currentUser.balance = newBalance; updateUserUI(currentUser); withdrawStatus.textContent = 'Request sent successfully!'; setTimeout(() => { modal.style.display = "none"; withdrawStatus.textContent = ""; }, 2000); } });

    initializeApp();
});
