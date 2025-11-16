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

let currentUser = null;
let appSettings = null;

// GigaPub স্ক্রিপ্টটি ডায়নামিকভাবে যোগ করার ফাংশন
function loadGigaScript(appId) {
    if (!appId) {
        statusElem.textContent = 'Ad service is not configured.';
        return;
    }
    const script = document.createElement('script');
    script.src = `https://ad.gigapub.tech/script?id=${appId}`;
    script.onload = () => {
        watchAdBtn.disabled = false;
        statusElem.textContent = 'Ready to watch ads!';
    };
    script.onerror = () => {
        statusElem.textContent = 'Could not load ad script.';
    };
    document.head.appendChild(script);
}

// UI আপডেট করার ফাংশন
function updateUserUI(user) {
    nameElem.textContent = `${user.first_name} ${user.last_name || ''}`;
    balanceElem.textContent = `৳${parseFloat(user.balance).toFixed(2)}`;
    adViewsElem.textContent = user.ad_views;
}

// অ্যাপ শুরু করার মূল ফাংশন
async function initializeApp() {
    tg.ready();

    // ধাপ ১: সেটিংস আনা
    const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single();

    if (settingsError || !settingsData) {
        statusElem.textContent = 'Could not load app settings.';
        return;
    }
    appSettings = settingsData;
    loadGigaScript(appSettings.giga_app_id);

    // ধাপ ২: ব্যবহারকারীর ডেটা আনা ও তৈরি করা
    const tgUser = tg.initDataUnsafe?.user;
    if (!tgUser) {
        statusElem.textContent = 'Could not retrieve user data from Telegram.';
        return;
    }

    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', tgUser.id)
        .single();
    
    if (userError && userError.code === 'PGRST116') {
        // ব্যবহারকারী নতুন হলে তৈরি করা
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
                telegram_id: tgUser.id,
                first_name: tgUser.first_name,
                last_name: tgUser.last_name,
                username: tgUser.username,
            }).select().single();
        
        if (createError) {
             statusElem.textContent = 'Failed to create user profile.';
             return;
        }
        currentUser = newUser;
    } else if (userError) {
        statusElem.textContent = 'Failed to fetch user profile.';
        return;
    } else {
        currentUser = userData;
    }

    updateUserUI(currentUser);
}

// অ্যাড দেখার বাটন ক্লিক করলে যা হবে
watchAdBtn.addEventListener('click', async () => {
    if (!window.showGiga) {
        alert('Ad service is not ready. Please wait.');
        return;
    }
    
    watchAdBtn.disabled = true;
    statusElem.textContent = 'Loading ad...';

    try {
        await window.showGiga();
        // অ্যাড সফলভাবে দেখা হলে
        const newAdViews = currentUser.ad_views + 1;
        const newBalance = parseFloat(currentUser.balance) + parseFloat(appSettings.reward_per_ad);

        const { data: updatedUser, error } = await supabase
            .from('users')
            .update({
                ad_views: newAdViews,
                balance: newBalance
            })
            .eq('telegram_id', currentUser.telegram_id)
            .select()
            .single();

        if (error) throw error;
        
        currentUser = updatedUser;
        updateUserUI(currentUser);
        statusElem.textContent = `Reward of ৳${appSettings.reward_per_ad} added!`;

    } catch (e) {
        // অ্যাড দেখতে কোনো সমস্যা হলে
        statusElem.textContent = 'Ad failed to load or was skipped.';
        console.error('Ad error:', e);
    } finally {
        watchAdBtn.disabled = false;
    }
});

initializeApp();
