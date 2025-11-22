
import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { Save, Database, Key, Bot, Terminal, MessageCircle, Radio, CheckCircle, XCircle, Zap } from 'lucide-react';
import { initSupabase, checkConnection } from '../services/supabaseClient';

interface SettingsProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onSave }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'failed'>('unknown');
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleChange = (field: keyof AppSettings, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
    // Attempt connection check if supabase creds are present
    if (formData.supabaseUrl && formData.supabaseKey) {
      initSupabase(formData.supabaseUrl, formData.supabaseKey);
      checkConnection().then(success => {
        setConnectionStatus(success ? 'success' : 'failed');
      });
    }
  };

  const handleAutoWebhook = async () => {
    setWebhookStatus('loading');
    try {
      const res = await fetch('/api/set-webhook', { method: 'POST' });
      if (res.ok) {
        setWebhookStatus('success');
        alert("Webhook successfully linked to this server!");
      } else {
        setWebhookStatus('error');
        const err = await res.text();
        alert("Failed: " + err + "\nAre you running this on the deployed server?");
      }
    } catch (e) {
      setWebhookStatus('error');
      alert("Connection error. This feature requires the Unified Server deployment.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-slate-200 mb-20">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
        <Terminal className="w-6 h-6 text-indigo-600" />
        <h2 className="text-2xl font-bold text-slate-800">System Configuration</h2>
      </div>

      <div className="space-y-8">
        {/* AI Configuration */}
        <section>
          <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5" /> AI Model Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-slate-600 mb-1">Gemini API Key</label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={formData.geminiApiKey}
                  onChange={(e) => handleChange('geminiApiKey', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="AIzaSy..."
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">Required to power the brain.</p>
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-slate-600 mb-1">Model Name</label>
              <select
                value={formData.modelName}
                onChange={(e) => handleChange('modelName', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended)</option>
                <option value="gemini-2.5-flash-lite-latest">gemini-flash-lite-latest</option>
                <option value="gemini-3-pro-preview">gemini-3-pro-preview</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1">Bot Name</label>
              <input
                type="text"
                value={formData.botName}
                onChange={(e) => handleChange('botName', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="My AI Assistant"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1">System Instruction</label>
              <textarea
                value={formData.systemInstruction}
                onChange={(e) => handleChange('systemInstruction', e.target.value)}
                className="w-full h-32 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                placeholder="You are a helpful assistant for a LINE official account..."
              />
            </div>
          </div>
        </section>

        <hr className="border-slate-100" />

        {/* LINE Configuration */}
        <section>
          <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5" /> LINE Messaging API
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1">Channel Access Token (Long-lived)</label>
              <input
                type="password"
                value={formData.lineChannelAccessToken}
                onChange={(e) => handleChange('lineChannelAccessToken', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs"
                placeholder="YOUR_CHANNEL_ACCESS_TOKEN"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1">Channel Secret</label>
              <input
                type="password"
                value={formData.lineChannelSecret}
                onChange={(e) => handleChange('lineChannelSecret', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs"
                placeholder="YOUR_CHANNEL_SECRET"
              />
            </div>
            
            {/* Auto Config Button */}
            <div className="col-span-2 bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex items-center justify-between">
              <div>
                <h4 className="text-indigo-900 font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Auto-Connect
                </h4>
                <p className="text-indigo-700 text-sm mt-1">
                  Once deployed, click this to automatically set the Webhook URL in LINE.
                </p>
              </div>
              <button 
                onClick={handleAutoWebhook}
                disabled={webhookStatus === 'loading'}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  webhookStatus === 'success' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {webhookStatus === 'loading' ? 'Connecting...' : webhookStatus === 'success' ? 'Connected!' : 'Set Webhook URL'}
              </button>
            </div>
          </div>
        </section>

        <hr className="border-slate-100" />

        {/* Database Configuration */}
        <section>
          <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2 mb-4">
            <Database className="w-5 h-5" /> Database (Supabase)
          </h3>
          
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600 mb-4">
            <p className="mb-2 font-semibold">Required Table Schema:</p>
            <code className="block bg-slate-800 text-green-400 p-3 rounded text-xs overflow-x-auto font-mono">
              create table chat_logs (<br/>
              &nbsp;&nbsp;id bigint generated by default as identity primary key,<br/>
              &nbsp;&nbsp;session_id text,<br/>
              &nbsp;&nbsp;role text,<br/>
              &nbsp;&nbsp;content text,<br/>
              &nbsp;&nbsp;created_at timestamp with time zone default timezone('utc'::text, now())<br/>
              );
            </code>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Supabase URL</label>
              <input
                type="text"
                value={formData.supabaseUrl}
                onChange={(e) => handleChange('supabaseUrl', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="https://xyz.supabase.co"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Supabase Anon Key</label>
              <input
                type="password"
                value={formData.supabaseKey}
                onChange={(e) => handleChange('supabaseKey', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="eyJh..."
              />
            </div>
          </div>

          <div className="mt-4">
            {connectionStatus === 'success' && (
               <div className="text-green-600 text-sm flex items-center gap-2 p-2 bg-green-50 rounded-md border border-green-100">
                 <CheckCircle className="w-4 h-4" /> Database Connected
               </div>
            )}
            {connectionStatus === 'failed' && (
               <div className="text-red-600 text-sm flex items-center gap-2 p-2 bg-red-50 rounded-md border border-red-100">
                 <XCircle className="w-4 h-4" /> Connection Failed (Check Table/Keys)
               </div>
            )}
          </div>
        </section>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end sticky bottom-0 bg-white py-4 border-b border-slate-50">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg font-medium"
        >
          <Save className="w-4 h-4" />
          Save Configuration
        </button>
      </div>
    </div>
  );
};

export default Settings;
