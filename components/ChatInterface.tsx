import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Sparkles, BrainCircuit, BookOpen, Loader2, Quote, Trash2, MessageSquare } from 'lucide-react';
import { ChatMessage, Book } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onClearChat: () => void;
  isLoading: boolean;
  isOpen: boolean;
  onToggle: () => void;
  activeBook: Book | null;
  currentSelection: string | null;
  onAnalyzeSelection: (type: 'explain' | 'summarize' | 'translate') => void;
  onEnableContext: () => void;
  isExtractingText: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  onClearChat,
  isLoading,
  isOpen,
  onToggle,
  activeBook,
  currentSelection,
  onAnalyzeSelection,
  onEnableContext,
  isExtractingText
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isOpen]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    await onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div 
      className={`fixed top-0 right-0 h-full bg-white shadow-2xl transition-all duration-300 transform z-30 flex flex-col border-l border-slate-200 ${
        isOpen ? 'translate-x-0 w-[400px]' : 'translate-x-full w-[400px]'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-2 text-slate-800 font-serif font-bold">
          <Sparkles className="text-amber-600" size={20} />
          <h3>Lumina AI</h3>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={onClearChat}
             className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
             title="Clear Chat"
           >
             <Trash2 size={16} />
           </button>
           <button onClick={onToggle} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500">
             <X size={20} />
           </button>
        </div>
      </div>

      {/* Book Context Status */}
      {activeBook && (
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600 truncate max-w-[200px]">
            <BookOpen size={14} />
            <span className="truncate">{activeBook.title}</span>
          </div>
          {activeBook.isContextEnabled ? (
             <span className="flex items-center gap-1 text-green-600 font-medium">
                <BrainCircuit size={14} /> Active
             </span>
          ) : (
             <button 
               onClick={onEnableContext}
               disabled={isExtractingText}
               className="text-blue-600 hover:underline disabled:opacity-50"
             >
               {isExtractingText ? 'Analyzing...' : 'Enable Context'}
             </button>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-60">
            <Sparkles size={48} className="text-amber-200" />
            <div className="text-center text-sm px-8">
              <p className="mb-2">Highlight text in the book to ask specific questions, or type below to chat about the book.</p>
            </div>
            
            {/* Quick Actions if Selection Exists */}
            {currentSelection && (
                <div className="flex flex-col gap-2 w-full px-8 animate-in slide-in-from-bottom-4 fade-in duration-300">
                    <p className="text-xs font-semibold text-center text-slate-500">Quick Actions</p>
                    <button onClick={() => onAnalyzeSelection('explain')} className="bg-white border border-slate-200 p-2 rounded text-xs hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition-colors shadow-sm">
                        Explain selection
                    </button>
                    <button onClick={() => onAnalyzeSelection('summarize')} className="bg-white border border-slate-200 p-2 rounded text-xs hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition-colors shadow-sm">
                        Summarize selection
                    </button>
                    <button onClick={() => onAnalyzeSelection('translate')} className="bg-white border border-slate-200 p-2 rounded text-xs hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition-colors shadow-sm">
                        Translate selection
                    </button>
                </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-slate-800 text-white rounded-br-none'
                  : msg.isError 
                    ? 'bg-red-50 text-red-600 border border-red-100'
                    : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
              }`}
            >
              {msg.text.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                      {line}
                      {i < msg.text.split('\n').length - 1 && <br />}
                  </React.Fragment>
              ))}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
              <Loader2 size={16} className="animate-spin text-amber-600" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        
        {/* Context Banner */}
        {currentSelection && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg relative animate-in slide-in-from-bottom-2 duration-200 group">
                <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-amber-800 uppercase tracking-wider">
                    <Quote size={10} />
                    <span>Reference Context</span>
                </div>
                <p className="text-xs text-slate-600 italic line-clamp-2 leading-relaxed">
                    "{currentSelection}"
                </p>
                {/* Visual indicator that this will be sent */}
                <div className="absolute right-2 top-2 w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
            </div>
        )}

        <div className="relative flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentSelection ? "Ask about this selection..." : "Ask Lumina..."}
              className="w-full bg-slate-100 text-slate-800 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none max-h-32 min-h-[44px]"
              rows={1}
              style={{ minHeight: '44px' }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={(!inputText.trim() && !currentSelection) || isLoading}
            className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;