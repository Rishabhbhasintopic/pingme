import React from 'react';
import type { TabType } from '../types';
import { Inbox, MessageSquare, Mic, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  unreadCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadCount = 0,
}) => {
  const tabs = [
    { id: 'inbox' as TabType, label: 'Inbox', icon: Inbox, badge: unreadCount },
    { id: 'conversations' as TabType, label: 'Threads', icon: MessageSquare },
    { id: 'voice' as TabType, label: 'Voice', icon: Mic },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 glass border-t border-white/5 safe-bottom px-2 pt-2 pb-1">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center w-16 py-1 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-blue-400 scale-105'
                  : 'text-gray-400 hover:text-gray-200 active:scale-95'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-600 text-white min-w-[16px] text-center shadow-md shadow-blue-600/40">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[11px] mt-1 font-medium ${isActive ? 'text-blue-400 font-semibold' : 'text-gray-400'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-6 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
