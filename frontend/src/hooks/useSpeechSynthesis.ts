import { useCallback, useEffect, useRef, useState } from 'react';
import { getStoredSpeechSettings, setStoredSpeechSettings } from '../services/storage';
import type { SpeechSettings } from '../types';

export function useSpeechSynthesis() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [currentUtteranceText, setCurrentUtteranceText] = useState<string | null>(null);
  const [settings, setSettings] = useState<SpeechSettings>(getStoredSpeechSettings());
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const available = window.speechSynthesis.getVoices();
        setVoices(available);
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const updateSettings = useCallback((newSettings: Partial<SpeechSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      setStoredSpeechSettings(updated);
      return updated;
    });
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentUtteranceText(null);
      activeUtteranceRef.current = null;
    }
  }, []);

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        console.warn('Speech synthesis not supported in this browser.');
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;

      if (settings.voiceURI && voices.length > 0) {
        const matched = voices.find((v) => v.voiceURI === settings.voiceURI);
        if (matched) utterance.voice = matched;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setCurrentUtteranceText(text);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setCurrentUtteranceText(null);
        activeUtteranceRef.current = null;
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        setIsSpeaking(false);
        setCurrentUtteranceText(null);
        activeUtteranceRef.current = null;
      };

      activeUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [settings, voices]
  );

  return {
    voices,
    isSpeaking,
    currentUtteranceText,
    settings,
    updateSettings,
    speak,
    stop,
    isSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
  };
}
