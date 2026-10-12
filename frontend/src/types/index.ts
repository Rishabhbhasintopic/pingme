export type Priority = 'low' | 'normal' | 'high';
export type MessageStatus = 'created' | 'queued' | 'push_accepted' | 'read' | 'replied' | 'failed';

export interface Reply {
  id: string;
  message_id: string;
  conversation_id: string;
  content: string;
  voice_transcribed: boolean;
  sender: 'pwa' | 'cli';
  sender_device?: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  title?: string;
  content: string;
  priority: Priority;
  status: MessageStatus;
  sender: string;
  sender_device?: string;
  read_at?: string;
  created_at: string;
  replies?: Reply[];
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  latest_message?: Message;
  message_count: number;
}

export interface Device {
  id: string;
  name: string;
  platform: string;
  last_seen_at: string;
  created_at: string;
  subscription_count: number;
}

export interface TokenItem {
  id: string;
  name: string;
  token_prefix: string;
  is_revoked: boolean;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface SpeechSettings {
  autoSpeak: boolean;
  voiceURI: string;
  rate: number;
  pitch: number;
  continuousRecording: boolean;
}

export interface LiveChatItem {
  id: string;
  type: 'message' | 'reply';
  sender: string;
  sender_device?: string;
  content: string;
  title?: string | null;
  priority?: string;
  created_at: string;
  voice_transcribed?: boolean;
  message_id?: string;
}

export interface LiveChatFeedResponse {
  conversation_id: string;
  title: string;
  items: LiveChatItem[];
  latest_message_id?: string | null;
}

export type TabType = 'chat' | 'inbox' | 'conversations' | 'voice' | 'settings';
