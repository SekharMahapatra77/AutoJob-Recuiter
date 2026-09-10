import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon,
  Mail,
  Sparkles,
  Shield,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Save,
  RefreshCw,
  LogOut
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // IMAP and AI configuration form
  const [formData, setFormData] = useState({
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    imapUser: '',
    imapPassword: '',
    imapTls: true,
    aiProvider: 'openai',
    aiBaseUrl: 'https://api.openai.com/v1',
    aiModel: 'gpt-4o-mini'
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      if (res.data.success) {
        setSettings(res.data.data);
        setFormData({
          imapHost: res.data.data.imapHost || 'imap.gmail.com',
          imapPort: res.data.data.imapPort || 993,
          imapUser: res.data.data.imapUser || '',
          imapPassword: '',
          imapTls: res.data.data.imapTls !== undefined ? res.data.data.imapTls : true,
          aiProvider: res.data.data.aiProvider || 'openai',
          aiBaseUrl: res.data.data.aiBaseUrl || 'https://api.openai.com/v1',
          aiModel: res.data.data.aiModel || 'gpt-4o-mini'
        });
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleConnectGmail = async () => {
    try {
      const res = await api.get('/settings/gmail/auth-url');
      if (res.data.success && res.data.data.url) {
        window.open(res.data.data.url, '_blank', 'width=550,height=600');
      }
    } catch (err: any) {
      alert(
        err.response?.data?.message ||
          'Google OAuth Client ID & Secret are not yet configured in .env. The platform will automatically use standard SMTP or development simulation mode.'
      );
    }
  };

  const handleDisconnectGmail = async () => {
    if (!window.confirm('Disconnect your Gmail integration?')) return;
    try {
      await api.post('/settings/gmail/disconnect');
      fetchSettings();
    } catch (e) {
      alert('Failed to disconnect Gmail.');
    }
  };

  const handleSaveIntegrations = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage('');
    try {
      const res = await api.put('/settings/integrations', formData);
      if (res.data.success) {
        setSaveMessage('Integrations configuration saved successfully!');
        setTimeout(() => setSaveMessage(''), 4000);
        fetchSettings();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestImap = async () => {
    try {
      const res = await api.post('/settings/imap/test');
      alert(res.data.message);
    } catch (err: any) {
      alert(err.response?.data?.message || 'IMAP connection failed. Please check credentials.');
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-blue-600" />
          Platform Settings & Integrations
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Configure Gmail OAuth 2.0, IMAP reply listener, AI endpoints, and system security.
        </p>
      </div>

      {saveMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Gmail OAuth Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Gmail OAuth 2.0 Integration</h3>
              <p className="text-xs text-slate-500">
                Send personalized C2C outreach emails and follow-ups securely without sharing passwords.
              </p>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
              settings?.gmailConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {settings?.gmailConnected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Connected ({settings.gmailEmail})
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                Dev Mode / Offline
              </>
            )}
          </span>
        </div>

        <div className="text-xs text-slate-600">
          {settings?.gmailConnected ? (
            <div className="flex items-center justify-between">
              <span>Authorized account: <strong className="text-slate-800">{settings.gmailEmail}</strong></span>
              <button
                type="button"
                onClick={handleDisconnectGmail}
                className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold rounded-lg transition"
              >
                Disconnect Gmail
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="max-w-md">
                In local development without Google Cloud credentials, the system automatically uses reliable development delivery simulation so your outreach and follow-up flows work completely.
              </p>
              <button
                type="button"
                onClick={handleConnectGmail}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex-shrink-0"
              >
                <Mail className="w-3.5 h-3.5 mr-1.5" />
                Connect Gmail Account
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI & IMAP Configuration Form */}
      <form onSubmit={handleSaveIntegrations} className="space-y-6">
        {/* AI Provider Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">AI Provider Configuration</h3>
              <p className="text-xs text-slate-500">
                Configurable OpenAI-compatible LLM endpoint with built-in non-hallucinatory NLP fallback.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Provider Type</label>
              <select
                value={formData.aiProvider}
                onChange={(e) => setFormData({ ...formData, aiProvider: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="openai">OpenAI (or Compatible)</option>
                <option value="groq">Groq</option>
                <option value="ollama">Ollama (Local)</option>
                <option value="custom">Custom Provider</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">API Base URL</label>
              <input
                type="text"
                value={formData.aiBaseUrl}
                onChange={(e) => setFormData({ ...formData, aiBaseUrl: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Model Name</label>
              <input
                type="text"
                value={formData.aiModel}
                onChange={(e) => setFormData({ ...formData, aiModel: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">API Key Status:</span>
            {settings?.hasAiKey ? (
              <span className="text-emerald-600 font-semibold">Configured in server .env</span>
            ) : (
              <span className="text-amber-600 font-semibold">
                Using built-in deterministic heuristic engine (Strict Non-Hallucination Active)
              </span>
            )}
          </div>
        </div>

        {/* IMAP Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">IMAP Inbound Mail Listener</h3>
              <p className="text-xs text-slate-500">
                Polls incoming replies from recruiters, maps threads to outreach, and triggers classification.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">IMAP Host</label>
              <input
                type="text"
                value={formData.imapHost}
                onChange={(e) => setFormData({ ...formData, imapHost: e.target.value })}
                placeholder="imap.gmail.com"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Port</label>
              <input
                type="number"
                value={formData.imapPort}
                onChange={(e) => setFormData({ ...formData, imapPort: Number(e.target.value) })}
                placeholder="993"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">TLS / SSL</label>
              <select
                value={formData.imapTls ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, imapTls: e.target.value === 'true' })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="true">Enabled (SSL/TLS)</option>
                <option value="false">Disabled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">IMAP Username</label>
              <input
                type="text"
                value={formData.imapUser}
                onChange={(e) => setFormData({ ...formData, imapUser: e.target.value })}
                placeholder="outreach@agency.com"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                App Password / Token
              </label>
              <input
                type="password"
                value={formData.imapPassword}
                onChange={(e) => setFormData({ ...formData, imapPassword: e.target.value })}
                placeholder="Leave blank to keep current"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleTestImap}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Test IMAP Connection
            </button>
          </div>
        </div>

        {/* Save Settings Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Save className="w-4 h-4 mr-1.5" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
