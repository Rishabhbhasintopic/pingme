import React, { useState } from 'react';
import { Mic, MicOff, Send, X, Sparkles } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface ReplyComposerProps {
  onSend: (content: string, voiceTranscribed: boolean) => Promise<void>;
  placeholder?: string;
  autoFocus?: boolean;
}

export const ReplyComposer: React.FC<ReplyComposerProps> = ({
  onSend,
  placeholder = 'Type a reply or dictate by voice...',
  autoFocus = false,
}) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [wasVoice, setWasVoice] = useState(false);

  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Sync speech recognition transcript into input
  React.useEffect(() => {
    if (transcript) {
      setText(transcript);
      setWasVoice(true);
    }
  }, [transcript]);

  const handleToggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    if (isListening) {
      stopListening();
    }

    setSending(true);
    try {
      await onSend(trimmed, wasVoice);
      setText('');
      resetTranscript();
      setWasVoice(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSend} className="w-full">
      {isListening && (
        <div className="mb-2 p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between text-xs text-blue-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="font-semibold">Listening...</span>
            <span className="italic text-gray-300">
              {interimTranscript ? `"${interimTranscript}"` : 'Speak into your microphone'}
            </span>
          </div>
          <button
            type="button"
            onClick={stopListening}
            className="text-xs text-gray-400 hover:text-white"
          >
            Done
          </button>
        </div>
      )}

      <div className="relative flex items-center gap-2 bg-[#161922] border border-white/10 rounded-2xl p-1.5 focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
        {isSupported && (
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`p-2.5 rounded-xl transition-all ${
              isListening
                ? 'bg-red-600 text-white animate-pulse shadow-md shadow-red-500/40'
                : 'text-gray-400 hover:text-white hover:bg-white/5 active:scale-95'
            }`}
            title={isListening ? 'Stop recording' : 'Dictate with voice'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        )}

        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (wasVoice && !isListening) {
              setWasVoice(false);
            }
          }}
          placeholder={isListening ? 'Listening...' : placeholder}
          autoFocus={autoFocus}
          className="flex-1 bg-transparent border-0 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none px-1"
        />

        {wasVoice && (
          <span className="text-[11px] text-blue-400 flex items-center gap-1 bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-800/40">
            <Sparkles className="w-3 h-3" /> Voice
          </span>
        )}

        {text && (
          <button
            type="button"
            onClick={() => {
              setText('');
              resetTranscript();
              setWasVoice(false);
            }}
            className="p-1.5 text-gray-400 hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <button
          type="submit"
          disabled={!text.trim() || sending}
          className={`p-2.5 rounded-xl font-medium transition-all ${
            text.trim() && !sending
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 active:scale-95'
              : 'bg-white/5 text-gray-500 cursor-not-allowed'
          }`}
          title="Send reply"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};
