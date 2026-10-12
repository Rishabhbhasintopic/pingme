import React, { useState } from 'react';
import type { Message, Reply } from '../types';
import { PriorityBadge, StatusBadge } from './StatusBadge';
import { ReplyComposer } from './ReplyComposer';
import { Volume2, MessageSquare, ChevronDown, ChevronUp, Mic, CornerDownRight } from 'lucide-react';

interface MessageCardProps {
  message: Message;
  onListen: (message: Message) => void;
  onSendReply: (messageId: string, content: string, voiceTranscribed: boolean) => Promise<void>;
  isCurrentlySpeaking: boolean;
}

export const MessageCard: React.FC<MessageCardProps> = ({
  message,
  onListen,
  onSendReply,
  isCurrentlySpeaking,
}) => {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const replies = message.replies || [];

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleReplySubmit = async (content: string, voiceTranscribed: boolean) => {
    await onSendReply(message.id, content, voiceTranscribed);
    setShowReplyBox(false);
  };

  return (
    <article className="glass-card rounded-2xl p-4 border border-white/5 transition-all hover:border-white/10 shadow-lg shadow-black/20">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-2">
          {message.title && (
            <h3 className="font-semibold text-sm text-white tracking-tight">
              {message.title}
            </h3>
          )}
          <PriorityBadge priority={message.priority} />
          <StatusBadge status={message.status} />
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {formatTime(message.created_at)}
        </span>
      </div>

      {/* Content */}
      <div className="text-sm text-gray-200 leading-relaxed font-normal my-2.5 whitespace-pre-wrap">
        {message.content}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onListen(message)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              isCurrentlySpeaking
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{isCurrentlySpeaking ? 'Listening...' : 'Listen'}</span>
          </button>

          <button
            onClick={() => setShowReplyBox((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Reply</span>
            {replies.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500/20 text-blue-300">
                {replies.length}
              </span>
            )}
          </button>
        </div>

        {replies.length > 0 && (
          <button
            onClick={() => setShowReplyBox((prev) => !prev)}
            className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1"
          >
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            {showReplyBox ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Replies Thread */}
      {replies.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
          {replies.map((reply: Reply) => (
            <div
              key={reply.id}
              className="flex items-start gap-2 bg-blue-950/20 border border-blue-500/20 rounded-xl p-2.5 text-xs text-gray-200"
            >
              <CornerDownRight className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-300">
                    <span>You (iPhone)</span>
                    {reply.voice_transcribed && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] bg-blue-500/20 text-blue-300 px-1 rounded">
                        <Mic className="w-2.5 h-2.5" /> Voice
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {formatTime(reply.created_at)}
                  </span>
                </div>
                <p className="leading-snug">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Composer Form */}
      {showReplyBox && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <ReplyComposer onSend={handleReplySubmit} autoFocus />
        </div>
      )}
    </article>
  );
};
