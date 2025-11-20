import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { HomeTab } from './components/HomeTab';
import { EarnTab } from './components/EarnTab';
import { AiTab } from './components/AiTab';
import { Tab, UserState } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.HOME);
  const [userState, setUserState] = useState<UserState>({
    points: 1250,
    streak: 5,
    lastActive: new Date().toISOString(),
  });

  // Initialize Telegram Web App
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand(); // Open full height
      
      // Set theme color to match app background
      if(window.Telegram.WebApp.setHeaderColor) {
         window.Telegram.WebApp.setHeaderColor('#000000');
      }
      if(window.Telegram.WebApp.setBackgroundColor) {
        window.Telegram.WebApp.setBackgroundColor('#000000');
      }
    }
  }, []);

  const handleReward = (amount: number) => {
    setUserState(prev => ({
      ...prev,
      points: prev.points + amount
    }));
    
    // Optional: Trigger haptic feedback if available in Telegram
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case Tab.HOME:
        return <HomeTab userState={userState} />;
      case Tab.EARN:
        return <EarnTab onReward={handleReward} />;
      case Tab.AI:
        return <AiTab points={userState.points} />;
      default:
        return <HomeTab userState={userState} />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      <main className="min-h-screen relative overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="fixed bottom-0 right-0 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10">
          {renderContent()}
        </div>
      </main>
      
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;
