
import React, { useState, useEffect } from 'react';
import { X, Key, Check, Type, LayoutTemplate, Sparkles, RefreshCcw, Save, ScrollText, BookOpen, AlignJustify, AlignLeft, Columns, Smartphone } from 'lucide-react';
import { ReaderSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  settings: ReaderSettings;
  onSettingsChange: (s: ReaderSettings) => void;
}

type Tab = 'layout' | 'appearance' | 'ai';

const FONT_OPTIONS = [
    { id: 'serif', label: 'Serif (宋体/明朝)', fontFamily: '"Merriweather", "Songti SC", "SimSun", serif' },
    { id: 'sans', label: 'Sans (黑体)', fontFamily: '"Inter", "PingFang SC", "Microsoft YaHei", sans-serif' },
    { id: 'kai', label: 'Kaiti (楷体)', fontFamily: '"Kaiti SC", "KaiTi", "STKaiti", serif' },
];

const HIGHLIGHT_COLORS = [
    { id: '#fde047', label: 'Yellow', value: '#fde047' },
    { id: '#86efac', label: 'Green', value: '#86efac' },
    { id: '#93c5fd', label: 'Blue', value: '#93c5fd' },
    { id: '#fca5a5', label: 'Red', value: '#fca5a5' },
    { id: '#d8b4fe', label: 'Purple', value: '#d8b4fe' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, 
    onClose, 
    apiKey, 
    onSaveApiKey,
    settings,
    onSettingsChange
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('layout');
  const [keyInput, setKeyInput] = useState(apiKey);
  const [localSettings, setLocalSettings] = useState<ReaderSettings>(settings);
  const [saved, setSaved] = useState(false);

  // Sync props to local state when opening
  useEffect(() => {
    if (isOpen) {
        setLocalSettings(settings);
        setKeyInput(apiKey);
    }
  }, [isOpen, settings, apiKey]);

  // Auto-save local settings changes to parent (live preview)
  useEffect(() => {
      // Debounce updates to avoid rapid re-renders
      const timer = setTimeout(() => {
          onSettingsChange(localSettings);
      }, 50);
      return () => clearTimeout(timer);
  }, [localSettings, onSettingsChange]);

  if (!isOpen) return null;

  const handleSaveAI = () => {
    onSaveApiKey(keyInput);
    onSettingsChange(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetLayout = () => {
      setLocalSettings(prev => ({
          ...prev,
          fontSize: 18,
          lineHeight: 1.6,
          letterSpacing: 0,
          paragraphSpacing: 10,
          marginX: 10,
          flow: 'paginated',
          align: 'auto',
          columns: 'auto',
          useMathJax: false,
          reduceMotion: false,
          hideFootnotes: false,
          hideIndicators: false,
          hideFurigana: false,
          disableRtl: false
      }));
  };

  const SliderControl = ({ 
      label, 
      value, 
      min, 
      max, 
      step, 
      unit, 
      onChange, 
      onReset 
  }: { 
      label: string; value: number; min: number; max: number; step: number; unit: string; 
      onChange: (val: number) => void; onReset?: () => void; 
  }) => (
      <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold text-slate-700">{label}</label>
              <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                      {value}{unit}
                  </span>
                  {onReset && (
                      <button onClick={onReset} className="text-[10px] text-slate-400 hover:text-slate-600 px-1 border border-slate-200 rounded">
                          auto
                      </button>
                  )}
              </div>
          </div>
          <div className="flex items-center gap-3">
              <button onClick={onReset} className="text-slate-400 hover:text-blue-500">
                  <RefreshCcw size={14} />
              </button>
              <input 
                  type="range" 
                  min={min} 
                  max={max} 
                  step={step} 
                  value={value}
                  onChange={(e) => onChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
          </div>
      </div>
  );

  const ToggleCard = ({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
      <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all w-full h-20 gap-2 ${active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}
      >
          <Icon size={20} />
          <span className="text-xs font-medium">{label}</span>
      </button>
  );

  const CheckboxRow = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) => (
      <label className="flex items-center gap-3 py-2 cursor-pointer group">
          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 group-hover:border-slate-400'}`}>
              {checked && <Check size={14} strokeWidth={3} />}
          </div>
          <input type="checkbox" className="hidden" checked={checked} onChange={(e) => onChange(e.target.checked)} />
          <span className="text-sm text-slate-700">{label}</span>
      </label>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
            设置
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white">
            <button 
                onClick={() => setActiveTab('layout')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'layout' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                <LayoutTemplate size={18} /> 阅读排版
            </button>
            <button 
                onClick={() => setActiveTab('appearance')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'appearance' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                <Type size={18} /> 字体与颜色
            </button>
            <button 
                onClick={() => setActiveTab('ai')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'ai' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                <Sparkles size={18} /> AI 设置
            </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#fafafa]">
            
            {/* --- Layout Tab --- */}
            {activeTab === 'layout' && (
                <div className="space-y-8 max-w-lg mx-auto">
                    
                    {/* Mode Selection */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">布局 (Layout)</label>
                        <div className="grid grid-cols-2 gap-4">
                            <ToggleCard 
                                active={localSettings.flow === 'scrolled'} 
                                onClick={() => setLocalSettings({...localSettings, flow: 'scrolled'})}
                                icon={ScrollText}
                                label="滚屏 (Scroll)"
                            />
                            <ToggleCard 
                                active={localSettings.flow === 'paginated'} 
                                onClick={() => setLocalSettings({...localSettings, flow: 'paginated'})}
                                icon={BookOpen}
                                label="已分页 (Paginated)"
                            />
                        </div>
                    </div>

                    {/* Alignment */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">排版 (Alignment)</label>
                        <div className="grid grid-cols-3 gap-4">
                            <ToggleCard 
                                active={localSettings.align === 'auto'} 
                                onClick={() => setLocalSettings({...localSettings, align: 'auto'})}
                                icon={AlignLeft}
                                label="自动"
                            />
                            <ToggleCard 
                                active={localSettings.align === 'justify'} 
                                onClick={() => setLocalSettings({...localSettings, align: 'justify'})}
                                icon={AlignJustify}
                                label="两端对齐"
                            />
                            <ToggleCard 
                                active={localSettings.align === 'left'} 
                                onClick={() => setLocalSettings({...localSettings, align: 'left'})}
                                icon={AlignLeft}
                                label="左对齐"
                            />
                        </div>
                    </div>

                     {/* Columns */}
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">栏 (Columns)</label>
                        <div className="grid grid-cols-3 gap-4">
                            <ToggleCard 
                                active={localSettings.columns === 'auto'} 
                                onClick={() => setLocalSettings({...localSettings, columns: 'auto'})}
                                icon={Columns}
                                label="自动"
                            />
                            <ToggleCard 
                                active={localSettings.columns === '1'} 
                                onClick={() => setLocalSettings({...localSettings, columns: '1'})}
                                icon={Smartphone}
                                label="1栏"
                            />
                            <ToggleCard 
                                active={localSettings.columns === '2'} 
                                onClick={() => setLocalSettings({...localSettings, columns: '2'})}
                                icon={BookOpen}
                                label="2栏"
                            />
                        </div>
                    </div>

                    <div className="w-full h-px bg-slate-200"></div>

                    {/* Sliders */}
                    <div>
                        <SliderControl 
                            label="字体大小 (Font Size)" 
                            value={localSettings.fontSize} 
                            min={12} max={36} step={1} unit="px"
                            onChange={(v) => setLocalSettings({...localSettings, fontSize: v})}
                            onReset={() => setLocalSettings({...localSettings, fontSize: 18})}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                            <SliderControl 
                                label="行间距 (Line Height)" 
                                value={localSettings.lineHeight} 
                                min={1.0} max={3.0} step={0.1} unit=""
                                onChange={(v) => setLocalSettings({...localSettings, lineHeight: v})}
                                onReset={() => setLocalSettings({...localSettings, lineHeight: 1.6})}
                            />
                            <SliderControl 
                                label="页边距 (Margin)" 
                                value={localSettings.marginX} 
                                min={0} max={40} step={1} unit="%"
                                onChange={(v) => setLocalSettings({...localSettings, marginX: v})}
                                onReset={() => setLocalSettings({...localSettings, marginX: 10})}
                            />
                            <SliderControl 
                                label="字符间距 (Char Spacing)" 
                                value={localSettings.letterSpacing} 
                                min={-1} max={5} step={0.5} unit="px"
                                onChange={(v) => setLocalSettings({...localSettings, letterSpacing: v})}
                                onReset={() => setLocalSettings({...localSettings, letterSpacing: 0})}
                            />
                            <SliderControl 
                                label="段落间距 (Para Spacing)" 
                                value={localSettings.paragraphSpacing} 
                                min={0} max={50} step={2} unit="px"
                                onChange={(v) => setLocalSettings({...localSettings, paragraphSpacing: v})}
                                onReset={() => setLocalSettings({...localSettings, paragraphSpacing: 10})}
                            />
                        </div>
                    </div>

                    <div className="w-full h-px bg-slate-200"></div>

                    {/* Checkboxes */}
                    <div className="space-y-1">
                        <CheckboxRow 
                            label="MathJax (数学公式支持)" 
                            checked={localSettings.useMathJax} 
                            onChange={(v) => setLocalSettings({...localSettings, useMathJax: v})} 
                        />
                        <CheckboxRow 
                            label="减少动态效果 (Reduce Motion)" 
                            checked={localSettings.reduceMotion} 
                            onChange={(v) => setLocalSettings({...localSettings, reduceMotion: v})} 
                        />
                        <CheckboxRow 
                            label="禁用脚注 (Disable Footnotes)" 
                            checked={localSettings.hideFootnotes} 
                            onChange={(v) => setLocalSettings({...localSettings, hideFootnotes: v})} 
                        />
                        <CheckboxRow 
                            label="禁用视觉导航指示 (Hide Indicators)" 
                            checked={localSettings.hideIndicators} 
                            onChange={(v) => setLocalSettings({...localSettings, hideIndicators: v})} 
                        />
                        <CheckboxRow 
                            label="隐藏日文振假名 (Hide Furigana)" 
                            checked={localSettings.hideFurigana} 
                            onChange={(v) => setLocalSettings({...localSettings, hideFurigana: v})} 
                        />
                         <CheckboxRow 
                            label="禁用从右到左的界面布局 (Disable RTL)" 
                            checked={localSettings.disableRtl} 
                            onChange={(v) => setLocalSettings({...localSettings, disableRtl: v})} 
                        />
                    </div>
                    
                    <button 
                        onClick={handleResetLayout}
                        className="mt-6 text-xs text-slate-500 hover:text-slate-800 underline decoration-slate-300 underline-offset-4 block w-full text-center"
                    >
                        恢复默认排版设置
                    </button>
                </div>
            )}

            {/* --- Appearance Tab --- */}
            {activeTab === 'appearance' && (
                <div className="max-w-lg mx-auto space-y-8">
                    
                    {/* Font Family */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">字体选择</label>
                        <div className="grid grid-cols-1 gap-3">
                            {FONT_OPTIONS.map((font) => (
                                <button
                                    key={font.id}
                                    onClick={() => setLocalSettings({...localSettings, fontFamily: font.id as any})}
                                    className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                                        localSettings.fontFamily === font.id 
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' 
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                    }`}
                                >
                                    <span style={{ fontFamily: font.fontFamily }}>{font.label}</span>
                                    {localSettings.fontFamily === font.id && <Check size={18} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Highlight Color */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">默认划线颜色 (Highlight Color)</label>
                        <div className="flex gap-4">
                            {HIGHLIGHT_COLORS.map((color) => (
                                <button
                                    key={color.id}
                                    onClick={() => setLocalSettings({...localSettings, highlightColor: color.value})}
                                    className={`w-10 h-10 rounded-full border-2 transition-all shadow-sm flex items-center justify-center ${
                                        localSettings.highlightColor === color.value 
                                        ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' 
                                        : 'hover:scale-105 border-transparent'
                                    }`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.label}
                                >
                                    {localSettings.highlightColor === color.value && <Check size={16} className="text-slate-700/50" />}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-400 mt-2">此颜色将应用于您选中文本时的默认背景色。</p>
                    </div>
                </div>
            )}

            {/* --- AI Tab --- */}
            {activeTab === 'ai' && (
                <div className="max-w-lg mx-auto space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <Key size={16} className="text-amber-500" /> API Key
                        </label>
                        <input
                            type="password"
                            value={keyInput}
                            onChange={(e) => setKeyInput(e.target.value)}
                            placeholder="AIzaSy..."
                            className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                        />
                         <p className="text-xs text-slate-500 mt-2">
                            Lumina 使用 Google Gemini 模型。Key 仅存储在本地。
                        </p>
                    </div>

                    <div className="w-full h-px bg-slate-200"></div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <Sparkles size={16} className="text-purple-500" /> 自定义 System Prompt
                        </label>
                        <p className="text-xs text-slate-500 mb-3">
                            在这里定义 AI 的角色。例如："你是一个文学教授，擅长分析隐喻" 或 "你是一个语言老师，负责解释难词"。
                        </p>
                        <textarea
                            value={localSettings.customAiPrompt || ''}
                            onChange={(e) => setLocalSettings({...localSettings, customAiPrompt: e.target.value})}
                            placeholder="默认: You are an intelligent literary assistant called Lumina..."
                            className="w-full h-40 p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none leading-relaxed"
                        />
                    </div>

                    <button
                        onClick={handleSaveAI}
                        className={`w-full py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                            saved 
                            ? 'bg-green-600 text-white' 
                            : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md'
                        }`}
                    >
                        {saved ? <><Check size={16} /> 设置已保存</> : <><Save size={16} /> 保存 AI 设置</>}
                    </button>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
