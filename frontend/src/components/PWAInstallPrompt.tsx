import React, { useState } from 'react';
import { Share, PlusSquare, X, Bell } from 'lucide-react';

interface PWAInstallPromptProps {
  isStandalone: boolean;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ isStandalone }) => {
  const [dismissed, setDismissed] = useState(false);

  if (isStandalone || dismissed) {
    return null;
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <aside aria-label="Install guide" className="mx-4 my-3 p-3.5 rounded-2xl glass-card border border-blue-500/30 bg-gradient-to-r from-blue-950/40 to-slate-900/60 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-tight">
              Enable iPhone Push Notifications
            </h4>
            <p className="text-[11px] text-gray-300 mt-0.5 leading-snug">
              {isIOS ? (
                <>
                  In Safari, tap <Share className="w-3 h-3 inline mx-0.5 text-blue-400" /> <b>Share</b> then{' '}
                  <PlusSquare className="w-3 h-3 inline mx-0.5 text-blue-400" /> <b>Add to Home Screen</b> to receive notifications when locked.
                </>
              ) : (
                'Add this PWA to your Home Screen to enable Web Push notifications.'
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-400 hover:text-white p-1 rounded-lg"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
