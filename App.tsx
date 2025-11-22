
import React, { useState, useEffect } from 'react';
import { AppSettings, ViewState } from './types';
import Settings from './components/Settings';
import ChatSimulator from './components/ChatSimulator';
import DatabaseView from './components/DatabaseView';
import DeployView from './components/DeployView';
import LiveChat from './components/LiveChat';
import { MessageSquare, Settings as SettingsIcon, Database, LayoutDashboard, Bot, Code2, Radio } from 'lucide-react';
import { initSupabase } from './services/supabaseClient';

const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  supabaseUrl: '',
  supabaseKey: '',
  lineChannelAccessToken: '',
  lineChannelSecret: '',
  systemInstruction: 'You are a helpful and friendly AI assistant for a LINE account. Keep your responses concise and engaging. You can use Emoji.',
  botName: 'Gemini Bot',
  modelName: 'gemini-2.5-flash'
};

function App() {
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const saved = localStorage.getItem('line_bot_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      if (parsed.supabaseUrl && parsed.supabaseKey) {
        initSupabase(parsed.supabaseUrl, parsed.supabaseKey);
      }
    }
  }, []);

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('line_bot_settings', JSON.stringify(newSettings));
    if (newSettings.supabaseUrl && newSettings.supabaseKey) {
      initSupabase(newSettings.supabaseUrl, newSettings.supabaseKey);
    }
    alert("Settings saved successfully!");
  };

  const renderContent = () => {
    switch (view) {
      case ViewState.SETTINGS:
        return <Settings settings={settings} onSave={handleSaveSettings} />;
      case ViewState.SIMULATOR:
        return <ChatSimulator settings={settings} />;
      case ViewState.DATABASE:
        return <DatabaseView settings={settings} />;
      case ViewState.DEPLOY:
        return <DeployView settings={settings} />;
      case ViewState.LIVE_CHAT:
        return <LiveChat settings={settings} />;
      case ViewState.DASHBOARD:
      default:
        return (
          <div className="max-w-5xl mx-auto p-6">
             <div className="mb-8">
               <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
               <p className="text-slate-500 mt-2">Welcome to the LINE Bot Control Center.</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <button onClick={() => setView(ViewState.LIVE_CHAT)} className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all text-left group relative overflow-hidden">
                   <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold">NEW</div>
                   <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Radio className="w-6 h-6" />
                   </div>
                   <h3 className="text-lg font-bold text-slate-800 mb-2">Live Monitor</h3>
                   <p className="text-slate-500 text-sm">Watch real conversations with users and intervene by sending messages manually.</p>
                </button>

                <button onClick={() => setView(ViewState.SIMULATOR)} className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all text-left group">
                   <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <MessageSquare className="w-6 h-6" />
                   </div>
                   <h3 className="text-lg font-bold text-slate-800 mb-2">Simulator</h3>
                   <p className="text-slate-500 text-sm">Test your bot interactively in a LINE-like interface before deploying.</p>
                </button>

                <button onClick={() => setView(ViewState.DATABASE)} className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all text-left group">
                   <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Database className="w-6 h-6" />
                   </div>
                   <h3 className="text-lg font-bold text-slate-800 mb-2">Logs & Memory</h3>
                   <p className="text-slate-500 text-sm">View conversation history stored in Supabase and analyze bot performance.</p>
                </button>

                <button onClick={() => setView(ViewState.SETTINGS)} className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all text-left group">
                   <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <SettingsIcon className="w-6 h-6" />
                   </div>
                   <h3 className="text-lg font-bold text-slate-800 mb-2">Configuration</h3>
                   <p className="text-slate-500 text-sm">Setup Gemini API keys, Supabase connection, and System Instructions.</p>
                </button>

                <button onClick={() => setView(ViewState.DEPLOY)} className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all text-left group">
                   <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Code2 className="w-6 h-6" />
                   </div>
                   <h3 className="text-lg font-bold text-slate-800 mb-2">Deploy & Connect</h3>
                   <p className="text-slate-500 text-sm">Get the Unified Server code to deploy your Bot + Admin Panel.</p>
                </button>
             </div>

             <div className="mt-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-4">Deployment Guide</h3>
                  <ol className="list-decimal list-inside space-y-3 opacity-90">
                    <li>Go to <strong>Deploy & Connect</strong> and copy the Unified Server code.</li>
                    <li>Build your React app and place it in a <code>dist</code> folder.</li>
                    <li>Deploy to Render.</li>
                    <li>Go to <strong>Configuration</strong> (on the deployed site) and click <strong>Set Webhook URL</strong>.</li>
                    <li>Your bot is live!</li>
                  </ol>
                </div>
                <Bot className="absolute -bottom-10 -right-10 w-64 h-64 opacity-10 rotate-12" />
             </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">L</div>
          <span className="font-bold text-lg text-slate-800 tracking-tight">LineBot Admin</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setView(ViewState.DASHBOARD)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === ViewState.DASHBOARD ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
          <button 
            onClick={() => setView(ViewState.LIVE_CHAT)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === ViewState.LIVE_CHAT ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Radio className="w-5 h-5" />
            Live Monitor
          </button>
          <button 
            onClick={() => setView(ViewState.SIMULATOR)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === ViewState.SIMULATOR ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <MessageSquare className="w-5 h-5" />
            Simulator
          </button>
          <button 
            onClick={() => setView(ViewState.DATABASE)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === ViewState.DATABASE ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Database className="w-5 h-5" />
            Database
          </button>
          <button 
            onClick={() => setView(ViewState.SETTINGS)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === ViewState.SETTINGS ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <SettingsIcon className="w-5 h-5" />
            Configuration
          </button>
          <button 
            onClick={() => setView(ViewState.DEPLOY)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === ViewState.DEPLOY ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Code2 className="w-5 h-5" />
            Deploy & Connect
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
           <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                {settings.botName.charAt(0)}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-slate-900 truncate">{settings.botName}</p>
                <p className="text-xs text-slate-500 truncate">{settings.modelName}</p>
              </div>
           </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-white border-b border-slate-200 z-50 flex justify-between px-4 py-3">
         <span className="font-bold text-lg text-slate-800">LineBot Admin</span>
         <button onClick={() => setView(ViewState.DASHBOARD)}><LayoutDashboard /></button>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
