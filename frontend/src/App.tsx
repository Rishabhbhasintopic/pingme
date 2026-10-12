import { useCallback, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { InboxPage } from './pages/InboxPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { LiveChatPage } from './pages/LiveChatPage';
import { VoicePage } from './pages/VoicePage';
import { SettingsPage } from './pages/SettingsPage';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { useWebSocketMessages } from './hooks/useWebSocketMessages';
import { api } from './services/api';
import type { Message, TabType } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null);

  // Voice synthesis hook
  const {
    voices,
    isSpeaking,
    settings: speechSettings,
    updateSettings: updateSpeechSettings,
    speak,
    stop: stopSpeaking,
  } = useSpeechSynthesis();

  // Web Push notifications hook
  const {
    permission: pushPermission,
    isSubscribed: isPushSubscribed,
    isStandalone,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = usePushNotifications();

  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [liveEventSeq, setLiveEventSeq] = useState<number>(0);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  // Load messages from server
  const loadMessages = useCallback(async () => {
    try {
      const res = await api.getMessages();
      setMessages(res.items);
      setConnectionError(null);
    } catch (err: any) {
      console.warn('Failed to load messages:', err);
      setConnectionError(err?.message || 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();

    // Register Service Worker for PWA and Web Push
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[App] Service worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[App] Service worker registration failed:', err);
        });

      // Handle message from service worker on notification click
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'NOTIFICATION_CLICKED') {
          const payload = event.data.payload;
          if (payload?.body) {
            // Auto speak on notification click
            speak(payload.body);
          }
        }
      });
    }
  }, [loadMessages, speak]);

  // Real-time updates via WebSocket
  const handleMessageCreated = useCallback(
    (msg: Message) => {
      setConnectionError(null);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [msg, ...prev];
      });

      // Show local notification if in background
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        document.hidden
      ) {
        try {
          new Notification(msg.title || 'PINGME Terminal Alert', {
            body: msg.content,
            icon: '/icons/icon-192.png',
          });
        } catch {}
      }

      // Auto-speak incoming message if enabled
      if (speechSettings.autoSpeak) {
        const textToSpeak = msg.title ? `${msg.title}: ${msg.content}` : msg.content;
        setCurrentSpeakingId(msg.id);
        speak(textToSpeak, () => setCurrentSpeakingId(null));
      }
      setLiveEventSeq((prev) => prev + 1);
    },
    [speechSettings.autoSpeak, speak]
  );

  const handleReplyCreated = useCallback((reply: any) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === reply.message_id) {
          const existingReplies = m.replies || [];
          if (!existingReplies.some((r) => r.id === reply.id)) {
            return {
              ...m,
              status: 'replied',
              replies: [...existingReplies, reply],
            };
          }
        }
        return m;
      })
    );
    setLiveEventSeq((prev) => prev + 1);
  }, []);

  const handleMessageRead = useCallback((data: any) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === data.message_id ? { ...m, status: 'read' } : m))
    );
    setLiveEventSeq((prev) => prev + 1);
  }, []);

  const { isConnected } = useWebSocketMessages({
    onMessageCreated: handleMessageCreated,
    onReplyCreated: handleReplyCreated,
    onMessageRead: handleMessageRead,
    onSync: loadMessages,
  });

  // Action handlers
  const handleListenMessage = useCallback(
    (message: Message) => {
      const textToSpeak = message.title
        ? `${message.title}: ${message.content}`
        : message.content;
      setCurrentSpeakingId(message.id);
      speak(textToSpeak, () => setCurrentSpeakingId(null));
      // Mark as read on server
      api.markMessageRead(message.id).catch(() => {});
    },
    [speak]
  );

  const handleSendReply = useCallback(
    async (messageId: string, content: string, voiceTranscribed: boolean) => {
      try {
        const reply = await api.createReply(messageId, content, voiceTranscribed);
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === messageId) {
              const prevReplies = m.replies || [];
              return {
                ...m,
                status: 'replied',
                replies: [...prevReplies, reply],
              };
            }
            return m;
          })
        );
      } catch (err: any) {
        alert(`Failed to send reply: ${err.message}`);
      }
    },
    []
  );

  const unreadCount = messages.filter(
    (m) => m.status !== 'read' && m.status !== 'replied'
  ).length;

  return (
    <div className="min-h-screen bg-[#090a0f] text-gray-100 flex flex-col font-sans">
      <Header
        title={
          activeTab === 'chat'
            ? 'Live Chat'
            : activeTab === 'inbox'
            ? 'Alerts'
            : activeTab === 'conversations'
            ? 'Threads'
            : activeTab === 'voice'
            ? 'Voice'
            : 'Settings'
        }
        isLive={isConnected}
        isSpeaking={isSpeaking}
        onStopSpeaking={stopSpeaking}
      />

      <main className="flex-1 overflow-x-hidden safe-bottom-nav">
        <PWAInstallPrompt isStandalone={isStandalone} />

        {activeTab === 'chat' && (
          <LiveChatPage
            onSpeak={(t) => speak(t)}
            isSpeaking={isSpeaking}
            onStopSpeaking={stopSpeaking}
            liveEventSeq={liveEventSeq}
            autoSpeakEnabled={speechSettings.autoSpeak}
            onToggleAutoSpeak={() =>
              updateSpeechSettings({ autoSpeak: !speechSettings.autoSpeak })
            }
          />
        )}

        {activeTab === 'inbox' && (
          <InboxPage
            messages={messages}
            loading={loading}
            connectionError={connectionError}
            onRefresh={loadMessages}
            onGoToSettings={() => setActiveTab('settings')}
            onListen={handleListenMessage}
            onSendReply={handleSendReply}
            currentSpeakingMessageId={currentSpeakingId}
            onOpenThread={(convId) => {
              setSelectedConvId(convId);
              setActiveTab('conversations');
            }}
          />
        )}

        {activeTab === 'conversations' && (
          <ConversationsPage
            onListen={handleListenMessage}
            onSendReply={handleSendReply}
            liveEventSeq={liveEventSeq}
            initialConversationId={selectedConvId}
            onClearInitialConversationId={() => setSelectedConvId(null)}
          />
        )}

        {activeTab === 'voice' && (
          <VoicePage
            settings={speechSettings}
            onUpdateSettings={updateSpeechSettings}
            voices={voices}
            isSpeaking={isSpeaking}
            onSpeak={(t) => speak(t)}
            onStop={stopSpeaking}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            isPushSubscribed={isPushSubscribed}
            pushPermission={pushPermission}
            onSubscribePush={subscribePush}
            onUnsubscribePush={unsubscribePush}
            isStandalone={isStandalone}
          />
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadCount={unreadCount}
      />
    </div>
  );
}

export default App;
