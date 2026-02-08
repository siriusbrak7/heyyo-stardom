import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Headset, AlertCircle } from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  senderType: 'user' | 'admin';
  text: string;
  timestamp: number;
}

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      senderId: 'admin', 
      senderType: 'admin', 
      text: 'Hey there! How can I help you with your production today?', 
      timestamp: Date.now() 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const simulateAdminResponse = useCallback((userMessage: string): string => {
    const responses = [
      "Great question! For beat licensing, our Pro plan includes basic commercial rights for up to 100k streams.",
      "You can preview any beat before downloading. Just click the play button on any beat card.",
      "WAV files are available with Pro and Exclusive plans. They're 24-bit, 48kHz studio quality.",
      "Download limits reset on the 1st of each month. Basic plan gets 30 MP3 downloads monthly.",
      "Exclusive beats require the Exclusive plan for full commercial rights and stem access.",
      "Yes, you can cancel anytime from your dashboard. No long-term contracts.",
      "For technical issues, try clearing your browser cache or contact support at help@currystardom.com."
    ];
    
    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes('license') || lowerMessage.includes('rights')) {
      return responses[0];
    } else if (lowerMessage.includes('preview') || lowerMessage.includes('listen')) {
      return responses[1];
    } else if (lowerMessage.includes('wav') || lowerMessage.includes('quality')) {
      return responses[2];
    } else if (lowerMessage.includes('download') || lowerMessage.includes('limit')) {
      return responses[3];
    } else if (lowerMessage.includes('exclusive') || lowerMessage.includes('stem')) {
      return responses[4];
    } else if (lowerMessage.includes('cancel') || lowerMessage.includes('contract')) {
      return responses[5];
    } else if (lowerMessage.includes('issue') || lowerMessage.includes('problem')) {
      return responses[6];
    }
    
    return "Thanks for your question! For specific inquiries about beats, licensing, or technical support, please email us at support@currystardom.com.";
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const messageText = input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      senderId: 'user',
      senderType: 'user',
      text: messageText,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setError(null);
    setIsLoading(true);

    try {
      let responseText = '';
      
      if (API_KEY && API_KEY.length > 20) {
        // Try Gemini API if key exists
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `As Curry Stardom support agent, respond professionally to: "${messageText}". Keep response under 2 sentences. Focus on beat licensing, music production, or technical support.`
                }]
              }]
            })
          });

          if (!response.ok) {
            throw new Error('API request failed');
          }

          const data = await response.json();
          responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || simulateAdminResponse(messageText);
        } catch (apiError) {
          console.warn('Gemini API failed, using fallback:', apiError);
          responseText = simulateAdminResponse(messageText);
        }
      } else {
        // Use simulated response if no API key
        responseText = simulateAdminResponse(messageText);
      }

      const adminMessage: Message = {
        id: (Date.now() + 1).toString(),
        senderId: 'admin',
        senderType: 'admin',
        text: responseText,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, adminMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      setError("Support service temporarily unavailable. Please try again later.");
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        senderId: 'admin',
        senderType: 'admin',
        text: "Sorry, I'm having trouble connecting. Please email support@currystardom.com for assistance.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {isOpen ? (
        <div className="bg-[#121212] w-80 md:w-96 h-[500px] rounded-3xl shadow-2xl border border-white/10 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
          {/* Header */}
          <div className="p-4 bg-yellow-500 text-black flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg">
                <Headset className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h4 className="font-bold leading-none">Support Agent</h4>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Online Now</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="hover:bg-black/10 p-1 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm break-words ${
                  msg.senderType === 'user' 
                    ? 'bg-yellow-500 text-black rounded-tr-none' 
                    : 'bg-white/5 text-gray-200 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            {error && (
              <div className="flex justify-center px-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-4 border-t border-white/5 flex gap-2">
            <input 
              type="text" 
              placeholder="Ask about licenses, downloads, or support..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-yellow-500 text-sm transition-colors text-white disabled:opacity-50"
              disabled={isLoading}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="bg-yellow-500 text-black p-2 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 md:w-16 md:h-16 bg-yellow-500 text-black rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
        >
          <MessageCircle className="w-8 h-8 group-hover:rotate-12 transition-transform" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-black rounded-full animate-pulse" />
        </button>
      )}
    </div>
  );
};

export default ChatWidget;