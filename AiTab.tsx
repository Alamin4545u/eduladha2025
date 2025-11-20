import React, { useState } from 'react';
import { Sparkles, Copy, Share2, Bot } from 'lucide-react';
import { generateMotivation } from '../services/geminiService';

interface AiTabProps {
  points: number;
}

export const AiTab: React.FC<AiTabProps> = ({ points }) => {
  const [motivation, setMotivation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    const text = await generateMotivation(points);
    setMotivation(text);
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-4 pb-24">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          AI Coach
        </h2>
        <p className="text-neutral-400 text-sm">
          Personalized wisdom powered by Gemini 2.5.
        </p>
      </div>

      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 blur"></div>
        <div className="relative bg-neutral-900 rounded-3xl p-6 flex flex-col items-center text-center min-h-[200px] justify-center">
          
          {!motivation && !loading && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto">
                <Bot className="text-purple-400" size={32} />
              </div>
              <p className="text-neutral-300">
                Need a boost? Ask your AI companion for motivation tailored to your progress.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center animate-pulse space-y-4">
              <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              <p className="text-sm text-purple-300 font-mono">Connecting to neural net...</p>
            </div>
          )}

          {motivation && !loading && (
            <div className="animate-in fade-in zoom-in duration-300">
               <Sparkles className="w-8 h-8 text-yellow-400 mx-auto mb-4 animate-bounce" />
               <p className="text-lg md:text-xl font-medium text-white leading-relaxed italic">
                "{motivation}"
               </p>
               <div className="flex gap-4 justify-center mt-6">
                 <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-neutral-400 hover:text-white">
                   <Copy size={20} />
                 </button>
                 <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-neutral-400 hover:text-white">
                   <Share2 size={20} />
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/20 active:scale-95 transition-all"
      >
        {motivation ? 'New Motivation' : 'Inspire Me'}
      </button>
    </div>
  );
};
