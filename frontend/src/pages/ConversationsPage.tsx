import React, { useEffect, useState } from 'react';
import type { Conversation, Message, Reply } from '../types';
import { api } from '../services/api';
import { ReplyComposer } from '../components/ReplyComposer';
import { PriorityBadge } from '../components/StatusBadge';
import { ArrowLeft, MessageSquare, Volume2, Mic, Clock } from 'lucide-react';

interface ConversationsPageProps {
  onListen: (message: Message) => void;
  onSendReply: (messageId: string, content: string, voiceTranscribed: boolean) => Promise<void>;
}

export const ConversationsPage: React.FC<ConversationsPageProps> = ({
  onListen,
  onSendReply,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<{
    id: string;
    title: string;
    messages: Message[];
  } | null>(null);

  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadThread = async (id: string) => {
    try {
      const details = await api.getConversationDetails(id);
      setActiveThread(details);
      setSelectedId(id);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const handleThreadReply = async (content: string, voiceTranscribed: boolean) => {
    if (!activeThread || activeThread.messages.length === 0) return;
    const latestMessage = activeThread.messages[activeThread.messages.length - 1];
    await onSendReply(latestMessage.id, content, voiceTranscribed);
    await loadThread(activeThread.id);
  };

  if (selectedId && activeThread) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] max-w-2xl mx-auto px-4 pb-24">
        {/* Thread Header */}
        <div className="flex items-center gap-3 py-3 border-b border-white/5 sticky top-14 glass z-20">
          <button
            onClick={() => {
              setSelectedId(null);
              setActiveThread(null);
              loadConversations();
            }}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-white tracking-tight">
              {activeThread.title}
            </h2>
            <span className="text-[11px] text-gray-400">
              {activeThread.messages.length} {activeThread.messages.length === 1 ? 'message' : 'messages'}
            </span>
          </div>
        </div>

        {/* Message Thread Chat Flow */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {activeThread.messages.map((msg) => (
            <div key={msg.id} className="space-y-2">
              {/* Terminal message (Left aligned) */}
              <div className="flex flex-col items-start max-w-[85%]">
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[10px] font-mono text-gray-400">Terminal CLI</span>
                  <PriorityBadge priority={msg.priority} />
                  <span className="text-[10px] text-gray-500">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="glass-bubble-cli rounded-2xl rounded-tl-sm p-3.5 text-sm text-gray-100 shadow-md">
                  {msg.title && (
                    <div className="text-xs font-bold text-blue-300 mb-1">{msg.title}</div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <button
                    onClick={() => onListen(msg)}
                    className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-blue-300 hover:text-blue-200 bg-white/5 px-2 py-1 rounded-lg"
                  >
                    <Volume2 className="w-3 h-3" /> Listen
                  </button>
                </div>
              </div>

              {/* Replies (Right aligned) */}
              {msg.replies &&
                msg.replies.map((reply: Reply) => (
                  <div key={reply.id} className="flex flex-col items-end w-full">
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-gray-400">
                      <span>You (iPhone)</span>
                      {reply.voice_transcribed && (
                        <span className="flex items-center gap-0.5 text-blue-300 bg-blue-500/20 px-1 rounded">
                          <Mic className="w-2.5 h-2.5" /> Dictated
                        </span>
                      )}
                      <span>•</span>
                      <span>
                        {new Date(reply.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="glass-bubble-user rounded-2xl rounded-tr-sm p-3.5 text-sm shadow-md max-w-[85%]">
                      <p className="whitespace-pre-wrap">{reply.content}</p>
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>

        {/* Thread Reply Composer Footer */}
        <div className="sticky bottom-16 pt-2 bg-gradient-to-t from-[#090a0f] to-transparent">
          <ReplyComposer onSend={handleThreadReply} placeholder="Reply to thread..." />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 pt-2 space-y-3">
      <div className="flex items-center justify-between mb-1 px-1">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
          Recent Conversations
        </h2>
        <span className="text-xs text-gray-500">{conversations.length} total</span>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-12 glass-card rounded-2xl p-6">
          <MessageSquare className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-300">No active conversation threads</p>
          <p className="text-xs text-gray-500 mt-1">
            New messages from terminal automatically organize into threads.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => loadThread(c.id)}
              className="glass-card rounded-2xl p-3.5 border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-white truncate">{c.title}</h3>
                  <span className="text-[10px] text-gray-500 flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(c.updated_at).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate">
                  {c.latest_message ? c.latest_message.content : 'No messages'}
                </p>
              </div>

              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/5 text-gray-300">
                {c.message_count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
