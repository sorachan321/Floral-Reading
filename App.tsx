
import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ePub from 'epubjs';
import Sidebar from './components/Sidebar';
import HomeView from './components/HomeView';
import Reader from './components/Reader';
import ChatInterface from './components/ChatInterface';
import SettingsModal from './components/SettingsModal';
import { geminiService } from './services/geminiService';
import { saveGlobalSettings, loadGlobalSettings } from './utils/storage';
import { Book, ReaderSettings, ChatMessage, SelectionData } from './types';

function App() {
  // --- State ---
  const [activeView, setActiveView] = useState<'home' | 'reader'>('home');
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  
  // Reader Configuration (Initialized with defaults, loaded in useEffect)
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>({
    theme: 'light',
    fontSize: 18,
    fontFamily: 'serif',
    lineHeight: 1.6,
    letterSpacing: 0,
    paragraphSpacing: 10,
    marginX: 10,
    highlightColor: '#fde047',
    flow: 'paginated',
    align: 'auto',
    columns: 'auto',
    useMathJax: false,
    reduceMotion: false,
    hideFootnotes: false,
    hideIndicators: false,
    hideFurigana: false,
    disableRtl: false,
    enableFocusMode: false,
    enableReadingRuler: false,
    aiModel: 'gemini-2.5-flash' // Default model
  });
  
  // Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Extraction State
  const [isExtractingText, setIsExtractingText] = useState(false);

  // Selection State
  const [currentSelection, setCurrentSelection] = useState<SelectionData | null>(null);

  // --- Derived State ---
  const activeBook = books.find(b => b.id === activeBookId) || null;

  // --- Initialization ---
  useEffect(() => {
      // Load global settings on startup
      const savedSettings = loadGlobalSettings();
      setReaderSettings(savedSettings);
  }, []);

  const handleSettingsChange = useCallback((newSettings: ReaderSettings) => {
      setReaderSettings(newSettings);
      saveGlobalSettings(newSettings);
  }, []);

  // --- Handlers ---

  // 1. Book Import & Parsing
  const handleAddBook = async (file: File) => {
    const reader = new FileReader();
    const type = file.name.toLowerCase().endsWith('.epub') ? 'epub' : 
                 file.name.toLowerCase().endsWith('.txt') ? 'txt' : 
                 file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'unsupported';

    if (type === 'unsupported') {
      alert('Unsupported file format. Please use EPUB, TXT, or PDF.');
      return;
    }

    // Read as ArrayBuffer for binary, Text for txt
    const readMethod = (type === 'epub' || type === 'pdf') ? 'readAsArrayBuffer' : 'readAsText';

    reader.onload = async (e) => {
      if (e.target?.result) {
        let content: ArrayBuffer | string = e.target.result;
        let textContent = "";
        let coverUrl: string | undefined = undefined;
        let title = file.name.replace(/\.(epub|txt|pdf)$/i, '');
        let author = 'Unknown Author';

        // Logic A: Handle EPUB Metadata & Cover
        if (type === 'epub') {
             try {
                 const bookObj = ePub(content as ArrayBuffer);
                 await bookObj.ready;
                 
                 const metadata = await bookObj.loaded.metadata;
                 if (metadata.title) title = metadata.title;
                 if (metadata.creator) author = metadata.creator;
                 
                 const url = await bookObj.coverUrl();
                 if (url) coverUrl = url;

             } catch (err) {
                 console.warn("Failed to extract metadata/cover", err);
             }
        }

        // Logic B: TXT is already "extracted" text
        if (type === 'txt' && typeof content !== 'string') {
             // Fallback safety
             content = new TextDecoder().decode(content as ArrayBuffer);
             textContent = content as string;
        } else if (type === 'txt') {
            textContent = content as string;
        }

        // Generate deterministic ID
        const idString = `${title}-${author}`.toLowerCase().replace(/[^a-z0-9]/g, '');
        const id = idString || uuidv4();

        const newBook: Book = {
          id: id,
          title,
          author,
          content: content,
          type: type as any,
          coverUrl,
          textContent: type === 'txt' ? textContent : undefined,
          isContextEnabled: type === 'txt' // Auto-enable context for txt
        };
        
        setBooks(prev => {
            // Avoid duplicates
            if (prev.some(b => b.id === id)) return prev;
            return [...prev, newBook];
        });
      }
    };

    reader[readMethod](file);
  };

  const handleDeleteBook = (id: string) => {
      setBooks(prev => prev.filter(b => b.id !== id));
      if (activeBookId === id) {
          setActiveBookId(null);
          setActiveView('home');
      }
  };

  const handleSelectBook = (book: Book) => {
      setActiveBookId(book.id);
      setActiveView('reader');
  };

  // 2. AI & Chat Logic
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = { id: uuidv4(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setIsAiLoading(true);

    try {
        // Determine context
        const contextText = currentSelection?.text;
        const bookContext = activeBook?.isContextEnabled ? activeBook?.extractedText || activeBook?.textContent : undefined;
        
        // Pass the SELECTED MODEL and SYSTEM PROMPT from settings
        // The service now handles model initialization if it changed
        await geminiService.startChat(readerSettings.aiModel, readerSettings.customAiPrompt, bookContext);

        const stream = await geminiService.sendMessageStream(text, contextText, bookContext, readerSettings.aiModel);
        
        const modelMsgId = uuidv4();
        let fullText = "";
        
        // Init placeholder message
        setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: '' }]);

        for await (const chunk of stream) {
             const chunkText = chunk.text || "";
             fullText += chunkText;
             
             setMessages(prev => prev.map(m => 
                m.id === modelMsgId ? { ...m, text: fullText } : m
             ));
        }
        
        setCurrentSelection(null); // Clear selection after asking about it

    } catch (error: any) {
        const errorMsg: ChatMessage = { id: uuidv4(), role: 'model', text: "Sorry, I encountered an error. Please check your API Key or try again.", isError: true };
        setMessages(prev => [...prev, errorMsg]);
        console.error(error);
    } finally {
        setIsAiLoading(false);
    }
  };

  const handleAnalyzeSelection = async (type: 'explain' | 'summarize' | 'translate') => {
      if (!currentSelection) return;
      
      setIsAiLoading(true);
      setIsChatOpen(true); // Force open chat
      
      const label = type === 'explain' ? "Explain this" : type === 'summarize' ? "Summarize this" : "Translate this";
      const userMsg: ChatMessage = { id: uuidv4(), role: 'user', text: `${label}:\n"${currentSelection.text}"` };
      setMessages(prev => [...prev, userMsg]);

      try {
          // Pass selected model
          const result = await geminiService.analyzeSelection(readerSettings.aiModel, currentSelection.text, type);
          const modelMsg: ChatMessage = { id: uuidv4(), role: 'model', text: result };
          setMessages(prev => [...prev, modelMsg]);
      } catch (e) {
          setMessages(prev => [...prev, { id: uuidv4(), role: 'model', text: "Failed to analyze selection.", isError: true }]);
      } finally {
          setIsAiLoading(false);
          setCurrentSelection(null);
      }
  };

  const handleEnableContext = async () => {
      if (!activeBook) return;
      if (activeBook.type !== 'epub') return; // TXT is already done, PDF not supported yet
      
      setIsExtractingText(true);
      
      try {
          // Extract Text from EPUB
          const bookObj = ePub(activeBook.content as ArrayBuffer);
          await bookObj.ready;
          
          // Iterate over spine items to get text
          const spine = (bookObj.spine as any);
          let fullText = "";
          
          const limit = Math.min(spine.length, 15); 
          
          for (let i = 0; i < limit; i++) {
              const item = spine.get(i);
              if (item) {
                 const doc = await item.load(bookObj.load.bind(bookObj));
                 if (doc && doc.body) {
                     fullText += doc.body.innerText + "\n\n";
                 }
              }
          }

          setBooks(prev => prev.map(b => 
             b.id === activeBook.id 
             ? { ...b, extractedText: fullText, isContextEnabled: true } 
             : b
          ));
          
      } catch (e) {
          console.error("Extraction failed", e);
          alert("Failed to extract text from this book.");
      } finally {
          setIsExtractingText(false);
      }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        activeView={activeView}
        onNavigate={setActiveView}
        onSettingsClick={() => setIsSettingsOpen(true)}
        hasActiveBook={!!activeBookId}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* View: Home / Library */}
        {activeView === 'home' && (
             <HomeView 
                books={books}
                onSelectBook={handleSelectBook}
                onAddBook={handleAddBook}
                onDeleteBook={handleDeleteBook}
             />
        )}

        {/* View: Reader */}
        {activeView === 'reader' && activeBook && (
             <div className="flex w-full h-full">
                <Reader 
                    book={activeBook}
                    settings={readerSettings}
                    onSelection={setCurrentSelection}
                    onSettingsChange={handleSettingsChange}
                    onAiQuery={(text) => {
                      setCurrentSelection({ text });
                      setIsChatOpen(true);
                    }}
                    onToggleChat={() => setIsChatOpen(prev => !prev)}
                />
                
                {/* Chat Sidebar */}
                <ChatInterface 
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    onClearChat={() => setMessages([])}
                    isLoading={isAiLoading}
                    isOpen={isChatOpen}
                    onToggle={() => setIsChatOpen(!isChatOpen)}
                    activeBook={activeBook}
                    currentSelection={currentSelection ? currentSelection.text : null}
                    onAnalyzeSelection={handleAnalyzeSelection}
                    onEnableContext={handleEnableContext}
                    isExtractingText={isExtractingText}
                    onClearSelection={() => setCurrentSelection(null)}
                />
             </div>
        )}

        {/* Fallback if no book selected in reader mode */}
        {activeView === 'reader' && !activeBook && (
            <div className="flex-1 flex items-center justify-center text-slate-400">
                <p>No book selected.</p>
            </div>
        )}
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={""} 
        onSaveApiKey={() => {}} // Legacy prop
        settings={readerSettings}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  );
}

export default App;
