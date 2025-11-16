document.addEventListener('DOMContentLoaded', () => {
  const SUPABASE_URL = 'https://wcmgdhyizhykqblndnhx.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjbWdkaHlpemh5a3FibG5kbmh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMzM0MjAsImV4cCI6MjA3ODgwOTQyMH0.XuBmH3m0IMgdKen-By42CYlMMC9hhiijr_kDRqWJrp4';
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const tg = window.Telegram.WebApp;

  // DOM Elements
  const els = {
    mainScreen: document.getElementById('main-screen'),
    tasksScreen: document.getElementById('tasks-screen'),
    profilePic: document.getElementById('profile-pic'),
    username: document.getElementById('username'),
    userId: document.getElementById('user-id'),
    balance: document.getElementById('balance'),
    adViews: document.getElementBy gId('ad-views'),
    watchAdBtn: document.getElementById('watch-ad-btn'),
    withdrawBtn: document.getElementById('withdraw-btn'),
    mainEarnBtn: document.getElementById('main-earn-btn'),
    status: document.getElementById('status'),
    checkinCard: document.getElementById('daily-checkin'),
    checkinBtn: document.getElementById('checkin-btn'),
    checkinReward: document.getElementById('checkin-reward'),
    referralCode: document.getElementById('referral-code'),
    referralReward: document.getElementById('referral-reward'),
    referralCount: document.getElementById('referral-count'),
    referralEarned: document.getElementById('referral-earned'),
    taskList: document.getElementById('task-list'),
    confetti: document.getElementById('confetti'),
    backBtn: document.getElementById('back-btn'),
    tasksTab: document.getElementById('tasks-tab')
  };

  let currentUser = null;
  let settings = {};
  let gigaLoaded = false;

  // Init
  tg.ready(); tg.expand();
  document.body.setAttribute('data-theme', tg.colorScheme || 'dark');

  // Confetti
  function showConfetti() {
    for (let i = 0; i < 50; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-piece';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = `hsl(${Math.random()*360}, 80%, 60%)`;
      p.style.animationDelay = Math.random() * 2 + 's';
      els.confetti.appendChild(p);
    }
    setTimeout(() => els.confetti.innerHTML = '', 3000);
  }

  // Show Message
  function showStatus(msg, type = 'error') {
    els.status.textContent = msg;
    els.status.className = type;
  }

  // Init User
  async function init() {
    const tgUser = tg.initDataUnsafe?.user;
    if (!tgUser) return showStatus('User not found');

    els.profilePic.src = tgUser.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(tgUser.first_name)}&background=3b82f6&color=fff&size=128`;
    els.username.textContent = `${tgUser.first_name} ${tgUser.last_name || ''}`.trim();
    els.userId.textContent = `@${tgUser.username || tgUser.id}`;

    let { data: user } = await supabase.from('users').select('*').eq('telegram_id', tgUser.id).maybeSingle();
    if (!user) {
      const { data: newUser } = await supabase.from('users').insert({
        telegram_id: tgUser.id,
        first_name: tgUser.first_name,
        last_name: tgUser.last_name || '',
        username: tgUser.username || ''
      }).select().single();
      user = newUser;
    }
    if (user.is_banned) return document.body.innerHTML = '<h1 style="text-align:center;color:red;padding:20px;">Banned</h1>';
    currentUser = user;
    updateUI();

    await Promise.all([
      loadSettings(),
      loadAdService(),
      loadDailyCheckin(),
      loadReferralSystem()
    ]);

    await handleReferralStart();
    startRealtimeUpdates();

    // Navigation
    els.tasksTab.onclick = () => { els.mainScreen.style.display = 'none'; els.tasksScreen.style.display = 'flex'; loadTasks(); };
    els.backBtn.onclick = () => { els.tasksScreen.style.display = 'none'; els.mainScreen.style.display = 'flex'; };
  }

  function updateUI() {
    els.balance.textContent = `৳${parseFloat(currentUser.balance || 0).toFixed(2)}`;
    els.adViews.textContent = currentUser.ad_views || 0;
    els.mainEarnBtn.textContent = `Earn ৳${settings.reward_per_ad || 0.1}`;
  }

  // Realtime
  function startRealtimeUpdates() {
    setInterval(async () => {
      if (!currentUser) return;
      const { data } = await supabase.from('users').select('balance, ad_views').eq('telegram_id', currentUser.telegram_id).single();
      if (data) { currentUser.balance = data.balance; currentUser.ad_views = data.ad_views; updateUI(); }
      await loadDailyCheckin();
    }, 3000);
  }

  // Settings
  async function loadSettings() {
    const { data } = await supabase.from('settings').select('*').single();
    settings = data || {};
    updateUI();
  }

  // Ad Service
  async function loadAdService() {
    if (!settings.giga_app_id) return;
    const script = document.createElement('script');
    script.src = `https://giga.pub/script?id=${settings.giga_app_id}`;
    script.onload = () => { gigaLoaded = true; els.watchAdBtn.disabled = false; };
    script.onerror = () => {
      window.showGiga = () => new Promise(r => setTimeout(r, 2000));
      gigaLoaded = true; els.watchAdBtn.disabled = false;
    };
    document.head.appendChild(script);
  }

  // Daily Check-in
  async function loadDailyCheckin() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('daily_checkins').select('*').eq('user_id', currentUser.telegram_id).eq('date', today).maybeSingle();
    if (settings.daily_checkin_enabled && !data) {
      els.checkinCard.style.display = 'block';
      els.checkinReward.textContent = `৳${settings.daily_checkin_reward || 0.10}`;
      els.checkinBtn.onclick = handleDailyCheckin;
    } else {
      els.checkinCard.style.display = 'none';
    }
  }

  async function handleDailyCheckin() {
    if (!gigaLoaded) return showStatus('Ad not ready');
    els.checkinBtn.textContent = 'Loading...';
    try {
      await window.showGiga();
      const { data } = await supabase.rpc('claim_daily_checkin', { user_telegram_id: currentUser.telegram_id });
      currentUser.balance = data.new_balance;
      updateUI();
      showStatus('Check-in success!', 'success');
      showConfetti();
      loadDailyCheckin();
    } catch { els.checkinBtn.textContent = 'Check-in Now'; }
  }

  // Referral
  async function loadReferralSystem() {
    const code = `REF${currentUser.telegram_id}`;
    els.referralCode.textContent = code;
    els.referralReward.textContent = (settings.referral_reward || 5).toFixed(2);

    const { data: refs } = await supabase.from('referrals').select('reward_given').eq('referrer_id', currentUser.telegram_id);
    const successful = refs?.filter(r => r.reward_given).length || 0;
    els.referralCount.textContent = refs?.length || 0;
    els.referralEarned.textContent = (successful * (settings.referral_reward || 5)).toFixed(2);
  }

  window.share = (platform) => {
    const link = `https://t.me/your_earn_bot?start=REF${currentUser.telegram_id}`;
    const text = `Join Bkash Earn Pro & get ৳5 FREE!\n\n${link}`;
    if (platform === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    else tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}`);
  };

  window.copyLink = () => {
    navigator.clipboard.writeText(`https://t.me/your_earn_bot?start=REF${currentUser.telegram_id}`).then(() => showStatus('Copied!', 'success'));
  };

  async function handleReferralStart() {
    const payload = tg.initDataUnsafe?.start_param;
    if (!payload || !payload.startsWith('REF')) return;
    const referrerId = payload.replace('REF', '');
    if (referrerId == currentUser.telegram_id) return;

    const { data } = await supabase.rpc('claim_referral_reward', {
      referrer_telegram_id: +referrerId,
      referred_telegram_id: currentUser.telegram_id
    });
    if (data?.success) {
      showStatus(`+৳${data.reward} from referral!`, 'success');
      currentUser.balance = data.new_balance;
      updateUI();
      showConfetti();
    }
  }

  // Watch Ad
  els.watchAdBtn.onclick = els.mainEarnBtn.onclick = async () => {
    if (!gigaLoaded) return showStatus('Ad not ready');
    els.watchAdBtn.disabled = true;
    try {
      await window.showGiga();
      const { data } = await supabase.rpc('claim_reward', { user_telegram_id: currentUser.telegram_id });
      currentUser.balance = data.new_balance;
      currentUser.ad_views = data.new_ad_views;
      updateUI();
      showStatus('Reward added!', 'success');
      showConfetti();
    } catch { }
    els.watchAdBtn.disabled = false;
  };

  // Tasks
  async function loadTasks() {
    els.taskList.innerHTML = 'Loading...';
    const { data: tasks } = await supabase.from('tasks').select('*').eq('is_active', true);
    const { data: progress } = await supabase.from('user_task_progress').select('*').eq('user_telegram_id', currentUser.telegram_id);
    els.taskList.innerHTML = tasks.map(t => {
      const p = progress.find(x => x.task_id === t.id) || { ads_watched: 0, completed: false };
      const percent = Math.min((p.ads_watched / t.required_ads) * 100, 100);
      return `<div class="task-card">... [same as before] ...</div>`;
    }).join('');
  }

  // Withdraw (simplified)
  els.withdrwithdrawBtnck = () => alert('Withdraw coming soon!');

  init();
});
