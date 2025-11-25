
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, ArrowRight, Wand2, Languages, FileText, Bot, Move } from 'lucide-react';
import { marked } from 'marked';

interface FloatingAiCardProps {
  contextText: string;
  aiResponse: string;
  isLoading: boolean;
  onClose: () => void;
  onSend: (prompt: string) => void;
}

const FloatingAiCard: React.FC<FloatingAiCardProps> = ({ contextText, aiResponse, isLoading, onClose, onSend }) => {
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount if awaiting user input
  useEffect(() => {
    if (!aiResponse && !isLoading) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [aiResponse, isLoading]);

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

  const isInputMode = !aiResponse && !isLoading;

  // Render markdown content
  // We append a cursor span if loading to simulate typing within the markdown flow
  const renderMarkdown = (text: string, loading: boolean) => {
      let content = text;
      if (loading) {
          content += ' <span class="inline-block w-1.5 h-4 bg-amber-500 rounded-full animate-pulse align-middle"></span>';
      }
      return { __html: marked.parse(content) as string };
  };

  if (isMinimized) {
      return (
          <button 
            onClick={() => setIsMinimized(false)}
            className="fixed bottom-8 right-8 z-[100] bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform animate-in fade-in zoom-in"
          >
              <Sparkles size={24} className="text-amber-400" />
          </button>
      )
  }

  return (
    <div className="fixed inset-x-0 bottom-8 z-[100] flex justify-center pointer-events-none px-4">
        <div 
            className="pointer-events-auto bg-white/90 backdrop-blur-xl border border-white/20 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] rounded-2xl w-full max-w-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 flex flex-col max-h-[70vh]"
            style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.5) inset' }}
        >
            {/* Header / Drag Handle (Visual only for now) */}
            <div className="flex items-center justify-between px-4 py-3 bg-white/50 border-b border-black/5 cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-amber-100/50 rounded-md">
                        <Sparkles size={14} className="text-amber-600" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">AI Analysis</span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsMinimized(true)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-black/5 transition-colors">
                        <span className="sr-only">Minimize</span>
                        <div className="w-3 h-0.5 bg-current rounded-full"></div>
                    </button>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
                 {/* Input Mode */}
                 {isInputMode && (
                     <div className="p-6">
                        {/* Context Preview */}
                        <div className="mb-6 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <p className="text-xs text-slate-400 font-bold mb-2 uppercase">Selected Context</p>
                            <p className="text-slate-600 italic font-serif text-sm line-clamp-3 leading-relaxed">
                                "{contextText}"
                            </p>
                        </div>

                        <div className="relative mb-6">
                            <input 
                                ref={inputRef}
                                className="w-full text-xl font-medium text-slate-800 placeholder-slate-300 border-none focus:ring-0 p-0 bg-transparent"
                                placeholder="Ask anything about this text..."
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                            />
                            <div className="absolute right-0 top-1/2 -translate-y-1/2">
                                <button 
                                    onClick={handleSend}
                                    disabled={!input.trim()}
                                    className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-0 transition-all shadow-md transform hover:scale-105"
                                >
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            <ActionChip icon={Wand2} label="Explain meaning" onClick={() => handleQuickAction('explain')} color="amber" />
                            <ActionChip icon={FileText} label="Summarize" onClick={() => handleQuickAction('summarize')} color="blue" />
                            <ActionChip icon={Languages} label="Translate to Chinese" onClick={() => handleQuickAction('translate')} color="purple" />
                        </div>
                     </div>
                 )}

                 {/* Response Mode */}
                 {!isInputMode && (
                     <div className="p-6">
                        {isLoading && !aiResponse && (
                            <div className="flex flex-col items-center justify-center py-8 gap-4 opacity-70">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-amber-500 animate-spin"></div>
                                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-500" size={16} />
                                </div>
                                <p className="text-sm font-medium text-slate-500 animate-pulse">Consulting Gemini...</p>
                            </div>
                        )}
                        
                        {(aiResponse || (isLoading && aiResponse)) && (
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 mt-1">
                                    <div className="w-8 h-8 bg-gradient-to-tr from-amber-100 to-amber-200 rounded-lg flex items-center justify-center border border-amber-300/30 shadow-sm">
                                        <Bot size={18} className="text-amber-700" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div 
                                        className="text-slate-800 leading-relaxed font-serif text-base prose prose-slate prose-p:my-2 prose-headings:font-sans max-w-none"
                                        dangerouslySetInnerHTML={renderMarkdown(aiResponse, isLoading)}
                                    />
                                </div>
                            </div>
                        )}
                     </div>
                 )}
            </div>

             {/* Footer (If Response Mode) */}
             {!isInputMode && !isLoading && (
                 <div className="p-3 bg-white/50 border-t border-slate-100 flex justify-end gap-2">
                     <button onClick={() => {setInput(''); onSend(''); /* crude reset */ }} className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-black/5 rounded-lg transition-colors">
                         New Question
                     </button>
                     <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
                         Done
                     </button>
                 </div>
             )}
        </div>
    </div>
  );
};

const ActionChip = ({ icon: Icon, label, onClick, color }: any) => {
    const colors: any = {
        amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 hover:border-amber-300',
        blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 hover:border-blue-300',
        purple: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200 hover:border-purple-300',
    };
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:-translate-y-0.5 ${colors[color]}`}
        >
            <Icon size={16} /> {label}
        </button>
    )
}

export default FloatingAiCard;