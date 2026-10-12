import React from 'react';
import type { MessageStatus, Priority } from '../types';
import { Check, CheckCheck, Clock, AlertTriangle, Send } from 'lucide-react';

export const StatusBadge: React.FC<{ status: MessageStatus }> = ({ status }) => {
  switch (status) {
    case 'created':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
          <Clock className="w-3 h-3 text-slate-400" /> Created
        </span>
      );
    case 'queued':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-950/40 text-amber-300 border border-amber-800/40">
          <Clock className="w-3 h-3 text-amber-400" /> Queued
        </span>
      );
    case 'push_accepted':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-950/40 text-blue-300 border border-blue-800/40">
          <Send className="w-3 h-3 text-blue-400" /> Push Sent
        </span>
      );
    case 'read':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-teal-950/40 text-teal-300 border border-teal-800/40">
          <Check className="w-3 h-3 text-teal-400" /> Read
        </span>
      );
    case 'replied':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
          <CheckCheck className="w-3 h-3 text-emerald-400" /> Replied
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-950/40 text-rose-300 border border-rose-800/40">
          <AlertTriangle className="w-3 h-3 text-rose-400" /> Failed
        </span>
      );
    default:
      return null;
  }
};

export const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => {
  if (priority === 'high') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-950/60 text-red-400 border border-red-800/60 animate-pulse">
        HIGH
      </span>
    );
  }
  if (priority === 'low') {
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-800 text-gray-400 border border-gray-700">
        LOW
      </span>
    );
  }
  return null;
};
