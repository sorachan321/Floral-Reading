
import React, { useRef, useState, useMemo } from 'react';
import { Plus, MoreVertical, ChevronLeft, ChevronRight, LayoutGrid, List as ListIcon, Book as BookIcon, Trash2, Filter, X } from 'lucide-react';
import { Book } from '../types';

interface HomeViewProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onAddBook: (file: File) => void;
  onDeleteBook: (id: string) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ books, onSelectBook, onAddBook, onDeleteBook }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // Column Filter State
  const [showFilters, setShowFilters] = useState(false);
  const [columnFilters, setColumnFilters] = useState({
    title: '',
    author: '',
    progress: '',
    loan: '',
    tags: ''
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onAddBook(e.target.files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleColumnFilterChange = (field: keyof typeof columnFilters, value: string) => {
    setColumnFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setColumnFilters({
        title: '',
        author: '',
        progress: '',
        loan: '',
        tags: ''
    });
    setShowFilters(false);
  };

  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      // 1. Global Search
      const matchesGlobal = b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            b.author.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Column Filters
      const titleFilter = columnFilters.title.toLowerCase();
      const authorFilter = columnFilters.author.toLowerCase();
      const progressFilter = columnFilters.progress.toLowerCase();
      // Note: Since 'progress', 'loan', 'tags' are visual/static in this version, 
      // we check against the likely displayed text or just return true if empty.
      
      const matchesTitle = !titleFilter || b.title.toLowerCase().includes(titleFilter);
      const matchesAuthor = !authorFilter || b.author.toLowerCase().includes(authorFilter);
      
      // Simulating progress check (Hardcoded "进行中" in UI)
      const matchesProgress = !progressFilter || "进行中".includes(progressFilter) || "reading".includes(progressFilter);
      
      // Simulating loan/tags (Empty in UI currently, so only match if filter is empty)
      const matchesLoan = !columnFilters.loan; 
      const matchesTags = !columnFilters.tags;

      return matchesGlobal && matchesTitle && matchesAuthor && matchesProgress && matchesLoan && matchesTags;
    });
  }, [books, searchTerm, columnFilters]);

  // Generate a consistent gradient for books without covers
  const getGradient = (title: string) => {
    const gradients = [
      'from-[#eecda3] to-[#ef629f]',
      'from-[#4ca1af] to-[#c4e0e5]',
      'from-[#be93c5] to-[#7bc6cc]',
      'from-[#ffd194] to-[#70e1f5]',
    ];
    const index = title.length % gradients.length;
    return gradients[index];
  };

  const handleMenuClick = (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === bookId ? null : bookId);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#fafafa] font-sans text-slate-800">
      <div className="max-w-[1400px] mx-auto p-6 md:p-10 flex flex-col h-full">
        
        {/* Top Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
           <div className="flex flex-col gap-2">
              <h2 className="text-sm font-bold text-slate-600">查看模式</h2>
              {/* View Toggles */}
              <div className="flex items-center gap-2">
                 <button 
                   onClick={() => setViewMode('grid')}
                   className={`flex items-center gap-2 px-4 py-2 rounded border transition-all ${
                       viewMode === 'grid' 
                       ? 'text-blue-600 bg-blue-50 border-blue-200' 
                       : 'text-slate-500 border-transparent hover:bg-slate-100'
                   }`}
                 >
                    <LayoutGrid size={18} />
                    <span className="font-medium text-sm">网络视图</span>
                 </button>
                 <button 
                   onClick={() => setViewMode('list')}
                   className={`flex items-center gap-2 px-4 py-2 rounded border transition-all ${
                       viewMode === 'list' 
                       ? 'text-blue-600 bg-blue-50 border-blue-200' 
                       : 'text-slate-500 border-transparent hover:bg-slate-100'
                   }`}
                 >
                    <ListIcon size={18} />
                    <span className="font-medium text-sm">列表视图</span>
                 </button>
              </div>
           </div>

           <div className="mt-auto">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 text-blue-600 border border-blue-600 hover:bg-blue-50 px-4 py-2 rounded-md transition-colors text-sm font-medium"
                >
                    <Plus size={16} />
                    <span>导入出版物</span>
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".epub,.txt,.pdf"
                    className="hidden"
                />
           </div>
        </div>

        {/* Section Header */}
        <div className="mb-6">
           <h1 className="text-2xl font-bold text-slate-700">全部图书</h1>
        </div>

        {/* Search & Pagination Toolbar */}
        <div className="bg-[#f5f5f5] rounded-lg p-6 mb-8 flex flex-col md:flex-row justify-between items-end gap-4 shadow-sm">
            <div className="w-full md:w-[400px] relative">
                <label className="block text-sm text-slate-600 mb-1 font-medium">搜索 ({filteredBooks.length})</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-500">
                        <Filter size={16} />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="开始搜索"
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-700"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4 text-slate-500 pb-1">
                <div className="text-xs text-slate-500 flex flex-col items-center gap-1">
                    <span className="text-slate-600">页码</span>
                    <div className="flex items-center gap-3">
                        <button className="text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronLeft size={24} /></button>
                        <button className="text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronLeft size={16} /></button>
                        
                        <div className="bg-white px-4 py-1.5 border border-slate-300 rounded text-sm min-w-[5rem] text-center text-slate-700">1 / 1</div>
                        
                        <button className="text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronRight size={16} /></button>
                        <button className="text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronRight size={24} /></button>
                    </div>
                </div>
            </div>
        </div>

        {/* Conditional Rendering: Empty State OR Content */}
        {books.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 min-h-[300px]">
            <BookIcon size={48} strokeWidth={1} className="mb-4 opacity-30" />
            <p className="text-lg font-medium text-slate-500">书架空空如也</p>
            <p className="text-sm mt-2">请导入书籍开始阅读</p>
          </div>
        ) : (
          /* Content Area */
          viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-8 gap-y-12 items-start">
            {filteredBooks.map((book) => (
                <div key={book.id} className="group flex flex-col w-full relative">
                {/* Cover */}
                <div 
                    onClick={() => onSelectBook(book)}
                    className="relative aspect-[2/3] w-full bg-slate-200 mb-4 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden rounded-sm"
                >
                    {book.coverUrl ? (
                        <img 
                            src={book.coverUrl} 
                            alt={book.title} 
                            className="w-full h-full object-cover"
                        />
                        ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${getGradient(book.title)} p-4 flex flex-col justify-center items-center text-center`}>
                            <div className="bg-white/90 p-3 shadow-sm w-full h-full flex items-center justify-center">
                                <span className="font-serif font-bold text-slate-800 line-clamp-3 text-xs uppercase tracking-widest">
                                {book.title}
                                </span>
                            </div>
                        </div>
                        )}
                </div>

                {/* Meta */}
                <div className="flex flex-col gap-1 mb-2">
                    <h3 
                    onClick={() => onSelectBook(book)}
                    className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 cursor-pointer hover:text-blue-600"
                    title={book.title}
                    >
                        {book.title}
                    </h3>
                    <p className="text-xs text-slate-500 truncate">{book.author}</p>
                </div>

                {/* Actions Footer */}
                <div className="flex justify-between items-center mt-auto pt-1">
                    <span className="text-[10px] font-semibold text-blue-600 border border-blue-600 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {book.type}
                    </span>
                    
                    <div className="relative">
                        <button 
                            onClick={(e) => handleMenuClick(e, book.id)}
                            className={`text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors ${openMenuId === book.id ? 'bg-blue-50' : ''}`}
                        >
                            <MoreVertical size={16} />
                        </button>
                        
                        {/* Popup Menu */}
                        {openMenuId === book.id && (
                            <>
                                <div 
                                    className="fixed inset-0 z-10 cursor-default" 
                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}
                                ></div>
                                <div className="absolute right-0 bottom-full mb-1 w-32 bg-white shadow-lg rounded-md border border-slate-100 z-20 py-1 animate-in fade-in zoom-in-95 duration-100">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteBook(book.id);
                                            setOpenMenuId(null);
                                        }}
                                        className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                        <Trash2 size={12} /> 删除
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                </div>
            ))}
            </div>
          ) : (
            /* List View */
            <div className="w-full bg-white border-t-2 border-blue-500 shadow-sm">
                {/* Table Header */}
                <div className="flex items-center bg-[#eef4ff] text-[#2c52b3] font-bold text-sm py-4 px-4">
                    <div className="w-16 flex justify-center">
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-1 rounded transition-colors ${showFilters ? 'bg-blue-200 text-blue-800' : 'hover:bg-blue-100'}`}
                            title="Toggle Filters"
                        >
                            {showFilters ? <X size={18} /> : <Filter size={18} />}
                        </button>
                    </div>
                    <div className="flex-[3] pl-4">标题</div>
                    <div className="flex-1">作者</div>
                    <div className="flex-1">进度</div>
                    <div className="flex-1">借阅 (剩余时间)</div>
                    <div className="w-20 text-center">标签</div>
                </div>

                {/* Filter Input Row */}
                {showFilters && (
                    <div className="flex items-center bg-[#f8faff] border-b border-blue-100 py-2 px-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="w-16 flex justify-center">
                             <button onClick={clearFilters} className="text-[10px] text-blue-500 hover:underline">清除</button>
                        </div>
                        <div className="flex-[3] pl-4 pr-2">
                             <input 
                                type="text" 
                                placeholder="筛选标题..." 
                                value={columnFilters.title}
                                onChange={(e) => handleColumnFilterChange('title', e.target.value)}
                                className="w-full text-xs px-2 py-1.5 border border-blue-200 rounded focus:border-blue-500 focus:outline-none"
                             />
                        </div>
                        <div className="flex-1 pr-2">
                            <input 
                                type="text" 
                                placeholder="筛选作者..." 
                                value={columnFilters.author}
                                onChange={(e) => handleColumnFilterChange('author', e.target.value)}
                                className="w-full text-xs px-2 py-1.5 border border-blue-200 rounded focus:border-blue-500 focus:outline-none"
                             />
                        </div>
                        <div className="flex-1 pr-2">
                            <input 
                                type="text" 
                                placeholder="筛选进度..." 
                                value={columnFilters.progress}
                                onChange={(e) => handleColumnFilterChange('progress', e.target.value)}
                                className="w-full text-xs px-2 py-1.5 border border-blue-200 rounded focus:border-blue-500 focus:outline-none"
                             />
                        </div>
                        <div className="flex-1 pr-2">
                            <input 
                                type="text" 
                                placeholder="筛选借阅..." 
                                value={columnFilters.loan}
                                onChange={(e) => handleColumnFilterChange('loan', e.target.value)}
                                className="w-full text-xs px-2 py-1.5 border border-blue-200 rounded focus:border-blue-500 focus:outline-none"
                             />
                        </div>
                        <div className="w-20 px-1">
                             <input 
                                type="text" 
                                placeholder="标签" 
                                value={columnFilters.tags}
                                onChange={(e) => handleColumnFilterChange('tags', e.target.value)}
                                className="w-full text-xs px-2 py-1.5 border border-blue-200 rounded focus:border-blue-500 focus:outline-none text-center"
                             />
                        </div>
                    </div>
                )}

                {/* Rows */}
                <div className="flex flex-col">
                    {filteredBooks.map((book) => (
                    <div 
                        key={book.id} 
                        onClick={() => onSelectBook(book)}
                        className="flex items-stretch group hover:bg-[#f8f9fa] border-b border-slate-100 last:border-0 transition-colors cursor-pointer min-h-[140px]"
                    >
                        {/* Image Column */}
                        <div className="w-16 flex-shrink-0 flex items-center justify-center bg-slate-50/30">
                            <div className="w-12 h-16 shadow-md relative mx-auto">
                                {book.coverUrl ? (
                                    <img src={book.coverUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className={`w-full h-full bg-gradient-to-br ${getGradient(book.title)}`} />
                                )}
                            </div>
                        </div>

                        {/* Title Column */}
                        <div className="flex-[3] p-4 flex flex-col justify-center pr-8">
                            <h3 className="font-bold text-slate-800 text-base mb-2 group-hover:text-blue-600 transition-colors">
                                {book.title}
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                                <span className="font-medium text-slate-400">[{book.type.toUpperCase()}]</span> 
                                {book.extractedText ? " 已解析文本内容。 " : " 准备就绪。 "}
                                {book.title} 是一本值得阅读的好书。点击即可开始沉浸式阅读体验。
                                支持AI辅助阅读，划词翻译，内容分析。
                            </p>
                        </div>

                        {/* Author Column */}
                        <div className="flex-1 p-4 flex items-center">
                            <span className="text-slate-600 underline decoration-slate-300 hover:text-blue-600 text-sm underline-offset-4">
                                {book.author}
                            </span>
                        </div>

                        {/* Progress Column */}
                        <div className="flex-1 p-4 flex items-center text-slate-500 text-sm gap-2">
                            <BookIcon size={16} />
                            <span>进行中</span>
                        </div>

                        {/* Borrow Column */}
                        <div className="flex-1 p-4 flex items-center text-slate-400 text-sm">
                            {/* Empty in screenshot */}
                        </div>

                        {/* Tags / Actions Column */}
                        <div className="w-20 p-4 flex items-center justify-center">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteBook(book.id); }}
                                className="text-slate-300 hover:text-red-500 transition-colors p-2"
                                title="删除"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                    ))}
                    {filteredBooks.length === 0 && (
                        <div className="py-12 text-center text-slate-400 text-sm">
                            没有找到匹配的图书
                        </div>
                    )}
                </div>
            </div>
          )
        )}
        
        {/* Footer info similar to screenshot */}
        <div className="mt-auto pt-16 pb-6 flex justify-end items-center gap-4">
             <div className="text-right">
                <div className="text-xs text-slate-400">v3.1.0</div>
                <div className="text-xs text-slate-500 underline decoration-slate-300">关于Floral Reading</div>
             </div>
             <div className="w-12 h-12 bg-[#000055] rounded-full flex items-center justify-center text-white font-serif font-bold text-sm shadow-lg">
                FR
             </div>
        </div>

      </div>
    </div>
  );
};

export default HomeView;
