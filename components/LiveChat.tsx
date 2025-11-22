
import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, Message } from '../types';
import { getContactList, getHistoryFromDB, saveMessageToDB, Contact } from '../services/supabaseClient';
import { Send, RefreshCw, User, MessageSquare, Clock, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface LiveChatProps {
  settings: AppSettings;
}

const LiveChat: React.FC<LiveChatProps> = ({ settings }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch contacts list
  const fetchContacts = async () => {
    const data = await getContactList();
    setContacts(data);
  };

  // Initial load and polling for contacts
  useEffect(() => {
    fetchContacts();
    const interval = setInterval(() => {
      if (autoRefresh) fetchContacts();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Fetch messages when a session is selected
  useEffect(() => {
    if (selectedSessionId) {
      loadMessages(selectedSessionId);
      // Poll for new messages in the active chat
      const interval = setInterval(() => {
        if (autoRefresh) loadMessages(selectedSessionId);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedSessionId, autoRefresh]);

  const loadMessages = async (sessionId: string) => {
    const history = await getHistoryFromDB(sessionId);
    setMessages(history);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedSessionId) return;
    
    setSending(true);
    const content = inputValue;
    setInputValue('');

    const adminMsg: Message = {
      id: Date.now().toString(),
      role: 'model', // Saved as model so it appears as the bot in logs
      content: content,
      created_at: new Date().toISOString()
    };

    // 1. Save to DB so AI has context
    await saveMessageToDB(adminMsg, selectedSessionId);
    
    // 2. Update local UI immediately
    setMessages(prev => [...prev, adminMsg]);

    // 3. Push to LINE via our own Unified Server
    // We call the local endpoint /api/push. This works because the React app 
    // is hosted by the same Express server in production.
    try {
      const res = await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              to: selectedSessionId,
              message: content
          })
      });
      
      if (!res.ok) {
          // If /api/push fails (e.g. 404), we might be in Simulator mode (localhost React without Node).
          console.warn("Backend /api/push failed. Are you running the full server?");
          // Fallback alert or silent fail if just testing UI
      }
    } catch (e) {
      console.error("Push Error:", e);
      // Don't alert loudly, as message is saved to DB anyway.
    }

    setSending(false);
  };

  return (
    <div className="flex h-full bg-white">
      {/* Left Sidebar: Contact List */}
      <div className="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
           <h2 className="font-bold text-slate-700 flex items-center gap-2">
             <User className="w-5 h-5 text-indigo-600" /> Inbox
           </h2>
           <button onClick={fetchContacts} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
             <RefreshCw className="w-4 h-4 text-slate-500" />
           </button>
        </div>
        
        <div className="overflow-y-auto flex-1">
          {contacts.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
               No conversations found.
            </div>
          )}
          {contacts.map(contact => (
            <button
              key={contact.sessionId}
              onClick={() => setSelectedSessionId(contact.sessionId)}
              className={`w-full text-left p-4 border-b border-slate-100 hover:bg-white transition-all ${selectedSessionId === contact.sessionId ? 'bg-white border-l-4 border-l-indigo-600 shadow-sm' : 'border-l-4 border-l-transparent'}`}
            >
               <div className="flex justify-between mb-1">
                 <span className="font-mono text-xs font-medium text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                    {contact.sessionId.slice(0,8)}...
                 </span>
                 <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(contact.lastActive).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                 </span>
               </div>
               <div className="text-sm text-slate-800 font-medium truncate mb-1">
                  {contact.lastMessage || "(No content)"}
               </div>
               <div className="text-xs text-slate-400">
                 {contact.messageCount} messages
               </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Chat Area */}
      <div className="w-2/3 flex flex-col bg-[#90b3d9]">
         {selectedSessionId ? (
           <>
             {/* Header */}
             <div className="bg-white/90 backdrop-blur p-4 border-b border-slate-200 shadow-sm flex justify-between items-center z-10">
                <div>
                   <div className="text-xs font-mono text-slate-500">Talking to:</div>
                   <div className="font-bold text-slate-800">{selectedSessionId}</div>
                </div>
                <div className="flex items-center gap-2">
                   <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="rounded text-indigo-600" />
                      Live Sync
                   </label>
                </div>
             </div>

             {/* Messages */}
             <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                   <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[70%] flex flex-col ${msg.role === 'user' ? 'items-start' : 'items-end'}`}>
                         <span className="text-[10px] text-slate-600 mb-1 px-1">
                           {msg.role === 'user' ? 'User' : settings.botName} • {new Date(msg.created_at).toLocaleTimeString()}
                         </span>
                         <div className={`px-4 py-2 rounded-2xl text-sm shadow-sm ${
                           msg.role === 'user' 
                             ? 'bg-white text-slate-800 rounded-tl-none' 
                             : 'bg-[#9de662] text-black rounded-tr-none'
                         }`}>
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                         </div>
                      </div>
                   </div>
                ))}
                <div ref={messagesEndRef} />
             </div>

             {/* Input */}
             <div className="bg-white p-4 border-t border-slate-200">
                <div className="flex gap-2">
                   <input 
                     type="text" 
                     value={inputValue}
                     onChange={(e) => setInputValue(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                     placeholder="Type a reply to send to LINE..."
                     className="flex-1 border border-slate-300 rounded-full px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                     disabled={sending}
                   />
                   <button 
                     onClick={handleSendMessage}
                     disabled={sending || !inputValue.trim()}
                     className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full transition-colors disabled:opacity-50"
                   >
                     <Send className="w-5 h-5" />
                   </button>
                </div>
                <div className="mt-2 flex items-start gap-1 text-[10px] text-slate-500 bg-slate-50 p-2 rounded">
                   <AlertTriangle className="w-3 h-3 mt-0.5" />
                   <p>
                     Sent messages are routed via the Unified Server to LINE.
                   </p>
                </div>
             </div>
           </>
         ) : (
           <div className="flex flex-col items-center justify-center h-full text-white/80">
              <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a conversation to start monitoring</p>
           </div>
         )}
      </div>
    </div>
  );
};

export default LiveChat;
