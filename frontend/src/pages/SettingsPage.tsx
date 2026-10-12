import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  getOrCreateDeviceId,
  getStoredApiUrl,
  getStoredDeviceName,
  getStoredToken,
  setStoredApiUrl,
  setStoredDeviceName,
  setStoredToken,
} from '../services/storage';
import type { TokenItem } from '../types';
import {
  Bell,
  Check,
  Copy,
  Eye,
  EyeOff,
  Key,
  Plus,
  Send,
  Server,
  Trash2,
} from 'lucide-react';

interface SettingsPageProps {
  isPushSubscribed: boolean;
  pushPermission: NotificationPermission;
  onSubscribePush: () => Promise<boolean>;
  onUnsubscribePush: () => Promise<void>;
  isStandalone: boolean;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  isPushSubscribed,
  pushPermission,
  onSubscribePush,
  onUnsubscribePush,
  isStandalone,
}) => {
  const [serverUrl, setServerUrl] = useState(getStoredApiUrl());
  const [apiToken, setApiToken] = useState(getStoredToken());
  const [deviceName, setDeviceName] = useState(getStoredDeviceName());
  const [deviceId] = useState(getOrCreateDeviceId());
  const [showToken, setShowToken] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Push test state
  const [testingPush, setTestingPush] = useState(false);
  const [testPushResult, setTestPushResult] = useState<string | null>(null);

  // Token management
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [newTokenName, setNewTokenName] = useState('');
  const [createdTokenPlain, setCreatedTokenPlain] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  const loadTokens = async () => {
    try {
      const list = await api.listTokens();
      setTokens(list);
    } catch (e) {
      console.debug('Failed to load tokens:', e);
    }
  };

  useEffect(() => {
    loadTokens();
  }, []);

  const handleSaveConnection = () => {
    setStoredApiUrl(serverUrl);
    setStoredToken(apiToken);
    setStoredDeviceName(deviceName);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    api.registerDevice(deviceId, deviceName);
  };

  const handleTestPush = async () => {
    setTestingPush(true);
    setTestPushResult(null);
    try {
      const res = await api.testPush();
      setTestPushResult(
        res.status === 'success'
          ? `Push sent to gateway (${res.accepted_by_gateway} accepted)`
          : `Warning: ${res.message || 'No active subscriptions'}`
      );
    } catch (e: any) {
      setTestPushResult(`Error: ${e.message}`);
    } finally {
      setTestingPush(false);
    }
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;
    try {
      const res = await api.createToken(newTokenName.trim(), 30);
      setCreatedTokenPlain(res.plain_token);
      setNewTokenName('');
      loadTokens();
    } catch (e: any) {
      alert(`Error creating token: ${e.message}`);
    }
  };

  const handleRevokeToken = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this token?')) return;
    try {
      await api.revokeToken(id);
      loadTokens();
    } catch (e: any) {
      alert(`Failed to revoke token: ${e.message}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pb-28 pt-2 space-y-4">
      {/* Push Notification Panel */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Bell className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Apple Web Push Notifications</h3>
              <p className="text-xs text-gray-400">
                Permission: <span className="font-semibold text-gray-200 capitalize">{pushPermission}</span>
              </p>
            </div>
          </div>

          <button
            onClick={isPushSubscribed ? onUnsubscribePush : onSubscribePush}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isPushSubscribed
                ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60 hover:bg-rose-900/60'
                : 'bg-blue-600 text-white shadow-md shadow-blue-600/30 hover:bg-blue-500'
            }`}
          >
            {isPushSubscribed ? 'Disable' : 'Enable'}
          </button>
        </div>

        {isPushSubscribed && (
          <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
              <Check className="w-3.5 h-3.5" /> Notifications active on this device
            </span>
            <button
              onClick={handleTestPush}
              disabled={testingPush}
              className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-2.5 py-1 rounded-lg flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              <span>{testingPush ? 'Sending...' : 'Send Test Push'}</span>
            </button>
          </div>
        )}

        {testPushResult && (
          <div className="p-2.5 rounded-xl bg-[#141722] border border-blue-500/30 text-xs text-blue-300">
            {testPushResult}
          </div>
        )}

        {/* Installation state */}
        <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-xs text-gray-300 flex items-center justify-between">
          <span>Home Screen Mode:</span>
          <span
            className={`font-semibold ${
              isStandalone ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {isStandalone ? 'Installed (Standalone)' : 'Browser Window'}
          </span>
        </div>
      </div>

      {/* Server & Authentication Settings */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-blue-400" /> Connection & Credentials
          </h3>
          <button
            type="button"
            onClick={async () => {
              setTestingPush(true);
              try {
                const res = await fetch(`${serverUrl}/api/v1/health`, {
                  headers: { Authorization: `Bearer ${apiToken}` },
                });
                if (res.ok) {
                  const data = await res.json();
                  alert(`✓ Connected to backend!\nStatus: ${data.status}\nApp: ${data.app}`);
                } else {
                  alert(`✗ Failed to connect (${res.status} ${res.statusText})`);
                }
              } catch (e: any) {
                alert(`✗ Connection Error: ${e.message}\nMake sure backend is running and URL is reachable from this device.`);
              } finally {
                setTestingPush(false);
              }
            }}
            className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold px-2 py-0.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-all"
          >
            Test Connection
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-400 block">Backend Server URL</label>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-gray-500">Presets:</span>
              <button
                type="button"
                onClick={() => setServerUrl(window.location.origin)}
                className="text-gray-400 hover:text-white underline decoration-dotted"
                title="Use current website origin"
              >
                Origin
              </button>
              <span className="text-gray-600">|</span>
              <button
                type="button"
                onClick={() => setServerUrl('http://pms.rishabhslab.in')}
                className="text-gray-400 hover:text-white underline decoration-dotted"
                title="Use Cloud Gateway"
              >
                pms.rishabhslab.in
              </button>
              <span className="text-gray-600">|</span>
              <button
                type="button"
                onClick={() => setServerUrl('http://localhost:8000')}
                className="text-gray-400 hover:text-white underline decoration-dotted"
                title="Use local machine port 8000"
              >
                localhost:8000
              </button>
            </div>
          </div>
          <input
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            className="w-full bg-[#141722] border border-white/5 rounded-xl px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-blue-500/50"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Device API Token</label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              className="w-full bg-[#141722] border border-white/5 rounded-xl pl-3 pr-10 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-blue-500/50"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Device Name</label>
          <input
            type="text"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            className="w-full bg-[#141722] border border-white/5 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        <button
          onClick={handleSaveConnection}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-[0.99]"
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" /> Saved Successfully!
            </>
          ) : (
            'Save Connection Settings'
          )}
        </button>
      </div>

      {/* API Token Manager */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
          <Key className="w-3.5 h-3.5 text-blue-400" /> Manage API Tokens
        </h3>

        {/* Create token */}
        <form onSubmit={handleCreateToken} className="flex gap-2">
          <input
            type="text"
            value={newTokenName}
            onChange={(e) => setNewTokenName(e.target.value)}
            placeholder="New token label (e.g. Work Mac)"
            className="flex-1 bg-[#141722] border border-white/5 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500/50"
          />
          <button
            type="submit"
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Create
          </button>
        </form>

        {createdTokenPlain && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-1.5">
            <span className="text-[11px] font-bold text-emerald-400 block">
              New Token Created (copy now, won't be shown again):
            </span>
            <div className="flex items-center justify-between bg-black/40 p-2 rounded-lg font-mono text-xs text-emerald-300">
              <span className="truncate">{createdTokenPlain}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdTokenPlain);
                  setCopiedToken(true);
                  setTimeout(() => setCopiedToken(false), 2000);
                }}
                className="p-1 text-emerald-400 hover:text-white"
              >
                {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* Existing tokens */}
        <div className="space-y-1.5 pt-1">
          {tokens.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#141722] border border-white/5 text-xs"
            >
              <div>
                <span className="font-semibold text-gray-200">{t.name}</span>
                <span className="text-gray-500 font-mono text-[11px] ml-2">
                  {t.token_prefix}
                </span>
                {t.is_revoked && (
                  <span className="ml-2 text-[10px] text-rose-400 font-semibold">(Revoked)</span>
                )}
              </div>
              {!t.is_revoked && (
                <button
                  onClick={() => handleRevokeToken(t.id)}
                  className="text-gray-500 hover:text-rose-400 p-1"
                  title="Revoke token"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
