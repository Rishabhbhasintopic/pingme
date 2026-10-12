import React from 'react';
import { Square, WifiOff } from 'lucide-react';

interface HeaderProps {
  title: string;
  isLive: boolean;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  isLive,
  isSpeaking,
  onStopSpeaking,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full glass border-b border-white/5 safe-top px-4 pb-3">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="font-mono font-black text-sm tracking-tighter text-white">P&gt;</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              PINGME
              <span className="text-xs font-normal text-gray-400">/ {title}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSpeaking && (
            <div className="flex items-center gap-2 bg-blue-950/60 border border-blue-500/30 px-2.5 py-1 rounded-full animate-pulse">
              <div className="flex items-end gap-0.5 h-3">
                <div className="w-0.5 bg-blue-400 rounded-full animate-soundwave-1" />
                <div className="w-0.5 bg-blue-400 rounded-full animate-soundwave-2" />
                <div className="w-0.5 bg-blue-400 rounded-full animate-soundwave-3" />
                <div className="w-0.5 bg-blue-400 rounded-full animate-soundwave-4" />
              </div>
              <button
                onClick={onStopSpeaking}
                className="text-[11px] font-semibold text-blue-300 hover:text-white flex items-center gap-1"
                title="Stop audio playback"
              >
                <Square className="w-2.5 h-2.5 fill-current" /> Stop
              </button>
            </div>
          )}

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isLive
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                : 'bg-amber-950/40 text-amber-300 border-amber-800/40'
            }`}
          >
            {isLive ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-400" />
                <span>Syncing</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
