
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Copy, ArrowRight, Wand2, Languages, FileText, Bot } from 'lucide-react';
import { marked } from 'marked';

interface InlineAiPanelProps {
  content: string;
  isLoading: boolean;
  onClose: () => void;
  onSend: (prompt: string) => void;
  width?: string | number;
}

const InlineAiPanel: React.FC<InlineAiPanelProps> = ({ content, isLoading, onClose, onSend, width = '100%' }) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount if empty
  useEffect(() => {
    if (!content && !isLoading) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [content, isLoading]);

  const handleSend = () => {
      if(input.trim()) onSend(input);
  };

  const handleQuickAction = (action: string) => {
      let prompt = "";
      switch(action) {
          case 'explain': prompt = "Explain the meaning and context of this text."; break;
          case 'summarize': prompt = "Summarize the key points of this text."; break;
          case 'translate': prompt = "Translate this text into Chinese."; break;
      }
      onSend(prompt);
  };

  // Markdown rendering
  const renderMarkdown = (text: string, loading: boolean) => {
    let raw = text;
    if (loading) {
        raw += ' <span class="inline-block w-1.5 h-3.5 bg-amber-500 rounded-full animate-ping align-middle"></span>';
    }
    return { __html: marked.parse(raw) as string };
  };

  const isInputMode = !content && !isLoading;

  return (
    <div 
        className="font-sans antialiased text-slate-800 my-4"
        style={{ width: width }}
        onClick={(e) => e.stopPropagation()} 
    >
        <div className={`
            relative overflow-hidden transition-all duration-300
            bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100
            ${isInputMode ? 'max-w-xl' : 'w-full'}
        `}>
            
            {/* Input Mode UI */}
            {isInputMode && (
                <div className="p-1">
                    <div className="flex justify-between items-center px-4 pt-3">
                         <div className="flex items-center gap-2 text-amber-600">
                             <Sparkles size={14} />
                             <span className="text-[10px] font-bold uppercase tracking-wider">AI Reading Assistant</span>
                         </div>
                         <button onClick={onClose} className="text-slate-300 hover:text-slate-500 p-1 rounded-full hover:bg-slate-100 transition-colors">
                             <X size={16} />
                         </button>
                    </div>

                    <div className="p-4">
                        <div className="relative mb-4">
                            <input 
                                ref={inputRef}
                                className="w-full text-lg font-medium text-slate-800 placeholder-slate-300 border-none focus:ring-0 p-0 bg-transparent"
                                placeholder="What would you like to know?"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                            />
                            <button 
                                onClick={handleSend}
                                disabled={!input.trim()}
                                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 bg-slate-900 text-white rounded-full hover:bg-slate-700 disabled:opacity-0 transition-all shadow-md"
                            >
                                <ArrowRight size={14} />
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <ActionChip icon={Wand2} label="Explain" onClick={() => handleQuickAction('explain')} color="amber" />
                            <ActionChip icon={FileText} label="Summarize" onClick={() => handleQuickAction('summarize')} color="blue" />
                            <ActionChip icon={Languages} label="Translate" onClick={() => handleQuickAction('translate')} color="purple" />
                        </div>
                    </div>
                </div>
            )}

            {/* Content Mode UI */}
            {!isInputMode && (
                <div className="flex flex-col relative bg-slate-50/30">
                     {/* Floating Actions */}
                     <div className="absolute top-3 right-3 flex gap-2 z-10">
                         {!isLoading && (
                            <button onClick={() => navigator.clipboard.writeText(content)} className="p-1.5 bg-white/80 backdrop-blur text-slate-400 hover:text-slate-700 rounded-md shadow-sm border border-slate-100 transition-colors" title="Copy">
                                <Copy size={14} />
                            </button>
                         )}
                         <button onClick={onClose} className="p-1.5 bg-white/80 backdrop-blur text-slate-400 hover:text-red-500 rounded-md shadow-sm border border-slate-100 transition-colors" title="Close">
                             <X size={14} />
                         </button>
                     </div>

                     <div className="p-6">
                        {/* Loading Skeleton */}
                        {isLoading && !content && (
                            <div className="max-w-lg space-y-3 animate-pulse">
                                <div className="flex items-center gap-2 mb-4 text-amber-600 font-medium text-sm">
                                    <Sparkles size={14} className="animate-spin" />
                                    Analyzing context...
                                </div>
                                <div className="h-2 bg-slate-200 rounded w-full"></div>
                                <div className="h-2 bg-slate-200 rounded w-5/6"></div>
                                <div className="h-2 bg-slate-200 rounded w-4/6"></div>
                            </div>
                        )}

                        {/* Text Content */}
                        {(content || (isLoading && content)) && (
                            <div className="text-slate-700 leading-relaxed font-serif">
                                <div className="flex items-center gap-2 mb-3 text-slate-400 text-xs font-bold uppercase tracking-wider select-none">
                                    <Bot size={14} /> Lumina Response
                                </div>
                                <div 
                                    className="prose prose-sm prose-slate max-w-none prose-p:my-1.5"
                                    dangerouslySetInnerHTML={renderMarkdown(content, isLoading)} 
                                />
                            </div>
                        )}
                     </div>
                </div>
            )}
        </div>
    </div>
  );
};

const ActionChip = ({ icon: Icon, label, onClick, color }: any) => {
    const colors: any = {
        amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100',
        blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100',
        purple: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-100',
    };
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${colors[color]}`}
        >
            <Icon size={12} /> {label}
        </button>
    )
}

export default InlineAiPanel;