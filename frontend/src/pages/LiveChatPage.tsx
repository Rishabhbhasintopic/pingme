import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { LiveChatItem } from '../types';
import { api } from '../services/api';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import {
  Terminal,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Send,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Radio,
} from 'lucide-react';

interface LiveChatPageProps {
  onSpeak: (text: string) => void;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
  liveEventSeq?: number;
  autoSpeakEnabled?: boolean;
  onToggleAutoSpeak?: () => void;
}

const QUICK_CHIPS = [
  'Got it 👍',
  'On my way 🚗',
  'Yes',
  'No',
  'Call you soon 📞',
  'Working on it ⚡',
];

export const LiveChatPage: React.FC<LiveChatPageProps> = ({
  onSpeak,
  isSpeaking,
  onStopSpeaking,
  liveEventSeq,
  autoSpeakEnabled = false,
  onToggleAutoSpeak,
}) => {
  const [items, setItems] = useState<LiveChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [sending, setSending] = useState(false);
  const [activeSpeakingItemId, setActiveSpeakingItemId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Speech recognition for iPhone voice dictation
  const {
    isSupported: isSpeechSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Populate dictated speech into input
  useEffect(() => {
    if (transcript) {
      setInputVal(transcript);
    }
  }, [transcript]);

  // Load feed from backend
  const loadFeed = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const data = await api.getLiveChatFeed(100);
      setItems(data.items || []);
      setError(null);
    } catch (err: any) {
      console.warn('Failed to fetch live chat feed:', err);
      setError(err?.message || 'Failed to connect to live chat feed');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed(true);
  }, [loadFeed]);

  // Sync on WebSocket live events
  useEffect(() => {
    if (liveEventSeq && liveEventSeq > 0) {
      loadFeed(false);
    }
  }, [liveEventSeq, loadFeed]);

  // Auto-scroll to bottom on items change
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('smooth');
  }, [items.length]);

  const handleSendMessage = async (textToSend: string, wasVoice = false) => {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;

    if (isListening) {
      stopListening();
    }

    setSending(true);
    // Optimistic item
    const tempId = `temp-${Date.now()}`;
    const optimisticItem: LiveChatItem = {
      id: tempId,
      type: 'reply',
      sender: 'pwa',
      sender_device: 'iPhone',
      content: trimmed,
      created_at: new Date().toISOString(),
      voice_transcribed: wasVoice,
    };
    setItems((prev) => [...prev, optimisticItem]);
    setInputVal('');
    resetTranscript();

    try {
      await api.sendLiveReply(trimmed, wasVoice, 'iPhone');
      await loadFeed(false);
    } catch (err: any) {
      alert(`Failed to send message to terminal: ${err.message}`);
      // Remove optimistic item on error
      setItems((prev) => prev.filter((item) => item.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleListenItem = (item: LiveChatItem) => {
    if (activeSpeakingItemId === item.id && isSpeaking) {
      onStopSpeaking();
      setActiveSpeakingItemId(null);
    } else {
      setActiveSpeakingItemId(item.id);
      onSpeak(item.content);
    }
  };

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-3xl mx-auto px-3 sm:px-4">
      {/* Top Session Status Bar */}
      <div className="flex items-center justify-between py-2 px-3 mb-2 rounded-2xl bg-[#11141e]/90 border border-white/5 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Terminal className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-tight">Live Terminal Feed</span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Connected
              </span>
            </div>
            <p className="text-[10px] text-gray-400">
              Full-duplex stream • {items.length} events
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onToggleAutoSpeak && (
            <button
              onClick={onToggleAutoSpeak}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                autoSpeakEnabled
                  ? 'bg-blue-600/30 border border-blue-500/40 text-blue-300'
                  : 'bg-white/5 text-gray-400 hover:text-gray-200'
              }`}
              title="Toggle Auto-Speak for incoming terminal messages"
            >
              {autoSpeakEnabled ? <Volume2 className="w-3.5 h-3.5 text-blue-400" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="text-[11px] hidden sm:inline">Auto-Speak</span>
            </button>
          )}

          <button
            onClick={() => loadFeed(false)}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
            title="Refresh feed"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Messages Scroll Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto space-y-3.5 pr-1 pb-3 scroll-smooth"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            <p className="text-xs">Connecting to live chat session...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/30 text-center my-6">
            <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-xs text-red-300">{error}</p>
            <button
              onClick={() => loadFeed(true)}
              className="mt-2 text-xs text-blue-400 underline"
            >
              Retry Connection
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-14 h-14 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3 text-blue-400">
              <Radio className="w-7 h-7 animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Live Chat Ready</h3>
            <p className="text-xs text-gray-400 max-w-xs mb-3">
              Type or dictate with your microphone below, or send messages from your terminal using{' '}
              <code className="text-blue-300 bg-blue-950/60 px-1.5 py-0.5 rounded font-mono">pingme chat</code>.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const isFromTerminal = item.type === 'message' || item.sender === 'cli';
            const isCurrentlySpeaking = activeSpeakingItemId === item.id && isSpeaking;

            return (
              <div
                key={item.id}
                className={`flex flex-col ${
                  isFromTerminal ? 'items-start' : 'items-end'
                } transition-all`}
              >
                {/* Message Bubble Container */}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 sm:p-3.5 text-sm transition-all shadow-md ${
                    isFromTerminal
                      ? 'bg-[#151924] border border-emerald-500/20 text-gray-100 rounded-tl-sm shadow-emerald-950/10'
                      : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm shadow-blue-950/20'
                  } ${
                    item.priority === 'high' && isFromTerminal
                      ? 'ring-2 ring-red-500/60 border-red-500/40'
                      : ''
                  }`}
                >
                  {/* Bubble Header */}
                  <div
                    className={`flex items-center gap-1.5 text-[11px] mb-1 font-semibold ${
                      isFromTerminal ? 'text-emerald-400' : 'text-blue-100'
                    }`}
                  >
                    {isFromTerminal ? (
                      <>
                        <Terminal className="w-3.5 h-3.5" />
                        <span>Terminal ({item.sender_device || 'CLI'})</span>
                        {item.priority === 'high' && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                            HIGH
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span>You (iPhone)</span>
                        {item.voice_transcribed && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-white/20 text-white">
                            <Sparkles className="w-2.5 h-2.5" /> Voice
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Title if present on terminal message */}
                  {item.title && isFromTerminal && (
                    <div className="text-xs font-bold text-gray-200 mb-1">
                      {item.title}
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="whitespace-pre-wrap break-words leading-relaxed select-text font-normal">
                    {item.content}
                  </div>

                  {/* Footer / Meta */}
                  <div
                    className={`flex items-center justify-between gap-3 mt-1.5 pt-1 border-t text-[10px] ${
                      isFromTerminal
                        ? 'border-white/5 text-gray-400'
                        : 'border-white/15 text-blue-200'
                    }`}
                  >
                    <span>{formatTime(item.created_at)}</span>

                    {/* Listen button for Terminal messages */}
                    {isFromTerminal && (
                      <button
                        onClick={() => handleListenItem(item)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
                          isCurrentlySpeaking
                            ? 'bg-blue-600 text-white animate-pulse'
                            : 'hover:bg-white/10 text-emerald-400 hover:text-emerald-300'
                        }`}
                        title="Read message aloud"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>{isCurrentlySpeaking ? 'Speaking...' : 'Listen'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Quick Reply Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 mb-1.5 no-scrollbar shrink-0">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => handleSendMessage(chip, false)}
            disabled={sending}
            className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-xs text-gray-300 whitespace-nowrap border border-white/5 transition-all"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Sticky Bottom Composer */}
      <div className="shrink-0 pt-1 pb-1">
        {isListening && (
          <div className="mb-2 p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center justify-between text-xs text-red-200 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="font-semibold">Dictating live:</span>
              <span className="italic text-gray-200 truncate max-w-[200px] sm:max-w-md">
                {interimTranscript ? `"${interimTranscript}"` : 'Listening to microphone...'}
              </span>
            </div>
            <button
              type="button"
              onClick={stopListening}
              className="text-xs text-gray-400 hover:text-white font-medium"
            >
              Done
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputVal, isListening || Boolean(transcript));
          }}
          className="relative flex items-center gap-2 bg-[#161a26] border border-white/10 rounded-2xl p-1.5 focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-xl"
        >
          {/* Microphone dictation button */}
          {isSpeechSupported && (
            <button
              type="button"
              onClick={toggleMic}
              className={`p-2.5 rounded-xl transition-all ${
                isListening
                  ? 'bg-red-600 text-white animate-pulse shadow-md shadow-red-500/40'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 active:scale-95'
              }`}
              title={isListening ? 'Stop microphone' : 'Dictate with voice'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}

          {/* Text input */}
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={isListening ? 'Listening...' : 'Type or dictate to Terminal...'}
            className="flex-1 bg-transparent border-0 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none px-1"
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={!inputVal.trim() || sending}
            className={`p-2.5 rounded-xl font-medium transition-all ${
              inputVal.trim() && !sending
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 active:scale-95'
                : 'bg-white/5 text-gray-500 cursor-not-allowed'
            }`}
            title="Send to Terminal"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
