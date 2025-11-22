
import React, { useState } from 'react';
import { AppSettings } from '../types';
import { Copy, Server, Terminal, Globe, AlertTriangle, Package, Rocket, FileJson, Check } from 'lucide-react';

interface DeployViewProps {
  settings: AppSettings;
}

const DeployView: React.FC<DeployViewProps> = ({ settings }) => {
  const [activeTab, setActiveTab] = useState<'server' | 'package'>('server');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const nodeCode = `
// server.js
// A unified server for your LINE Bot + Admin Panel
// Run: node server.js

require('dotenv').config();
const express = require('express');
const path = require('path');
const line = require('@line/bot-sdk');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
const { createClient } = require('@supabase/supabase-js');

// --- 1. CONFIGURATION ---
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

// Initialize Clients
const client = new line.Client(config);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// System Prompt
const SYSTEM_INSTRUCTION = process.env.SYSTEM_INSTRUCTION || "${settings.systemInstruction.replace(/\n/g, '\\n')}";
const MODEL_NAME = process.env.MODEL_NAME || "${settings.modelName}";

// --- 2. EXPRESS SERVER SETUP ---
const app = express();

// Important for Render/Heroku to detect HTTPS correctly
app.set('trust proxy', true); 

// Serve static files from the React frontend build directory
app.use(express.static(path.join(__dirname, 'dist')));

app.use(cors());
app.use(express.json());

// --- 3. API ENDPOINTS ---

// Check Webhook Status
app.get('/api/webhook-status', async (req, res) => {
  try {
    const info = await client.getWebhookEndpointInfo();
    res.json(info);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Auto-Configure Webhook
app.post('/api/set-webhook', async (req, res) => {
  try {
    // Auto-detect the full URL of this server
    const protocol = req.protocol; 
    const host = req.get('host');
    const fullUrl = \`\${protocol}://\${host}\`;
    const webhookUrl = \`\${fullUrl}/callback\`;

    console.log(\`Setting webhook to: \${webhookUrl}\`);
    await client.setWebhookEndpointUrl(webhookUrl);
    res.json({ success: true, url: webhookUrl });
  } catch (e) {
    console.error("Webhook Config Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Push Message (For Live Chat)
app.post('/api/push', async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: "Missing 'to' or 'message'" });
  
  try {
     // Save manually sent message to DB first
     await saveMessage(to, 'model', message);
     // Push to LINE
     await client.pushMessage(to, { type: 'text', text: message });
     res.json({ success: true });
  } catch(e) {
     console.error("Push Error:", e);
     res.status(500).json({ error: e.message });
  }
});

// --- 4. BOT LOGIC ---

async function saveMessage(sessionId, role, content) {
  try {
    await supabase.from('chat_logs').insert([
      { session_id: sessionId, role, content }
    ]);
  } catch (e) {
    console.error("DB Save Error:", e.message);
  }
}

async function getHistory(sessionId) {
  const { data } = await supabase
    .from('chat_logs')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (!data) return [];
  
  return data.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    })).reverse();
}

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userId = event.source.userId;
  const userMessage = event.message.text;
  const replyToken = event.replyToken;

  try {
    // UX: Show Loading
    try { await client.showLoadingAnimation({ chatId: userId, loadingSeconds: 20 }); } catch(e) {}

    // Get Profile
    let userDisplayName = "User";
    try {
        const profile = await client.getProfile(userId);
        userDisplayName = profile.displayName;
    } catch(e) {}

    // Save User Msg
    await saveMessage(userId, 'user', userMessage);

    // Generate AI Response
    const history = await getHistory(userId);
    const dynamicInstruction = \`\${SYSTEM_INSTRUCTION}\\n\\n(User: \${userDisplayName})\`;

    const chat = ai.chats.create({
      model: MODEL_NAME,
      history: history,
      config: { systemInstruction: dynamicInstruction }
    });

    const result = await chat.sendMessage({ message: userMessage });
    const botResponse = result.text;

    // Save & Reply
    await saveMessage(userId, 'model', botResponse);
    return client.replyMessage(replyToken, { type: 'text', text: botResponse });

  } catch (err) {
    console.error("Error processing event:", err);
    return Promise.resolve(null);
  }
}

app.post('/callback', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// --- 5. STARTUP ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Unified Server running on port \${PORT}\`);
});
`;

  const packageJsonCode = `{
  "name": "line-bot-unified",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": {
    "build": "npm install && npm run build-react",
    "build-react": "vite build",
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "@line/bot-sdk": "^7.5.2",
    "@google/genai": "^0.1.1",
    "@supabase/supabase-js": "^2.38.4",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5"
  }
}`;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 pb-24">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Rocket className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Unified Deployment</h1>
        </div>
        <p className="text-slate-600 max-w-3xl leading-relaxed">
          Follow these steps to host your <strong>LINE Bot</strong> and <strong>Admin Panel</strong> together on Render.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
         
         {/* Code View Column */}
         <div className="lg:col-span-2 space-y-6">
            
            {/* File Switcher */}
            <div className="flex border-b border-slate-200">
              <button 
                onClick={() => setActiveTab('server')}
                className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${activeTab === 'server' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Terminal className="w-4 h-4" /> server.js
              </button>
              <button 
                onClick={() => setActiveTab('package')}
                className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${activeTab === 'package' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <FileJson className="w-4 h-4" /> package.json
              </button>
            </div>

            <div className="bg-[#1e1e1e] rounded-b-xl rounded-tr-xl overflow-hidden shadow-lg border border-slate-700">
              <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-[#333]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                      <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                      <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                  </div>
                  <span className="ml-3 text-xs text-slate-400 font-mono">
                    {activeTab === 'server' ? 'server.js' : 'package.json'}
                  </span>
                </div>
                <button 
                  onClick={() => handleCopy(activeTab === 'server' ? nodeCode : packageJsonCode, 'code')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors text-xs font-medium"
                >
                  {copiedField === 'code' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedField === 'code' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-4 overflow-x-auto max-h-[500px] custom-scrollbar">
                <pre className="font-mono text-sm text-[#d4d4d4] leading-relaxed">
                  <code>{activeTab === 'server' ? nodeCode : packageJsonCode}</code>
                </pre>
              </div>
            </div>
         </div>

         {/* Configuration Column */}
         <div className="space-y-6">
             
             {/* Render Settings Box */}
             <div className="bg-white p-6 rounded-xl border-2 border-indigo-100 shadow-sm">
                 <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg">
                   <Globe className="w-5 h-5 text-indigo-600" /> Render Configuration
                 </h3>
                 
                 <div className="space-y-4">
                   <div>
                     <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Build Command</label>
                     <div className="flex items-center gap-2">
                       <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm border border-slate-200 font-mono text-slate-700 overflow-hidden text-ellipsis whitespace-nowrap">
                         npm install && npm run build
                       </code>
                       <button 
                          onClick={() => handleCopy("npm install && npm run build", "buildCmd")}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          title="Copy Build Command"
                       >
                         {copiedField === 'buildCmd' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                       </button>
                     </div>
                   </div>

                   <div>
                     <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Start Command</label>
                     <div className="flex items-center gap-2">
                       <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm border border-slate-200 font-mono text-slate-700 font-bold">
                         node server.js
                       </code>
                       <button 
                          onClick={() => handleCopy("node server.js", "startCmd")}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          title="Copy Start Command"
                       >
                         {copiedField === 'startCmd' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                       </button>
                     </div>
                   </div>

                   <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                      <p className="text-xs text-amber-800 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        Don't forget to add your Environment Variables (API Keys) in the Render Dashboard!
                      </p>
                   </div>
                 </div>
             </div>

             {/* Terminal Commands Box */}
             <div className="bg-slate-900 text-slate-300 p-6 rounded-xl shadow-lg">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Terminal className="w-5 h-5" /> Local Setup (Terminal)
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-indigo-300 uppercase font-semibold mb-1">1. Install Dependencies</p>
                    <div className="bg-black/50 p-2 rounded text-xs font-mono select-all text-slate-300 border border-slate-700">
                      npm install express @line/bot-sdk @google/genai @supabase/supabase-js dotenv cors
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-300 uppercase font-semibold mb-1">2. Build Frontend</p>
                    <div className="bg-black/50 p-2 rounded text-xs font-mono select-all text-slate-300 border border-slate-700">
                      npm run build
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-300 uppercase font-semibold mb-1">3. Run Locally</p>
                    <div className="bg-black/50 p-2 rounded text-xs font-mono select-all text-slate-300 border border-slate-700">
                      node server.js
                    </div>
                  </div>
                </div>
             </div>

         </div>
      </div>
    </div>
  );
};

export default DeployView;
