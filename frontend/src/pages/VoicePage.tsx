import React from 'react';
import type { SpeechSettings } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import {
  Mic,
  MicOff,
  Volume2,
  Sliders,
  Info,
  Play,
  RotateCcw,
} from 'lucide-react';

interface VoicePageProps {
  settings: SpeechSettings;
  onUpdateSettings: (newSettings: Partial<SpeechSettings>) => void;
  voices: SpeechSynthesisVoice[];
  isSpeaking: boolean;
  onSpeak: (text: string) => void;
  onStop: () => void;
}

export const VoicePage: React.FC<VoicePageProps> = ({
  settings,
  onUpdateSettings,
  voices,
  isSpeaking,
  onSpeak,
  onStop,
}) => {
  const testText = 'PINGME: Terminal voice messaging active on iPhone.';
  const {
    isSupported: sttSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pb-28 pt-2 space-y-4">
      {/* Voice Visualizer Hero Banner */}
      <div className="glass-card rounded-3xl p-6 text-center relative overflow-hidden border border-blue-500/20 bg-gradient-to-b from-blue-950/30 to-slate-900/60 shadow-xl">
        <div className="relative z-10">
          <div className="w-20 h-20 rounded-full mx-auto bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4 transition-transform active:scale-95">
            {isSpeaking || isListening ? (
              <div className="flex items-end gap-1 h-8">
                <div className="w-1 bg-white rounded-full animate-soundwave-1" />
                <div className="w-1 bg-white rounded-full animate-soundwave-2" />
                <div className="w-1 bg-white rounded-full animate-soundwave-3" />
                <div className="w-1 bg-white rounded-full animate-soundwave-4" />
                <div className="w-1 bg-white rounded-full animate-soundwave-5" />
              </div>
            ) : (
              <Volume2 className="w-9 h-9 text-white" />
            )}
          </div>

          <h2 className="text-lg font-bold text-white tracking-tight">
            {isSpeaking
              ? 'Speaking message...'
              : isListening
              ? 'Listening to your voice...'
              : 'Voice Engine Ready'}
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
            Hands-free voice assistant for terminal messages with text-to-speech and voice dictation.
          </p>

          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => onSpeak(testText)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Test Speech
            </button>
            {isSpeaking && (
              <button
                onClick={onStop}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 transition-all active:scale-95"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Auto-Speak Toggle */}
      <div className="glass-card rounded-2xl p-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Auto-Read Incoming Messages</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Automatically speak new terminal messages aloud when the app is foregrounded.
          </p>
        </div>
        <button
          onClick={() => onUpdateSettings({ autoSpeak: !settings.autoSpeak })}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            settings.autoSpeak ? 'bg-blue-600' : 'bg-gray-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              settings.autoSpeak ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Voice Synthesis Settings */}
      <div className="glass-card rounded-2xl p-4 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-blue-400" /> Speech Synthesis Configuration
        </h3>

        {/* Voice Selector */}
        <div>
          <label className="text-xs font-medium text-gray-300 block mb-1.5">
            Selected Voice ({voices.length} available)
          </label>
          <select
            value={settings.voiceURI}
            onChange={(e) => onUpdateSettings({ voiceURI: e.target.value })}
            className="w-full bg-[#141722] border border-white/5 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500/50"
          >
            <option value="">Default System Voice</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>

        {/* Speech Rate Slider */}
        <div>
          <div className="flex items-center justify-between text-xs text-gray-300 mb-1.5">
            <span>Speaking Rate</span>
            <span className="font-mono text-blue-400">{settings.rate.toFixed(1)}x</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-500">0.5x</span>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.rate}
              onChange={(e) => onUpdateSettings({ rate: parseFloat(e.target.value) })}
              className="flex-1 accent-blue-500"
            />
            <span className="text-[11px] text-gray-500">2.0x</span>
            <button
              onClick={() => onUpdateSettings({ rate: 1.0 })}
              className="p-1 text-gray-500 hover:text-white"
              title="Reset rate"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Speech-to-Text Dictation Sandbox */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-blue-400" /> Voice Dictation Test
          </h3>
          {sttSupported ? (
            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full font-medium">
              Supported
            </span>
          ) : (
            <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded-full font-medium">
              Unsupported Browser
            </span>
          )}
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">
          Tap the microphone to dictate speech into text. The transcribed message can be spoken back or sent as a reply.
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleListening}
            disabled={!sttSupported}
            className={`p-3 rounded-2xl flex items-center gap-2 text-xs font-semibold transition-all ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/30'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-95'
            } ${!sttSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{isListening ? 'Stop Recording' : 'Start Dictation'}</span>
          </button>

          {transcript && (
            <button
              onClick={() => onSpeak(transcript)}
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-200 flex items-center gap-1.5"
            >
              <Volume2 className="w-4 h-4" /> Playback
            </button>
          )}
        </div>

        {(transcript || interimTranscript) && (
          <div className="p-3 rounded-xl bg-[#141722] border border-blue-500/30 text-xs text-gray-100 font-mono">
            <span>{transcript}</span>
            {interimTranscript && (
              <span className="text-gray-400 italic"> {interimTranscript}</span>
            )}
          </div>
        )}
      </div>

      {/* iOS Background Limitation Notice */}
      <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-800/30 text-xs text-amber-200/90 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <b>iOS Background Voice Note:</b> iOS prevents arbitrary background speech synthesis when the phone is locked. Push notifications will alert your lock screen; tapping the notification opens PINGME and immediately speaks the message aloud!
        </p>
      </div>
    </div>
  );
};
