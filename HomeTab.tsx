import React from 'react';
import { UserState } from '../types';
import { Trophy, Zap, Clock } from 'lucide-react';

interface HomeTabProps {
  userState: UserState;
}

export const HomeTab: React.FC<HomeTabProps> = ({ userState }) => {
  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-4 pb-24">
      {/* Header Profile */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 p-0.5">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-xl font-bold text-white">
              GS
            </div>
          </div>
          <div>
            <h2 className="text-white font-semibold">Giga User</h2>
            <span className="text-xs text-neutral-400 flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Online
            </span>
          </div>
        </div>
        <div className="px-3 py-1 bg-neutral-800 rounded-full border border-neutral-700">
          <span className="text-xs font-mono text-neutral-300">v1.0.0</span>
        </div>
      </div>

      {/* Main Balance Card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-6 text-white shadow-2xl shadow-blue-900/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        
        <div className="relative z-10">
          <span className="text-blue-200 text-sm font-medium">Total Balance</span>
          <h1 className="text-5xl font-bold mt-2 mb-6 tracking-tighter">
            {userState.points.toLocaleString()}
          </h1>
          
          <div className="flex gap-2">
             <div className="bg-black/20 backdrop-blur-sm px-4 py-2 rounded-xl flex items-center gap-2">
                <Trophy size={16} className="text-yellow-400" />
                <span className="text-sm font-medium">Gold Tier</span>
             </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-white/5 p-4 rounded-2xl">
           <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center mb-3">
             <Zap className="text-orange-500" size={20} />
           </div>
           <span className="text-neutral-400 text-xs uppercase font-bold tracking-wider">Streak</span>
           <p className="text-2xl font-bold text-white mt-1">{userState.streak} Days</p>
        </div>

        <div className="bg-neutral-900 border border-white/5 p-4 rounded-2xl">
           <div className="w-10 h-10 bg-purple-500/10 rounded-full flex items-center justify-center mb-3">
             <Clock className="text-purple-500" size={20} />
           </div>
           <span className="text-neutral-400 text-xs uppercase font-bold tracking-wider">Time Active</span>
           <p className="text-2xl font-bold text-white mt-1">12m</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="pt-4">
        <h3 className="text-white font-medium mb-4">Recent Activity</h3>
        <div className="space-y-3">
           {[1, 2, 3].map((_, i) => (
             <div key={i} className="flex items-center justify-between p-3 bg-neutral-800/30 rounded-xl">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                   <Zap size={14} />
                 </div>
                 <div className="flex flex-col">
                   <span className="text-sm text-white">Ad Watch Bonus</span>
                   <span className="text-[10px] text-neutral-500">Today, 10:23 AM</span>
                 </div>
               </div>
               <span className="text-green-400 font-mono text-sm">+500</span>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};
