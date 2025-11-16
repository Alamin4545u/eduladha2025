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

function updateUserUI(user) {
    nameElem.textContent = user.first_name;
    balanceElem.textContent = `৳${parseFloat(user.balance).toFixed(2)}`;
    adViewsElem.textContent = user.ad_views;
}

function loadGigaScript(appId) {
    const script = document.createElement('script');
    script.src = `https://ad.gigapub.tech/script?id=${appId}`;
    script.onload = () => { watchAdBtn.disabled = false; statusElem.textContent = 'Ready!'; };
    document.head.appendChild(script);
}

async function initializeApp() {
    tg.ready();
    const tgUser = tg.initDataUnsafe?.user;
    if (!tgUser) { statusElem.textContent = 'Telegram user not found.'; return; }
    
    const { data: settings } = await supabase.from('settings').select('giga_app_id').single();
    if (settings) loadGigaScript(settings.giga_app_id);

    const { data: user, error } = await supabase.from('users').select('*').eq('telegram_id', tgUser.id).single();
    if(error && error.code === 'PGRST116') {
        const {data: newUser} = await supabase.from('users').insert({telegram_id: tgUser.id, first_name: tgUser.first_name, last_name: tgUser.last_name, username: tgUser.username}).select().single();
        currentUser = newUser;
    } else {
        currentUser = user;
    }

    if (currentUser) {
        if(currentUser.is_banned) {
            document.body.innerHTML = '<h1 style="text-align:center; color:red; margin-top: 50px;">You are banned.</h1>';
            return;
        }
        updateUserUI(currentUser);
    }
}

watchAdBtn.addEventListener('click', async () => {
    watchAdBtn.disabled = true;
    statusElem.textContent = 'Loading ad...';
    try {
        await window.showGiga();
        const { data, error } = await supabase.rpc('claim_reward');
        if (error) throw new Error(error.message);
        
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

withdrawBtn.onclick = async () => {
    const { data } = await supabase.from('withdraw_methods').select('*').eq('is_active', true);
    withdrawMethods = data;
    methodSelect.innerHTML = withdrawMethods.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
    updateAmountOptions();
    modal.style.display = "flex";
};

closeBtn.onclick = () => modal.style.display = "none";
window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; };

methodSelect.onchange = updateAmountOptions;
function updateAmountOptions() {
    const selectedMethod = withdrawMethods.find(m => m.name === methodSelect.value);
    if (selectedMethod) {
        amountSelect.innerHTML = selectedMethod.amounts.map(a => `<option value="${a}">৳${a}</option>`).join('');
    }
}

withdrawForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    withdrawStatus.textContent = 'Processing...';
    const amount = parseFloat(amountSelect.value);
    
    if (currentUser.balance < amount) {
        withdrawStatus.textContent = 'Insufficient balance!';
        return;
    }

    const { error } = await supabase.from('withdraw_requests').insert({
        user_id: currentUser.telegram_id,
        method: methodSelect.value,
        amount: amount,
        account_number: numberInput.value
    });

    if (error) {
        withdrawStatus.textContent = `Error: ${error.message}`;
    } else {
        const newBalance = currentUser.balance - amount;
        await supabase.from('users').update({ balance: newBalance }).eq('telegram_id', currentUser.telegram_id);
        currentUser.balance = newBalance;
        updateUserUI(currentUser);

        withdrawStatus.textContent = 'Withdrawal request sent successfully!';
        setTimeout(() => {
            modal.style.display = "none";
            withdrawStatus.textContent = "";
        }, 2000);
    }
});

initializeApp();
