import React, { useRef } from 'react';
import { Upload, Book as BookIcon, Trash2, FileText, File } from 'lucide-react';
import { Book, FileType } from '../types';

interface LibraryProps {
  books: Book[];
  onAddBook: (file: File) => void;
  onSelectBook: (book: Book) => void;
  onDeleteBook: (id: string) => void;
  activeBookId?: string;
}

const Library: React.FC<LibraryProps> = ({ books, onAddBook, onSelectBook, onDeleteBook, activeBookId }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onAddBook(e.target.files[0]);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getIcon = (type: FileType) => {
    switch (type) {
      case 'epub': return <BookIcon className="w-5 h-5 text-amber-600" />;
      case 'txt': return <FileText className="w-5 h-5 text-slate-500" />;
      default: return <File className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200 w-64 flex-shrink-0">
      <div className="p-4 border-b border-slate-200 bg-white">
        <h2 className="text-xl font-serif font-bold text-slate-800 flex items-center gap-2">
          <span className="bg-amber-100 p-1 rounded text-amber-700"><BookIcon size={20} /></span>
          Lumina
        </h2>
        <p className="text-xs text-slate-500 mt-1">AI-Enhanced Reader</p>
      </div>

      <div className="p-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-2 px-4 rounded-lg transition-colors shadow-sm font-medium text-sm"
        >
          <Upload size={16} />
          Import Book
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".epub,.txt,.pdf"
          className="hidden"
        />
        <p className="text-[10px] text-center text-slate-400 mt-2">
          Supports EPUB, TXT, PDF (Beta)
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {books.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm">
            <p>No books in library</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {books.map((book) => (
              <li key={book.id} className="group relative">
                <button
                  onClick={() => onSelectBook(book)}
                  className={`w-full text-left p-3 rounded-md flex items-start gap-3 transition-colors ${
                    activeBookId === book.id
                      ? 'bg-amber-50 border border-amber-200 shadow-sm'
                      : 'hover:bg-slate-100'
                  }`}
                >
                  <div className="mt-0.5">{getIcon(book.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${activeBookId === book.id ? 'text-amber-900' : 'text-slate-700'}`}>
                      {book.title}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {book.type.toUpperCase()}
                    </p>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteBook(book.id);
                  }}
                  className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 rounded"
                  title="Remove book"
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
};

export default Library;