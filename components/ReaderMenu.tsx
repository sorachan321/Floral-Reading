
import React, { useState, useEffect } from 'react';
import { X, List, Search, MapPin, Hash, Bookmark, FileText, ChevronRight, Loader2, Trash2, ChevronDown, Tag } from 'lucide-react';
import { NavItem, Annotation } from '../types';

interface ReaderMenuProps {
  isOpen: boolean;
  onClose: () => void;
  toc: NavItem[];
  landmarks: any[];
  onNavigate: (href: string) => void;
  bookmarks: any[];
  onRemoveBookmark: (cfi: string) => void;
  annotations: Annotation[];
  onRemoveAnnotation: (cfi: string) => void;
  onSearch: (query: string) => Promise<any[]>;
  currentPage: string;
  currentPercentage: number;
}

type Tab = 'toc' | 'structure' | 'search' | 'goto' | 'bookmarks' | 'annotations';

// Recursive TOC Item Component
const TOCItem: React.FC<{ item: NavItem; level: number; onNavigate: (href: string) => void; onClose: () => void }> = ({ item, level, onNavigate, onClose }) => {
    const [expanded, setExpanded] = useState(false);
    const hasSubs = item.subitems && item.subitems.length > 0;
  
    return (
      <li>
        <div className="flex items-center group">
             {hasSubs ? (
                 <button 
                    onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                    className="p-2 text-slate-400 hover:text-slate-600"
                 >
                     {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                 </button>
             ) : (
                 <div className="w-8"></div> // spacer
             )}
            <button 
              onClick={() => { onNavigate(item.href); onClose(); }}
              className="flex-1 text-left py-2 pr-3 hover:bg-slate-50 text-slate-700 text-sm font-medium truncate"
              title={item.label}
            >
              {item.label}
            </button>
        </div>
        {hasSubs && expanded && (
          <ul className="border-l border-slate-100 ml-4">
            {item.subitems!.map((sub, idx) => (
              <TOCItem key={idx} item={sub} level={level + 1} onNavigate={onNavigate} onClose={onClose} />
            ))}
          </ul>
        )}
      </li>
    );
};

const ReaderMenu: React.FC<ReaderMenuProps> = ({ 
  isOpen, 
  onClose, 
  toc, 
  landmarks,
  onNavigate,
  bookmarks,
  onRemoveBookmark,
  annotations,
  onRemoveAnnotation,
  onSearch,
  currentPage,
  currentPercentage
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('toc');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Reset states when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setActiveTab('toc');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await onSearch(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setIsSearching(false);
    }
  };

  const TabButton = ({ id, icon: Icon, label }: { id: Tab, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
        activeTab === id 
          ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' 
          : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'toc':
        return (
          <div className="flex flex-col h-full overflow-hidden">
            <h3 className="text-lg font-bold text-slate-800 p-4 border-b border-slate-100">目录</h3>
            <div className="flex-1 overflow-y-auto p-2">
              {toc.length === 0 ? (
                <div className="text-center text-slate-400 py-10">暂无目录信息</div>
              ) : (
                <ul className="space-y-0">
                  {toc.map((item, idx) => (
                    <TOCItem key={idx} item={item} level={0} onNavigate={onNavigate} onClose={onClose} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      
      case 'structure':
        return (
          <div className="flex flex-col h-full overflow-hidden">
            <h3 className="text-lg font-bold text-slate-800 p-4 border-b border-slate-100">书籍结构</h3>
            <div className="flex-1 overflow-y-auto p-4">
              {landmarks.length === 0 ? (
                <div className="text-center text-slate-400 py-10">暂无结构信息</div>
              ) : (
                <ul className="space-y-2">
                  {landmarks.map((item, idx) => (
                    <li key={idx}>
                      <button 
                         onClick={() => { onNavigate(item.href); onClose(); }}
                         className="w-full text-left p-3 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm flex items-center gap-2"
                      >
                         <MapPin size={16} className="text-slate-400" />
                         <span className="capitalize">{item.type || item.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );

      case 'search':
        return (
          <div className="flex flex-col h-full overflow-hidden">
            <h3 className="text-lg font-bold text-slate-800 p-4 border-b border-slate-100">全文检索</h3>
            <div className="p-4 border-b border-slate-100">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="输入关键词..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              </form>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {isSearching ? (
                <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                  <Loader2 size={20} className="animate-spin" />
                  <span>搜索中...</span>
                </div>
              ) : searchResults.length > 0 ? (
                <ul className="space-y-2">
                  {searchResults.map((result, idx) => (
                    <li key={idx}>
                      <button 
                        onClick={() => { onNavigate(result.cfi); onClose(); }}
                        className="w-full text-left p-3 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group"
                      >
                        <p className="text-xs text-slate-400 mb-1">匹配项 {idx + 1}</p>
                        <p className="text-sm text-slate-700 font-serif leading-relaxed line-clamp-2">
                            ...{result.excerpt}...
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : searchQuery && !isSearching ? (
                <div className="text-center text-slate-400 py-10">未找到相关内容</div>
              ) : (
                <div className="text-center text-slate-400 py-10 text-sm">输入关键词开始搜索</div>
              )}
            </div>
          </div>
        );

      case 'goto':
        return (
          <div className="flex flex-col h-full overflow-hidden">
            <h3 className="text-lg font-bold text-slate-800 p-4 border-b border-slate-100">转到页码</h3>
            <div className="p-6">
               <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center mb-6">
                  <span className="block text-sm text-slate-500 mb-2">当前位置</span>
                  <div className="text-3xl font-bold text-slate-800 font-serif">{Math.round(currentPercentage * 100)}%</div>
                  <div className="text-xs text-slate-400 mt-2">CFI: {currentPage.substring(0, 20)}...</div>
               </div>

               <div className="space-y-4">
                  <label className="text-sm font-medium text-slate-700">快速跳转</label>
                  <div className="grid grid-cols-4 gap-2">
                     {[0, 25, 50, 75].map(p => (
                         <button 
                            key={p}
                            onClick={() => { 
                                // Simplified for demo
                                alert("Jump by percentage requires full cfi spine lookup.");
                            }}
                            className="p-2 bg-white border border-slate-200 rounded hover:border-blue-500 hover:text-blue-600 text-sm"
                         >
                            {p}%
                         </button>
                     ))}
                  </div>
               </div>
            </div>
          </div>
        );

      case 'bookmarks':
        return (
          <div className="flex flex-col h-full overflow-hidden">
            <h3 className="text-lg font-bold text-slate-800 p-4 border-b border-slate-100">书签</h3>
            <div className="flex-1 overflow-y-auto p-4">
              {bookmarks.length === 0 ? (
                <div className="text-center text-slate-400 py-10">暂无书签</div>
              ) : (
                <ul className="space-y-3">
                  {bookmarks.map((bm, idx) => (
                    <li key={idx} className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-sm transition-shadow relative group">
                       <button 
                         onClick={() => { onNavigate(bm.cfi); onClose(); }}
                         className="w-full text-left"
                       >
                           <div className="flex items-center gap-2 mb-2 text-amber-600">
                               <Bookmark size={14} fill="currentColor" />
                               <span className="text-xs font-medium">{new Date(bm.date).toLocaleDateString()}</span>
                           </div>
                           <p className="text-sm text-slate-700 line-clamp-2 font-serif">{bm.text || "Bookmarked Page"}</p>
                       </button>
                       <button 
                         onClick={(e) => { e.stopPropagation(); onRemoveBookmark(bm.cfi); }}
                         className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                          <Trash2 size={14} />
                       </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );

      case 'annotations':
        return (
            <div className="flex flex-col h-full overflow-hidden">
            <h3 className="text-lg font-bold text-slate-800 p-4 border-b border-slate-100">注解</h3>
            <div className="flex-1 overflow-y-auto p-4">
                {annotations.length === 0 ? (
                <div className="text-center text-slate-400 py-10">暂无注解</div>
                ) : (
                <ul className="space-y-3">
                    {annotations.map((note, idx) => {
                      // Map color name to hex for dot
                      const colorMap: any = { red: '#fca5a5', orange: '#fdba74', yellow: '#fde047', green: '#86efac', teal: '#5eead4', blue: '#93c5fd', purple: '#d8b4fe' };
                      const dotColor = colorMap[note.color] || '#e2e8f0';

                      return (
                      <li key={idx} className="bg-white border border-slate-200 rounded-lg p-3 relative group hover:shadow-sm transition-shadow">
                          <button 
                              onClick={() => { onNavigate(note.cfiRange); onClose(); }}
                              className="w-full text-left"
                          >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }}></div>
                                  <span className="text-xs text-slate-400">{new Date(note.date).toLocaleDateString()}</span>
                                </div>
                                {note.tags && note.tags.length > 0 && (
                                  <div className="flex gap-1">
                                    {note.tags.slice(0, 2).map(tag => (
                                      <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded-full">{tag}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              {/* User Note */}
                              {note.note ? (
                                <p className="text-sm text-slate-800 font-medium mb-2 line-clamp-3">
                                  {note.note}
                                </p>
                              ) : (
                                <p className="text-xs text-slate-400 italic mb-2">无文字注解</p>
                              )}
                              
                              {/* Quote context */}
                              <p className="text-xs text-slate-500 line-clamp-2 font-serif italic border-l-2 border-slate-200 pl-2">
                                  "{note.text}"
                              </p>
                          </button>
                           <button 
                           onClick={(e) => { e.stopPropagation(); onRemoveAnnotation(note.cfiRange); }}
                           className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                            <Trash2 size={14} />
                         </button>
                      </li>
                      );
                    })}
                </ul>
                )}
            </div>
            </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Window */}
      <div className="relative z-10 flex w-full max-w-4xl h-[80vh] m-auto bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Left Sidebar */}
        <div className="w-48 bg-slate-100 border-r border-slate-200 flex flex-col py-4">
           <div className="px-4 mb-6">
              <h2 className="font-bold text-slate-700 text-lg">阅读导航</h2>
           </div>
           
           <nav className="flex-1 space-y-1">
              <TabButton id="toc" icon={List} label="目录" />
              <TabButton id="structure" icon={Hash} label="结构" />
              <TabButton id="search" icon={Search} label="检索" />
              <TabButton id="goto" icon={MapPin} label="转到页码" />
              <TabButton id="bookmarks" icon={Bookmark} label="书签" />
              <TabButton id="annotations" icon={FileText} label="注解" />
           </nav>
        </div>

        {/* Right Content */}
        <div className="flex-1 bg-white relative">
             <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 z-20"
             >
                 <X size={20} />
             </button>
             {renderContent()}
        </div>

      </div>
    </div>
  );
};

export default ReaderMenu;
