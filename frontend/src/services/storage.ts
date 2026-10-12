import type { SpeechSettings } from '../types';

const TOKEN_KEY = 'pingme_token';
const API_URL_KEY = 'pingme_api_url';
const DEVICE_ID_KEY = 'pingme_device_id';
const DEVICE_NAME_KEY = 'pingme_device_name';
const SPEECH_SETTINGS_KEY = 'pingme_speech_settings';

export const DEFAULT_API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000'
  : window.location.origin;

export const DEFAULT_TOKEN = 'pm_init_admin_token_please_change';

export const getStoredToken = (): string => {
  return localStorage.getItem(TOKEN_KEY) || DEFAULT_TOKEN;
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token.trim());
};

export const getStoredApiUrl = (): string => {
  return localStorage.getItem(API_URL_KEY) || DEFAULT_API_URL;
};

export const setStoredApiUrl = (url: string): void => {
  localStorage.setItem(API_URL_KEY, url.trim().replace(/\/+$/, ''));
};

export const getOrCreateDeviceId = (): string => {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'iphone-' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
};

export const getStoredDeviceName = (): string => {
  let name = localStorage.getItem(DEVICE_NAME_KEY);
  if (!name) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    name = isIOS ? 'iPhone' : 'Web Device';
    localStorage.setItem(DEVICE_NAME_KEY, name);
  }
  return name;
};

export const setStoredDeviceName = (name: string): void => {
  localStorage.setItem(DEVICE_NAME_KEY, name.trim());
};

export const DEFAULT_SPEECH_SETTINGS: SpeechSettings = {
  autoSpeak: true,
  voiceURI: '',
  rate: 1.0,
  pitch: 1.0,
  continuousRecording: false,
};

export const getStoredSpeechSettings = (): SpeechSettings => {
  try {
    const saved = localStorage.getItem(SPEECH_SETTINGS_KEY);
    return saved ? { ...DEFAULT_SPEECH_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SPEECH_SETTINGS;
  } catch {
    return DEFAULT_SPEECH_SETTINGS;
  }
};

export const setStoredSpeechSettings = (settings: SpeechSettings): void => {
  localStorage.setItem(SPEECH_SETTINGS_KEY, JSON.stringify(settings));
};
