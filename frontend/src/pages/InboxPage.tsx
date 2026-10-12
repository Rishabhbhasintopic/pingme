import React, { useState } from 'react';
import type { Message } from '../types';
import { MessageCard } from '../components/MessageCard';
import { EmptyState } from '../components/EmptyState';
import { AlertCircle, RefreshCw, Search, Settings } from 'lucide-react';

interface InboxPageProps {
  messages: Message[];
  loading: boolean;
  connectionError?: string | null;
  onRefresh: () => void;
  onGoToSettings?: () => void;
  onListen: (message: Message) => void;
  onSendReply: (messageId: string, content: string, voiceTranscribed: boolean) => Promise<void>;
  currentSpeakingMessageId: string | null;
  onOpenThread?: (conversationId: string) => void;
}

export const InboxPage: React.FC<InboxPageProps> = ({
  messages,
  loading,
  connectionError,
  onRefresh,
  onGoToSettings,
  onListen,
  onSendReply,
  currentSpeakingMessageId,
  onOpenThread,
}) => {
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const filtered = messages.filter((m) => {
    const matchesSearch =
      m.content.toLowerCase().includes(search.toLowerCase()) ||
      (m.title && m.title.toLowerCase().includes(search.toLowerCase()));
    const matchesPriority =
      filterPriority === 'all' || m.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="space-y-4 max-w-2xl mx-auto px-4 pb-24 pt-2">
      {/* Connection Alert Banner */}
      {connectionError && (
        <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="leading-tight">{connectionError}</span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {onGoToSettings && (
              <button
                onClick={onGoToSettings}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-medium flex items-center gap-1 transition-all"
              >
                <Settings className="w-3 h-3" /> Settings
              </button>
            )}
            <button
              onClick={onRefresh}
              className="px-2.5 py-1 bg-rose-500/25 hover:bg-rose-500/35 text-rose-200 rounded-xl text-xs font-semibold transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      {/* Search & Filter Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages..."
            className="w-full bg-[#141722] border border-white/5 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="bg-[#141722] border border-white/5 rounded-xl px-2.5 py-2 text-xs text-gray-300 focus:outline-none focus:border-blue-500/50"
        >
          <option value="all">All Priorities</option>
          <option value="high">High Only</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>

        <button
          onClick={onRefresh}
          className={`p-2 rounded-xl bg-[#141722] border border-white/5 text-gray-400 hover:text-white transition-all active:scale-95 ${
            loading ? 'animate-spin text-blue-400' : ''
          }`}
          title="Refresh messages"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Message List */}
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {filtered.map((msg) => (
            <MessageCard
              key={msg.id}
              message={msg}
              onListen={onListen}
              onSendReply={onSendReply}
              onOpenThread={onOpenThread}
              isCurrentlySpeaking={currentSpeakingMessageId === msg.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};
