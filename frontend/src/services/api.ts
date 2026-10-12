import type { Conversation, Device, Message, Reply, TokenItem } from '../types';
import { getStoredApiUrl, getStoredToken } from './storage';

const getHeaders = () => {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export const api = {
  async getMessages(
    conversationId?: string,
    status?: string,
    limit = 50,
    offset = 0
  ): Promise<{ items: Message[]; total: number }> {
    const baseUrl = getStoredApiUrl();
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    if (conversationId) params.append('conversation_id', conversationId);
    if (status) params.append('status', status);

    const res = await fetch(`${baseUrl}/api/v1/messages?${params}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch messages: ${res.statusText}`);
    return res.json();
  },

  async getMessage(messageId: string): Promise<Message> {
    const baseUrl = getStoredApiUrl();
    const res = await fetch(`${baseUrl}/api/v1/messages/${messageId}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch message: ${res.statusText}`);
    return res.json();
  },

  async markMessageRead(messageId: string): Promise<Message> {
    const baseUrl = getStoredApiUrl();
    const res = await fetch(`${baseUrl}/api/v1/messages/${messageId}/read`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to mark read: ${res.statusText}`);
    return res.json();
  },

  async createReply(
    messageId: string,
    content: string,
    voiceTranscribed = false,
    senderDevice?: string
  ): Promise<Reply> {
    const baseUrl = getStoredApiUrl();
    const res = await fetch(`${baseUrl}/api/v1/messages/${messageId}/replies`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        content,
        voice_transcribed: voiceTranscribed,
        sender_device: senderDevice,
      }),
    });
    if (!res.ok) throw new Error(`Failed to send reply: ${res.statusText}`);
    return res.json();
  },

  async getConversations(): Promise<Conversation[]> {
    const baseUrl = getStoredApiUrl();
    const res = await fetch(`${baseUrl}/api/v1/conversations`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch conversations: ${res.statusText}`);
    return res.json();
  },

  async getConversationDetails(conversationId: string): Promise<{
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    messages: Message[];
  }> {
    const baseUrl = getStoredApiUrl();
    const res = await fetch(`${baseUrl}/api/v1/conversations/${conversationId}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch conversation: ${res.statusText}`);
    return res.json();
  },

  async getDevices(): Promise<Device[]> {
    const baseUrl = getStoredApiUrl();
    const res = await fetch(`${baseUrl}/api/v1/devices`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch devices: ${res.statusText}`);
    return res.json();
  },

  async registerDevice(
    deviceId: string,
    name: string,
    platform = 'iOS'
  ): Promise<Device> {
    const baseUrl = getStoredApiUrl();
    const res = await fetch(`${baseUrl}/api/v1/devices/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        id: deviceId,
        name,
        platform,
        user_agent: navigator.userAgent,
      }),
    });
    if (!res.ok) throw new Error(`Failed to register device: ${res.statusText}`);
    return res.json();
  },

  async getVapidPublicKey(): Promise<{ public_key: string; subject: string }> {
    const baseUrl = getStoredApiUrl();
    const res = await fetch(`${baseUrl}/api/v1/push/vapid-public-key`);
    if (!res.ok) throw new Error(`Failed to fetch VAPID key: ${res.statusText}`);
    return res.json();
  },

  async subscribePush(
    deviceId: string,
    subscription: PushSubscription
  ): Promise<any> {
    const baseUrl = getStoredApiUrl();
    const keyData = subscription.toJSON();
    const res = await fetch(`${baseUrl}/api/v1/push/subscribe`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        device_id: deviceId,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: keyData.keys?.p256dh,
          auth: keyData.keys?.auth,
        },
        user_agent: navigator.userAgent,
      }),
    });
    if (!res.ok) throw new Error(`Failed to subscribe push: ${res.statusText}`);
    return res.json();
  },

  async unsubscribePush(endpoint: string): Promise<void> {
    const baseUrl = getStoredApiUrl();
    await fetch(`${baseUrl}/api/v1/push/subscribe`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ endpoint }),
    });
  },

  async testPush(): Promise<any> {
    const baseUrl = getStoredApiUrl();
    const res = await fetch(`${baseUrl}/api/v1/push/test`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Test push failed: ${res.statusText}`);
    return res.json();
  },

  async getHealth(): Promise<any> {
    const baseUrl = getStoredApiUrl();
    const res = await fetch(`${baseUrl}/api/v1/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  async listTokens(): Promise<TokenItem[]> {
    const baseUrl = getStoredApiUrl();
    const res = await fetch(`${baseUrl}/api/v1/auth/tokens`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to list tokens: ${res.statusText}`);
    return res.json();
  },

  async createToken(name: string, expiresInDays?: number): Promise<any> {
    const baseUrl = getStoredApiUrl();
    const res = await fetch(`${baseUrl}/api/v1/auth/tokens`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, expires_in_days: expiresInDays }),
    });
    if (!res.ok) throw new Error(`Failed to create token: ${res.statusText}`);
    return res.json();
  },

  async revokeToken(tokenId: string): Promise<void> {
    const baseUrl = getStoredApiUrl();
    await fetch(`${baseUrl}/api/v1/auth/tokens/${tokenId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },
};
