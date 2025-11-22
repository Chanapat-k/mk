
import React, { useState, useRef, useEffect } from 'react';
import { Message, AppSettings } from '../types';
import { generateResponse } from '../services/geminiService';
import { saveMessageToDB } from '../services/supabaseClient';
import { Send, ChevronLeft, Search, Menu, MoreVertical, Smartphone, Shield } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatSimulatorProps {
  settings: AppSettings;
}

const ChatSimulator: React.FC<ChatSimulatorProps> = ({ settings }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`session_${Date.now()}`); // Unique session for this run
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    if (!settings.geminiApiKey) {
      alert("Please configure Gemini API Key in Settings first.");
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    // Save User Msg to DB
    await saveMessageToDB(userMsg, sessionId);

    try {
      const responseText = await generateResponse(userMsg.content, messages, settings);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, aiMsg]);
      await saveMessageToDB(aiMsg, sessionId);

    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
         id: Date.now().toString(),
         role: 'system',
         content: "Error: Could not connect to Gemini.",
         created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helpers for LINE-like Time format
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-slate-50 p-6">
      
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-3">
          <Smartphone className="w-6 h-6 text-indigo-600" /> 
          Device Simulator
        </h2>
        <p className="text-slate-500 mt-2">This preview simulates how your bot appears on a user's phone.</p>
      </div>

      {/* Phone Frame */}
      <div className="relative w-[375px] h-[740px] bg-black rounded-[3.5rem] border-8 border-slate-900 shadow-2xl overflow-hidden ring-4 ring-slate-200">
        
        {/* Dynamic Island / Notch */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-28 h-7 bg-black rounded-b-2xl z-30"></div>

        {/* LINE App Header */}
        <div className="bg-[#181d26] text-white pt-12 pb-3 px-4 flex items-center justify-between z-20 relative shadow-sm">
          <div className="flex items-center gap-3">
             <ChevronLeft className="w-6 h-6" />
             <div className="flex items-center gap-2">
               <div className="font-medium text-lg tracking-wide">{settings.botName}</div>
               <Shield className="w-3 h-3 text-green-400 fill-green-400" />
             </div>
          </div>
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5" />
            <MoreVertical className="w-5 h-5" />
          </div>
        </div>

        {/* Chat Area (LINE Background Color) */}
        <div className="h-[calc(100%-140px)] bg-[#90b3d9] overflow-y-auto p-3 space-y-4 no-scrollbar">
           
           {/* Start of Chat Notice */}
           {messages.length === 0 && (
             <div className="text-center mt-8 mb-8">
                <div className="bg-[#00000010] inline-block px-3 py-1 rounded-full text-[10px] text-[#ffffffaa]">
                   Today
                </div>
             </div>
           )}
           
           {messages.map((msg) => (
             <div key={msg.id} className={`flex w-full gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               
               {/* Avatar for Bot */}
               {msg.role === 'model' && (
                 <div className="w-8 h-8 min-w-[32px] rounded-full bg-white flex items-center justify-center text-[#181d26] font-bold text-xs border border-gray-200 mt-1">
                    {settings.botName.charAt(0)}
                 </div>
               )}

               <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[75%]`}>
                 
                 {msg.role === 'model' && (
                    <span className="text-[10px] text-white mb-1 ml-1">{settings.botName}</span>
                 )}

                 <div className="flex items-end gap-1.5">
                    {/* Timestamp User (Left of bubble) */}
                    {msg.role === 'user' && (
                       <span className="text-[9px] text-white mb-1 min-w-[25px] text-right">
                         Read<br/>
                         {formatTime(msg.created_at)}
                       </span>
                    )}

                    {/* Bubble */}
                    <div 
                        className={`px-3 py-2 text-[14px] leading-snug relative shadow-sm break-words
                          ${msg.role === 'user' 
                            ? 'bg-[#9de662] text-black rounded-[1.2rem] rounded-tr-none' 
                            : 'bg-white text-black rounded-[1.2rem] rounded-tl-none'
                          }
                          ${msg.role === 'system' ? 'bg-red-100 text-red-600 w-full text-center rounded-lg' : ''}
                        `}
                    >
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>

                    {/* Timestamp Bot (Right of bubble) */}
                    {msg.role !== 'user' && (
                       <span className="text-[9px] text-white mb-1 min-w-[25px]">
                         {formatTime(msg.created_at)}
                       </span>
                    )}
                 </div>
               </div>
             </div>
           ))}

           {/* Loading Indicator */}
           {isLoading && (
             <div className="flex w-full gap-2 justify-start">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#181d26] font-bold text-xs mt-1">
                   {settings.botName.charAt(0)}
                </div>
                <div className="bg-white px-4 py-3 rounded-[1.2rem] rounded-tl-none shadow-sm flex gap-1.5 items-center w-16">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                </div>
             </div>
           )}
           <div ref={messagesEndRef} />
        </div>

        {/* LINE Input Area */}
        <div className="absolute bottom-0 w-full bg-[#f4f4f4] px-3 py-2 flex items-center gap-3 border-t border-slate-300 pb-6">
          <div className="p-2">
             <Menu className="w-6 h-6 text-slate-500" />
          </div>
          <div className="flex-1 relative">
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Aa"
                className="w-full bg-[#ececec] border-none rounded-full px-4 py-2 text-sm outline-none focus:bg-white transition-colors placeholder:text-slate-400 text-slate-800"
                disabled={isLoading}
            />
          </div>
          <button 
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className={`p-2 rounded-full transition-colors text-[#1d429a] ${!inputValue.trim() ? 'opacity-30' : 'opacity-100'}`}
          >
            <Send className="w-6 h-6" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default ChatSimulator;
