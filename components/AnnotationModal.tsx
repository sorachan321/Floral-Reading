
import React, { useState, useEffect } from 'react';
import { X, Check, Save, Tag, Highlighter, Underline, Type, Trash2 } from 'lucide-react';

interface AnnotationData {
    note: string;
    color: string;
    style: 'highlight' | 'underline';
    tags: string[];
}

interface AnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AnnotationData) => void;
  onDelete?: () => void; // New prop for deletion
  selectedText: string;
  initialData?: AnnotationData | null; // New prop for editing
}

const COLORS = [
  { id: 'red', value: '#fca5a5', border: '#ef4444' },     // Red-300
  { id: 'orange', value: '#fdba74', border: '#f97316' },  // Orange-300
  { id: 'yellow', value: '#fde047', border: '#eab308' },  // Yellow-300
  { id: 'green', value: '#86efac', border: '#22c55e' },   // Green-300
  { id: 'teal', value: '#5eead4', border: '#14b8a6' },    // Teal-300
  { id: 'blue', value: '#93c5fd', border: '#3b82f6' },    // Blue-300
  { id: 'indigo', value: '#a5b4fc', border: '#6366f1' },  // Indigo-300
  { id: 'purple', value: '#d8b4fe', border: '#a855f7' },  // Purple-300
];

const AnnotationModal: React.FC<AnnotationModalProps> = ({ isOpen, onClose, onSave, onDelete, selectedText, initialData }) => {
  const [note, setNote] = useState('');
  const [color, setColor] = useState('yellow');
  const [style, setStyle] = useState<'highlight' | 'underline'>('highlight');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Effect to populate data when editing
  useEffect(() => {
    if (isOpen && initialData) {
        setNote(initialData.note || '');
        setColor(initialData.color || 'yellow');
        setStyle(initialData.style || 'highlight');
        setTags(initialData.tags || []);
    } else if (isOpen) {
        // Reset defaults for new annotation
        setNote('');
        setColor('yellow');
        setStyle('highlight');
        setTags([]);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ note, color, style, tags });
    setTagInput('');
    onClose();
  };
  
  const handleDelete = () => {
      if (onDelete) {
          onDelete();
          onClose();
      }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#f8f9fa] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
          <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2">
            <span className={`w-1 h-6 rounded-full ${initialData ? 'bg-amber-500' : 'bg-blue-600'}`}></span>
            {initialData ? '编辑注解' : '新建注解'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Selected Context */}
          <div className="text-xs text-slate-500 bg-slate-100 p-3 rounded-lg border border-slate-200 italic line-clamp-3 relative">
             <div className="absolute left-0 top-2 bottom-2 w-1 bg-slate-300 rounded-r"></div>
             <p className="pl-3 leading-relaxed">"{selectedText}"</p>
          </div>

          {/* Text Area */}
          <div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="在这里输入你的想法..."
              className="w-full h-32 p-4 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 outline-none resize-none text-slate-700 text-sm shadow-sm transition-colors"
              autoFocus
            />
            <div className="text-right text-[10px] text-slate-400 mt-1">{note.length}/1500</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6">
            
            {/* Colors */}
            <div className="flex-1">
               <label className="text-xs font-bold text-slate-500 mb-2 block">颜色</label>
               <div className="flex flex-wrap gap-2 bg-white p-2 rounded-lg border border-slate-200">
                  {COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setColor(c.id)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        color === c.id ? 'scale-110 ring-2 ring-offset-1 ring-slate-300' : 'hover:scale-105'
                      }`}
                      style={{ 
                        backgroundColor: c.value, 
                        borderColor: color === c.id ? c.border : 'transparent' 
                      }}
                      title={c.id}
                    />
                  ))}
               </div>
            </div>

            {/* Style */}
            <div>
               <label className="text-xs font-bold text-slate-500 mb-2 block">高亮样式</label>
               <div className="flex gap-2 bg-white p-2 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setStyle('highlight')}
                    className={`p-2 rounded-md transition-colors ${style === 'highlight' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
                    title="Background Highlight"
                  >
                    <div className="bg-current w-4 h-4 rounded-sm flex items-center justify-center text-white font-bold text-[10px]">A</div>
                  </button>
                  <button
                    onClick={() => setStyle('underline')}
                    className={`p-2 rounded-md transition-colors ${style === 'underline' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
                    title="Underline"
                  >
                     <Underline size={18} />
                  </button>
               </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-2 block">标签</label>
            <div className="bg-white border border-slate-200 rounded-lg p-2 flex flex-wrap items-center gap-2 focus-within:border-blue-500 transition-colors">
               <Tag size={14} className="text-slate-400 ml-1" />
               {tags.map(tag => (
                 <span key={tag} className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 border border-slate-200">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X size={10} /></button>
                 </span>
               ))}
               <input 
                  type="text" 
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder={tags.length === 0 ? "添加标签 (按回车)" : ""}
                  className="flex-1 text-sm outline-none min-w-[100px] bg-transparent"
               />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between gap-3">
           <div>
               {initialData && onDelete && (
                   <button 
                    onClick={handleDelete}
                    className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                   >
                       <Trash2 size={16} /> 删除
                   </button>
               )}
           </div>
           <div className="flex gap-3">
                <button 
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg border border-blue-600 text-blue-600 text-sm font-medium hover:bg-blue-50 transition-colors"
                >
                    取消
                </button>
                <button 
                    onClick={handleSave}
                    className="px-6 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 shadow-md flex items-center gap-2 transition-colors"
                >
                    <Save size={16} />
                    保存
                </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default AnnotationModal;
