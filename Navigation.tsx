import React from 'react';
import { Tab } from '../types';
import { Home, Wallet, Sparkles } from 'lucide-react';

interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-4 left-4 right-4 bg-neutral-900/90 backdrop-blur-md border border-white/10 rounded-2xl h-16 flex items-center justify-around px-2 shadow-2xl z-50">
      <button
        onClick={() => onTabChange(Tab.HOME)}
        className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${
          activeTab === Tab.HOME ? 'text-blue-400 scale-110' : 'text-neutral-500 hover:text-neutral-300'
        }`}
      >
        <Home size={24} strokeWidth={activeTab === Tab.HOME ? 2.5 : 2} />
        <span className="text-[10px] font-medium mt-1">Home</span>
      </button>

      <button
        onClick={() => onTabChange(Tab.EARN)}
        className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${
          activeTab === Tab.EARN ? 'text-green-400 scale-110' : 'text-neutral-500 hover:text-neutral-300'
        }`}
      >
        <Wallet size={24} strokeWidth={activeTab === Tab.EARN ? 2.5 : 2} />
        <span className="text-[10px] font-medium mt-1">Earn</span>
      </button>

      <button
        onClick={() => onTabChange(Tab.AI)}
        className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${
          activeTab === Tab.AI ? 'text-purple-400 scale-110' : 'text-neutral-500 hover:text-neutral-300'
        }`}
      >
        <Sparkles size={24} strokeWidth={activeTab === Tab.AI ? 2.5 : 2} />
        <span className="text-[10px] font-medium mt-1">AI Coach</span>
      </button>
    </div>
  );
};
