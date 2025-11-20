import React, { useState } from 'react';
import { Play, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface EarnTabProps {
  onReward: (amount: number) => void;
}

export const EarnTab: React.FC<EarnTabProps> = ({ onReward }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleWatchAd = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setStatus('idle');

    try {
      // Check if the GigaPub function exists
      if (typeof window.showGiga === 'function') {
        await window.showGiga();
        // Reward logic on success
        const rewardAmount = 500;
        onReward(rewardAmount);
        setStatus('success');
      } else {
        console.warn("GigaPub script not loaded or blocked.");
        // Fallback for development testing or if script fails to load
        setStatus('error');
      }
    } catch (e) {
      console.error("Ad Error:", e);
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-4 pb-24">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
          Earn Rewards
        </h2>
        <p className="text-neutral-400 text-sm">
          Watch short videos to boost your point balance instantly.
        </p>
      </div>

      <div className="bg-neutral-800/50 border border-white/5 rounded-3xl p-6 flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50" />
        
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
          <Play className="text-green-400 ml-1" size={32} fill="currentColor" />
        </div>

        <h3 className="text-xl font-semibold text-white mb-2">Watch & Earn</h3>
        <p className="text-neutral-400 text-sm mb-6">
          Get +500 Points for every completed ad view.
        </p>

        <button
          onClick={handleWatchAd}
          disabled={isLoading}
          className={`
            w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-200
            ${isLoading 
              ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed' 
              : 'bg-white text-black hover:scale-[1.02] active:scale-95 shadow-xl shadow-white/5'
            }
          `}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Loading Ad...
            </>
          ) : (
            'Watch Ad'
          )}
        </button>

        {status === 'success' && (
          <div className="mt-4 flex items-center gap-2 text-green-400 bg-green-400/10 px-4 py-2 rounded-lg animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium">Reward Received! +500</span>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-4 flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-2 rounded-lg animate-in fade-in slide-in-from-bottom-2">
            <AlertCircle size={18} />
            <span className="text-sm font-medium">Ad failed to load. Try again.</span>
          </div>
        )}
      </div>

      <div className="bg-neutral-900 rounded-2xl p-4 border border-white/5">
        <h4 className="text-sm font-medium text-neutral-300 mb-3">Tasks List</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 bg-neutral-800/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              <span className="text-sm text-neutral-200">Daily Login</span>
            </div>
            <span className="text-xs font-mono text-green-400">+100</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-neutral-800/50 rounded-xl opacity-50">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-neutral-600" />
              <span className="text-sm text-neutral-200">Invite Friend</span>
            </div>
            <span className="text-xs font-mono text-neutral-400">+1000</span>
          </div>
        </div>
      </div>
    </div>
  );
};
