import React, { useState } from 'react';
import type { Message } from '../types';
import { MessageCard } from '../components/MessageCard';
import { EmptyState } from '../components/EmptyState';
import { RefreshCw, Search } from 'lucide-react';

interface InboxPageProps {
  messages: Message[];
  loading: boolean;
  onRefresh: () => void;
  onListen: (message: Message) => void;
  onSendReply: (messageId: string, content: string, voiceTranscribed: boolean) => Promise<void>;
  currentSpeakingMessageId: string | null;
}

export const InboxPage: React.FC<InboxPageProps> = ({
  messages,
  loading,
  onRefresh,
  onListen,
  onSendReply,
  currentSpeakingMessageId,
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
              isCurrentlySpeaking={currentSpeakingMessageId === msg.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};
