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
    let gigaLoaded = false;

    // Initialize
    async function initializeApp() {
        tg.ready();
        tg.expand(); // Full screen

        statusElem.textContent = 'Initializing...';
        const tgUser = tg.initDataUnsafe?.user;

        if (!tgUser) {
            showError('Telegram user data not found.');
            return;
        }

        try {
            let { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('telegram_id', tgUser.id)
                .maybeSingle();

            if (!user) {
                statusElem.textContent = 'Creating profile...';
                const { data: newUser, error: insertError } = await supabase
                    .from('users')
                    .insert({
                        telegram_id: tgUser.id,
                        first_name: tgUser.first_name || 'User',
                        last_name: tgUser.last_name || '',
                        username: tgUser.username || ''
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;
                user = newUser;
            }

            if (error && error.code !== 'PGRST116') throw error;

            if (user.is_banned) {
                document.body.innerHTML = '<h1 style="text-align:center; color:red;">Your account is banned.</h1>';
                return;
            }

            currentUser = user;
            updateUserUI();
            await loadWithdrawMethods();
            await loadTasks();
            await loadAdService();

        } catch (err) {
            console.error('Init Error:', err);
            showError(`Failed to load: ${err.message}`);
        }
    }

    function updateUserUI() {
        if (!currentUser) return;
        nameElem.textContent = currentUser.first_name || 'User';
        balanceElem.textContent = `৳${parseFloat(currentUser.balance || 0).toFixed(2)}`;
        adViewsElem.textContent = currentUser.ad_views || 0;
        statusElem.textContent = '';
    }

    async function loadAdService() {
        const { data: settings, error } = await supabase.from('settings').select('giga_app_id').single();
        if (error || !settings?.giga_app_id) {
            showError('Ad service not configured.');
            return;
        }

        if (document.querySelector(`script[src*="gigapub.tech"]`)) {
            gigaLoaded = true;
            enableWatchButtons();
            return;
        }

        const script = document.createElement('script');
        script.src = `https://ad.gigapub.tech/script?id=${settings.giga_app_id}`;
        script.onload = () => {
            gigaLoaded = typeof window.showGiga === 'function';
            if (gigaLoaded) {
                enableWatchButtons();
            } else {
                showError('Ad script loaded but showGiga not available.');
            }
        };
        script.onerror = () => {
            showError('Failed to load ad script.');
        };
        document.head.appendChild(script);
    }

    function enableWatchButtons() {
        watchAdBtn.disabled = false;
        document.querySelectorAll('.task-btn').forEach(btn => {
            if (!btn.dataset.completed) btn.disabled = false;
        });
    }

    // Tab Switching
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    // Load Tasks
    async function loadTasks() {
        taskListElem.innerHTML = '<p>Loading tasks...</p>';
        const { data: tasks, error: taskError } = await supabase
            .from('tasks')
            .select('*')
            .eq('is_active', true)
            .order('id');

        const { data: progress, error: progError } = await supabase
            .from('user_task_progress')
            .select('*')
            .eq('user_telegram_id', currentUser.telegram_id);

        if (taskError || progError || !tasks?.length) {
            taskListElem.innerHTML = '<p class="error">No tasks available.</p>';
            return;
        }

        taskListElem.innerHTML = '';
        tasks.forEach(task => {
            const prog = progress?.find(p => p.task_id === task.id) || { ads_watched: 0, completed: false };
            const percent = Math.min((prog.ads_watched / task.required_ads) * 100, 100);

            const card = document.createElement('div');
            card.className = 'task-card';
            card.innerHTML = `
                <h3>${task.title}</h3>
                <p>${task.description || ''}</p>
                <p>Reward: <b>৳${task.reward}</b></p>
                <div class="progress-bar"><div style="width: ${percent}%"></div></div>
                <p>Progress: ${prog.ads_watched} / ${task.required_ads} ads</p>
                <button class="btn btn-green task-btn" data-task-id="${task.id}" ${prog.completed ? 'disabled' : ''}>
                    ${prog.completed ? 'Completed' : 'Watch Ad'}
                </button>
            `;
            taskListElem.appendChild(card);
        });

        // Re-attach event listeners
        document.querySelectorAll('.task-btn').forEach(btn => {
            btn.onclick = () => handleTaskAd(btn);
        });
    }

    async function handleTaskAd(btn) {
        if (!gigaLoaded) {
            showError('Ad system not ready.');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Loading...';

        try {
            await window.showGiga();
            const { data, error } = await supabase.rpc('update_task_progress', {
                task_id_param: parseInt(btn.dataset.taskId),
                user_id_param: currentUser.telegram_id
            });

            if (error) throw error;
            const result = data[0];
            currentUser.balance = result.new_balance;

            updateUserUI();
            await loadTasks();

            showSuccess(result.is_completed
                ? `Task completed! +৳${result.reward_amount}`
                : 'Ad watched!'
            );
        } catch (err) {
            console.error(err);
            showError('Ad failed or skipped.');
            btn.disabled = false;
            btn.textContent = 'Watch Ad';
        }
    }

    // Direct Ad Watch
    watchAdBtn.onclick = async () => {
        if (!gigaLoaded) {
            showError('Ad not ready.');
            return;
        }
        watchAdBtn.disabled = true;
        showStatus('Loading ad...');

        try {
            await window.showGiga();
            const { data, error } = await supabase.rpc('claim_reward', {
                user_telegram_id: currentUser.telegram_id
            });

            if (error) throw error;
            const result = data[0];
            currentUser.balance = result.new_balance;
            currentUser.ad_views = result.new_ad_views;

            updateUserUI();
            showSuccess('Reward claimed!');
        } catch (err) {
            showError(err.message || 'Ad failed.');
        } finally {
            watchAdBtn.disabled = false;
        }
    };

    // Withdraw
    async function loadWithdrawMethods() {
        const { data, error } = await supabase.from('withdraw_methods').select('*').eq('is_active', true);
        if (error || !data?.length) return;
        withdrawMethods = data;
    }

    withdrawBtn.onclick = () => {
        if (withdrawMethods.length === 0) {
            showError('No withdrawal methods available.');
            return;
        }
        methodSelect.innerHTML = withdrawMethods.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
        updateAmountOptions();
        modal.style.display = 'flex';
    };

    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

    methodSelect.onchange = updateAmountOptions;
    function updateAmountOptions() {
        const method = withdrawMethods.find(m => m.name === methodSelect.value);
        if (method) {
            amountSelect.innerHTML = method.amounts.map(a => `<option value="${a}">৳${a}</option>`).join('');
        }
    }

    withdrawForm.onsubmit = async (e) => {
        e.preventDefault();
        withdrawStatus.textContent = 'Processing...';
        withdrawStatus.className = '';

        const amount = parseFloat(amountSelect.value);
        if (currentUser.balance < amount) {
            showWithdrawError('Insufficient balance!');
            return;
        }

        const { error } = await supabase.from('withdraw_requests').insert({
            user_id: currentUser.telegram_id,
            method: methodSelect.value,
            amount,
            account_number: numberInput.value
        });

        if (error) {
            showWithdrawError(`Error: ${error.message}`);
        } else {
            currentUser.balance -= amount;
            await supabase.from('users').update({ balance: currentUser.balance }).eq('telegram_id', currentUser.telegram_id);
            updateUserUI();
            showWithdrawSuccess('Request sent!');
            setTimeout(() => { modal.style.display = 'none'; }, 2000);
        }
    };

    // Helper Functions
    function showError(msg) { statusElem.textContent = msg; statusElem.className = 'error'; }
    function showSuccess(msg) { statusElem.textContent = msg; statusElem.className = 'success'; }
    function showStatus(msg) { statusElem.textContent = msg; statusElem.className = ''; }
    function showWithdrawError(msg) { withdrawStatus.textContent = msg; withdrawStatus.className = 'error'; }
    function showWithdrawSuccess(msg) { withdrawStatus.textContent = msg; withdrawStatus.className = 'success'; }

    // Start
    initializeApp();
});
