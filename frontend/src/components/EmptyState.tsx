import React, { useState } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';

export const EmptyState: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const sampleCommands = [
    'pingme "Your server backup has completed"',
    'pingme -t "SERVER ALERT" --priority high "Disk usage 92%"',
    'pingme -w "Should I restart the service?"',
  ];

  const handleCopy = (cmd: string, index: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center max-w-sm mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center mb-4 shadow-xl shadow-black/40">
        <Terminal className="w-7 h-7 text-blue-400" />
      </div>

      <h3 className="text-base font-semibold text-white tracking-tight">
        No Messages Yet
      </h3>
      <p className="text-xs text-gray-400 mt-1 mb-6 leading-relaxed">
        Send a message from your terminal to see it appear here in real-time and trigger voice audio.
      </p>

      <div className="w-full space-y-2 text-left">
        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 block px-1">
          Try in your terminal:
        </span>
        {sampleCommands.map((cmd, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#141722] border border-white/5 font-mono text-[11px] text-gray-300 hover:border-blue-500/30 transition-all group"
          >
            <span className="truncate">{cmd}</span>
            <button
              onClick={() => handleCopy(cmd, idx)}
              className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-white/5 shrink-0"
              title="Copy command"
            >
              {copiedIndex === idx ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
