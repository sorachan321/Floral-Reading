
import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import ePub, { Rendition } from 'epubjs';
import { Book, ReaderSettings, SelectionData, NavItem, Annotation, BookmarkData, ActiveInlineNote } from '../types';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, Sparkles, Copy, MessageSquare, List as ListIcon, FilePenLine, Search, X, ArrowUp, ArrowDown } from 'lucide-react';
import ReaderMenu from './ReaderMenu';
import AnnotationModal from './AnnotationModal';
import InlineAiPanel from './InlineAiPanel';
import FloatingAiCard from './FloatingAiCard';
import { saveUserData, loadUserData } from '../utils/storage';
import { geminiService } from '../services/geminiService';
import { v4 as uuidv4 } from 'uuid';

interface ReaderProps {
  book: Book | null;
  settings: ReaderSettings;
  onSelection: (data: SelectionData) => void;
  onSettingsChange: (newSettings: ReaderSettings) => void;
  onAiQuery: (text: string) => void;
  onToggleChat: () => void;
}

interface SelectionMenu {
  visible: boolean;
  x: number;
  y: number;
  cfiRange: string | null;
  text: string;
}

const PALETTE: Record<string, string> = {
  red: '#fca5a5',
  orange: '#fdba74',
  yellow: '#fde047',
  green: '#86efac',
  teal: '#5eead4',
  blue: '#93c5fd',
  indigo: '#a5b4fc',
  purple: '#d8b4fe'
};

const Reader: React.FC<ReaderProps> = ({ book, settings, onSelection, onSettingsChange, onAiQuery, onToggleChat }) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const bookRef = useRef<any>(null); 
  const selectionTimeRef = useRef<number>(0);
  const rulerRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<SelectionMenu>({ visible: false, x: 0, y: 0, cfiRange: null, text: '' });
  
  // Navigation State
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [toc, setToc] = useState<NavItem[]>([]);
  const [landmarks, setLandmarks] = useState<any[]>([]);
  const [currentCfi, setCurrentCfi] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [isGeneratingLocations, setIsGeneratingLocations] = useState(false);
  
  // User Data State
  const [bookmarks, setBookmarks] = useState<BookmarkData[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const annotationsRef = useRef(annotations);
  useEffect(() => { annotationsRef.current = annotations; }, [annotations]);

  // Inline AI State (Plan A)
  const [inlineNotes, setInlineNotes] = useState<ActiveInlineNote[]>([]);

  // Popup AI State (Plan B)
  const [activePopupNote, setActivePopupNote] = useState<ActiveInlineNote | null>(null);

  // Annotation Modal State (Create & Edit)
  const [isAnnotationModalOpen, setIsAnnotationModalOpen] = useState(false);
  const [pendingAnnotation, setPendingAnnotation] = useState<{cfi: string, text: string} | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);

  // Search Bar State (Floating Ctrl+F)
  const [isSearchBarOpen, setIsSearchBarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<any[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Apply theme styles
  const getThemeColors = useCallback(() => {
    switch (settings.theme) {
      case 'dark': return { bg: '#242424', text: '#b0b0b0' };
      case 'sepia': return { bg: '#fbf7ef', text: '#5c4b37' };
      default: return { bg: '#ffffff', text: '#333333' };
    }
  }, [settings.theme]);

  const getFontFamily = useCallback(() => {
    switch(settings.fontFamily) {
        case 'sans': return 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif';
        case 'kai': return '"Kaiti SC", "KaiTi", "STKaiti", serif';
        case 'serif': 
        default: return 'Merriweather, "Songti SC", "SimSun", serif';
    }
  }, [settings.fontFamily]);

  const colors = getThemeColors();

  // Mouse Move Handler for Ruler (Window Level)
  useEffect(() => {
      if (!settings.enableReadingRuler) return;
      
      const handleMouseMove = (e: MouseEvent) => {
          if (rulerRef.current) {
              rulerRef.current.style.top = `${e.clientY - 16}px`;
          }
      };
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [settings.enableReadingRuler]);

  // --- Inline AI Logic (Plan A) ---

  // Step 1: Initialize the panel (waiting for user input)
  const openInlinePanel = (text: string, contextId: string, domNode?: HTMLElement) => {
      const noteId = uuidv4();
      const newNote: ActiveInlineNote = {
          id: noteId,
          textContext: text,
          aiResponse: '', // Empty initially -> triggers input mode
          isLoading: false,
          domNode: domNode, 
          cfi: contextId
      };
      
      // CHECK MODE
      if (settings.aiDisplayMode === 'popup') {
          setActivePopupNote(newNote);
      } else {
          setInlineNotes(prev => [...prev, newNote]);
      }
  };

  // Step 2: User submits prompt -> Trigger API
  // Generic handler for both Inline and Popup
  const handleAiSubmit = async (note: ActiveInlineNote, prompt: string) => {
      // Set loading state
      const updateState = (isLoading: boolean, response?: string) => {
          if (settings.aiDisplayMode === 'popup') {
              setActivePopupNote(prev => prev ? { ...prev, isLoading, aiResponse: response !== undefined ? response : prev.aiResponse } : null);
          } else {
              setInlineNotes(prev => prev.map(n => n.id === note.id ? { ...n, isLoading, aiResponse: response !== undefined ? response : n.aiResponse } : n));
          }
      };

      updateState(true);

      try {
          // Construct prompt based on user input + context
          const fullPrompt = `${prompt}\n\nTarget Text:\n"${note.textContext}"`;
          
          const stream = await geminiService.sendMessageStream(
              fullPrompt, 
              undefined, 
              undefined, 
              settings.aiModel
          );
          
          let fullText = "";
          for await (const chunk of stream) {
              const textChunk = chunk.text || "";
              fullText += textChunk;
              updateState(true, fullText);
          }
          
          updateState(false);

      } catch (e) {
          updateState(false, "Error generating response. Please try again.");
      }
  };

  const removeInlineNote = (id: string) => {
      const note = inlineNotes.find(n => n.id === id);
      if (note && note.domNode) {
          // Clean up DOM for EPUB
          note.domNode.remove();
      }
      setInlineNotes(prev => prev.filter(n => n.id !== id));
  };
  
  const closePopupNote = () => {
      setActivePopupNote(null);
  };

  // --- Style Injection ---

  const applyStyles = useCallback((rendition: Rendition, currentSettings: ReaderSettings) => {
    const themeColors = getThemeColors();
    const font = getFontFamily();
    
    // 1. Basic Font Size
    rendition.themes.fontSize(`${currentSettings.fontSize}px`);

    // 2. CSS Rules
    const rules: any = {
      body: { 
        'color': `${themeColors.text} !important`, 
        'background': `${themeColors.bg} !important`,
        'font-family': `${font} !important`,
        'line-height': `${currentSettings.lineHeight} !important`,
        'letter-spacing': `${currentSettings.letterSpacing}px !important`,
        'padding': currentSettings.flow === 'scrolled' 
                   ? `20px ${currentSettings.marginX}% !important` // Scroll needs Y padding
                   : `0 ${currentSettings.marginX}% !important`, // Paged usually handles height via column
        'max-width': '100vw !important',
        'box-sizing': 'border-box !important',
        'text-align': currentSettings.align === 'justify' ? 'justify !important' : 
                      currentSettings.align === 'left' ? 'left !important' : 'auto',
      },
      'p': {
        'font-family': 'inherit !important',
        'font-size': '100% !important',
        'line-height': 'inherit !important',
        'color': 'inherit !important',
        'margin-bottom': `${currentSettings.paragraphSpacing}px !important`,
        'margin-top': '0 !important',
        // Base transition for focus mode
        'transition': 'opacity 0.3s ease, color 0.3s ease !important',
        'position': 'relative', // For absolute positioning of triggers
      },
      '::selection': {
        'background': `${currentSettings.highlightColor} !important`,
        'color': 'black !important'
      },
      // INLINE AI STYLES FOR EPUB
      '.ai-trigger': {
          'position': 'absolute',
          'right': '-24px',
          'top': '0',
          'opacity': '0',
          'cursor': 'pointer',
          'transition': 'opacity 0.2s, transform 0.2s',
          'font-size': '16px',
          'line-height': '1',
          'z-index': '10',
          'padding': '4px',
          'border-radius': '4px',
      },
      'p:hover .ai-trigger': {
          'opacity': '1',
      },
      '.ai-trigger:hover': {
          'transform': 'scale(1.2)',
          'background': 'rgba(255, 193, 7, 0.2)', // Amber-200
      },
      // Container for React Portal
      '.inline-ai-portal-mount': {
          'margin': '24px 0',
          'clear': 'both',
          'position': 'relative',
          'z-index': '20'
      }
    };

    // Advanced CSS injections based on Toggles
    if (currentSettings.hideFurigana) {
        rules['ruby rt'] = { 'display': 'none !important' };
    }
    
    if (currentSettings.hideFootnotes) {
        rules['aside[epub|type~="footnote"]'] = { 'display': 'none !important' };
        rules['.footnote'] = { 'display': 'none !important' };
    }

    if (currentSettings.reduceMotion) {
        rules['*'] = { 
            'transition': 'none !important',
            'animation': 'none !important'
        };
    }
    
    if (currentSettings.disableRtl) {
        rules['html'] = { 'direction': 'ltr !important' };
        rules['body'] = { 'direction': 'ltr !important' };
    }

    // Focus Mode (CSS Injection)
    if (currentSettings.enableFocusMode) {
        // When body is hovered (active), dim all P
        rules['body:hover p'] = { 'opacity': '0.3' };
        // But keep the hovered P bright
        rules['body p:hover'] = { 'opacity': '1 !important' };
    } else {
        // Reset if disabled
        rules['body:hover p'] = { 'opacity': '1' };
    }

    rendition.themes.register('custom', rules);
    rendition.themes.select('custom');
    
    // Spread / Columns handling
    if (currentSettings.flow === 'paginated') {
        if (currentSettings.columns === '1') {
            rendition.spread('none');
        } else if (currentSettings.columns === '2') {
             rendition.spread('always'); 
        } else {
             rendition.spread('auto');
        }
    }
    
  }, [getThemeColors, getFontFamily]);

  // Generate CSS for annotations and SEARCH RESULTS
  const getAnnotationCss = () => {
      // User Highlights
      const highlightStyles = Object.entries(PALETTE).map(([name, color]) => `
        g[class*="hl-${name}"], .hl-${name} {
            fill: ${color} !important;
            fill-opacity: 0.3 !important;
            cursor: pointer;
            pointer-events: all !important;
        }
        g[class*="hl-${name}"] rect, .hl-${name} rect,
        g[class*="hl-${name}"] path, .hl-${name} path { 
            fill: ${color} !important; 
            fill-opacity: 0.3 !important; 
            stroke: none !important;
            pointer-events: all !important;
        }
        g[class*="ul-${name}"], .ul-${name} {
             fill-opacity: 0 !important;
             stroke: ${color} !important;
             stroke-width: 2px !important;
             cursor: pointer;
             pointer-events: all !important;
        }
      `).join('\n');

      // Search Result Styles
      const searchStyles = `
        /* General Search Results */
        .search-result {
            fill: #fde047 !important; /* Yellow */
            fill-opacity: 0.4 !important;
            cursor: pointer;
        }
        g[class*="search-result"] rect {
            fill: #fde047 !important;
            fill-opacity: 0.4 !important;
        }

        /* Active Search Result - HIGH CONTRAST */
        .search-result-active {
            fill: #f97316 !important; /* Bright Orange */
            fill-opacity: 0.7 !important;
            stroke: #ea580c !important; /* Darker Orange Border */
            stroke-width: 2px !important;
        }
        g[class*="search-result-active"] rect {
            fill: #f97316 !important;
            fill-opacity: 0.7 !important;
            stroke: #ea580c !important;
            stroke-width: 2px !important;
        }
      `;

      return highlightStyles + searchStyles;
  };

  // Keyboard Shortcuts (Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            setIsSearchBarOpen(true);
            setTimeout(() => searchInputRef.current?.focus(), 50);
            const selection = window.getSelection()?.toString();
            if(selection) setSearchQuery(selection);
        }
        if (e.key === 'Escape') {
            if (isSearchBarOpen) {
                closeSearchBar();
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    if (renditionRef.current) {
        renditionRef.current.hooks.content.register((contents: any) => {
            contents.document.addEventListener('keydown', handleKeyDown);
        });
    }

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchBarOpen]);

  // Handle Text Selection (TXT Mode)
  const handleTxtSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setMenu({
        visible: true,
        x: rect.left + (rect.width / 2),
        y: rect.top - 10,
        cfiRange: null, 
        text: selection.toString().trim()
      });
      
      onSelection({ text: selection.toString().trim() });
    }
  }, [onSelection]);

  // Menu Actions
  const handleOpenAnnotationModal = () => {
    if (menu.cfiRange && menu.text) {
      setPendingAnnotation({ cfi: menu.cfiRange, text: menu.text });
      setEditingAnnotation(null);
      setIsAnnotationModalOpen(true);
      setMenu(prev => ({ ...prev, visible: false }));
    }
  };

  const handleSaveAnnotation = (data: { note: string; color: string; style: 'highlight' | 'underline'; tags: string[] }) => {
    if (!renditionRef.current) return;

    const cfi = editingAnnotation ? editingAnnotation.cfiRange : pendingAnnotation?.cfi;
    const textContext = editingAnnotation ? editingAnnotation.text : pendingAnnotation?.text;

    if (!cfi || !textContext) return;

    if (editingAnnotation) {
        try {
            renditionRef.current.annotations.remove(cfi, 'highlight');
            renditionRef.current.annotations.remove(cfi, 'underline');
        } catch(e) {}
    }

    const prefix = data.style === 'highlight' ? 'hl' : 'ul';
    const className = `${prefix}-${data.color}`; 
    try {
        renditionRef.current.annotations.add(data.style, cfi, { cfiRange: cfi }, undefined, className);
    } catch(e) {
        console.warn("Failed to add visual annotation", e);
    }

    const newAnnotation: Annotation = {
        cfiRange: cfi,
        text: textContext,
        note: data.note,
        color: data.color,
        style: data.style,
        tags: data.tags,
        date: new Date().toISOString(),
        type: 'annotation'
    };

    setAnnotations(prev => {
        const updated = editingAnnotation 
            ? prev.map(a => a.cfiRange === cfi ? newAnnotation : a)
            : [...prev, newAnnotation];
        
        if (book) saveUserData(book.id, { annotations: updated });
        return updated;
    });

    setPendingAnnotation(null);
    setEditingAnnotation(null);
    clearSelection();
  };

  const handleDeleteAnnotation = () => {
      if (editingAnnotation && editingAnnotation.cfiRange) {
          handleRemoveAnnotation(editingAnnotation.cfiRange);
      }
  };

  const handleAskAI = () => {
      onAiQuery(menu.text);
      setMenu(prev => ({ ...prev, visible: false }));
  };
  
  const handleInlineFromSelection = () => {
      // If Popup mode is enabled, trigger generic popup with selection text
      if (settings.aiDisplayMode === 'popup') {
          openInlinePanel(menu.text, menu.cfiRange || 'txt-selection');
          setMenu(prev => ({ ...prev, visible: false }));
          clearSelection();
          return;
      }

      // For EPUB Inline from Selection (Plan A)
      if (menu.cfiRange) {
         // We need to find the DOM element
         if (renditionRef.current) {
             // Use a heuristic to find the node. 
             // We can insert after the "commonAncestorContainer" of the range
             try {
                // @ts-ignore
                const range = renditionRef.current.getRange(menu.cfiRange);
                if (range) {
                    const block = range.commonAncestorContainer.nodeType === 1 
                        ? range.commonAncestorContainer as HTMLElement 
                        : range.commonAncestorContainer.parentElement;
                    
                    if (block) {
                        // Create container
                        const container = block.ownerDocument.createElement('div');
                        container.className = 'inline-ai-portal-mount';
                        
                        if (block.nextSibling) {
                            block.parentNode?.insertBefore(container, block.nextSibling);
                        } else {
                            block.parentNode?.appendChild(container);
                        }
                        
                        openInlinePanel(menu.text, menu.cfiRange, container);
                        setMenu(prev => ({ ...prev, visible: false }));
                        clearSelection();
                    }
                }
             } catch (e) {
                 console.error("Failed to find range for inline", e);
             }
         }
      } else {
          // TXT mode handles this differently via state
          handleAskAI(); // Fallback for now if not triggered via sparkly icon
      }
  };
  
  const handleCopy = () => {
      navigator.clipboard.writeText(menu.text);
      setMenu(prev => ({ ...prev, visible: false }));
      clearSelection();
  };
  
  const handleRemoveBookmark = (cfi: string) => {
      setBookmarks(prev => {
          const updated = prev.filter(b => b.cfi !== cfi);
          if (book) saveUserData(book.id, { bookmarks: updated });
          return updated;
      });
  };

  const handleRemoveAnnotation = (cfi: string) => {
      if (renditionRef.current) {
         try {
             renditionRef.current.annotations.remove(cfi, 'highlight');
             renditionRef.current.annotations.remove(cfi, 'underline');
         } catch(e) { console.warn(e); }
      }
      setAnnotations(prev => {
          const updated = prev.filter(a => a.cfiRange !== cfi);
          if (book) saveUserData(book.id, { annotations: updated });
          return updated;
      });
  };

  const clearSelection = () => {
      window.getSelection()?.removeAllRanges();
      if (renditionRef.current) {
         // @ts-ignore
         const iframe = viewerRef.current?.querySelector('iframe');
         if(iframe && iframe.contentWindow) {
             iframe.contentWindow.getSelection()?.removeAllRanges();
         }
      }
  };

  const handleNavigate = (href: string) => {
      if (renditionRef.current) {
          renditionRef.current.display(href);
      }
  };

  // --- SEARCH LOGIC (Shared & Interactive) ---
  const performSearch = async (query: string): Promise<any[]> => {
      if (!bookRef.current) return [];
      if (!query || query.length < 2) return [];

      const results: any[] = [];
      const spine = bookRef.current.spine;
      const spineLength = spine.length;
      const lowerQuery = query.toLowerCase();
      
      for (let i = 0; i < spineLength; i++) {
          try {
              const item = spine.get(i);
              if (!item || !item.href) continue;
              const doc = await bookRef.current.load(item.href);
              
              if (doc && doc.body) {
                  const textContent = doc.body.innerText || doc.body.textContent || "";
                  const cleanText = textContent.replace(/\s+/g, ' ');
                  const lowerText = cleanText.toLowerCase();
                  
                  let startIndex = 0;
                  let index = lowerText.indexOf(lowerQuery, startIndex);

                  while (index !== -1) {
                      const start = Math.max(0, index - 30);
                      const end = Math.min(cleanText.length, index + query.length + 30);
                      const excerpt = cleanText.substring(start, end);
                      
                      results.push({
                          cfi: item.href, 
                          excerpt: excerpt,
                          label: item.idref || `Chapter ${i+1}`,
                          context: excerpt
                      });
                      
                      startIndex = index + query.length;
                      index = lowerText.indexOf(lowerQuery, startIndex);
                      
                      if (results.length > 500) break; 
                  }
              }
          } catch (e) { console.warn(`Skipping search for section ${i}`); }
      }
      return results;
  };
  
  const handleInteractiveSearch = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!searchQuery.trim()) return;
      
      setIsSearching(true);
      setCurrentMatchIndex(-1);
      
      if (renditionRef.current) {
          try {
             const annotations = renditionRef.current.annotations as any;
             if (annotations._annotations) {
                 Object.keys(annotations._annotations).forEach(key => {
                     const note = annotations._annotations[key];
                     if (note.type === 'search-result' || note.type === 'search-result-active') {
                         renditionRef.current?.annotations.remove(note.cfiRange, note.type);
                     }
                 });
             }
          } catch (e) {}
      }

      try {
          const results = await Promise.all(
              // @ts-ignore
              bookRef.current.spine.spineItems.map(item => 
                  item.load(bookRef.current.load.bind(bookRef.current))
                  .then((doc: any) => item.find(searchQuery))
                  .catch(() => []) 
              )
          );
          
          const flatResults = results.flat().map((res: any) => ({
              cfi: res.cfi,
              excerpt: res.excerpt
          }));
          
          setSearchMatches(flatResults);
          
          if (flatResults.length > 0) {
              flatResults.forEach((res: any) => {
                 renditionRef.current?.annotations.add('highlight', res.cfi, {}, undefined, 'search-result');
              });
              nextSearchMatch(0, flatResults);
          }
          
      } catch (error) {
          console.error("Interactive search failed", error);
      } finally {
          setIsSearching(false);
      }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          e.shiftKey ? prevSearchMatch() : nextSearchMatch();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          nextSearchMatch();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          prevSearchMatch();
      }
  };

  const nextSearchMatch = (indexOverride?: number, resultsOverride?: any[]) => {
      const matches = resultsOverride || searchMatches;
      if (matches.length === 0) return;
      
      let nextIndex = indexOverride !== undefined ? indexOverride : currentMatchIndex + 1;
      if (nextIndex >= matches.length) nextIndex = 0;
      
      updateActiveSearchHighlight(nextIndex, matches);
  };

  const prevSearchMatch = () => {
      if (searchMatches.length === 0) return;
      let nextIndex = currentMatchIndex - 1;
      if (nextIndex < 0) nextIndex = searchMatches.length - 1;
      
      updateActiveSearchHighlight(nextIndex, searchMatches);
  };

  const updateActiveSearchHighlight = (index: number, matches: any[]) => {
      if (currentMatchIndex !== -1 && matches[currentMatchIndex]) {
          renditionRef.current?.annotations.remove(matches[currentMatchIndex].cfi, 'highlight');
          renditionRef.current?.annotations.add('highlight', matches[currentMatchIndex].cfi, {}, undefined, 'search-result');
      }

      const match = matches[index];
      setCurrentMatchIndex(index);
      
      renditionRef.current?.annotations.remove(match.cfi, 'highlight');
      renditionRef.current?.annotations.add('highlight', match.cfi, {}, undefined, 'search-result-active');
      
      renditionRef.current?.display(match.cfi);
  };

  const closeSearchBar = () => {
      setIsSearchBarOpen(false);
      setSearchMatches([]);
      setSearchQuery('');
      setCurrentMatchIndex(-1);
       if (renditionRef.current) {
          try {
             const annotations = renditionRef.current.annotations as any;
             const notes = annotations._annotations;
             if (notes) {
                 Object.keys(notes).forEach(key => {
                     const note = notes[key];
                     if (note.className && (note.className.includes('search-result'))) {
                         renditionRef.current?.annotations.remove(note.cfiRange, 'highlight');
                     }
                 });
             }
          } catch (e) {}
      }
  };

  // --- EPUB Rendering ---
  useEffect(() => {
    if (!book || book.type !== 'epub' || !viewerRef.current) return;
    
    if (renditionRef.current) {
        try { renditionRef.current.destroy(); } catch(e) {}
    }
    viewerRef.current.innerHTML = '';
    
    setLoading(true);
    setError(null);
    setMenu(prev => ({ ...prev, visible: false }));
    setIsGeneratingLocations(false);
    setInlineNotes([]); // Clear inline notes on book change/reload

    let mounted = true;

    try {
      const epubBook = ePub(book.content as ArrayBuffer);
      bookRef.current = epubBook;

      const flowMode = settings.flow === 'scrolled' ? 'scrolled' : 'paginated';

      const rendition = epubBook.renderTo(viewerRef.current, {
        width: '100%',
        height: '100%',
        flow: flowMode,
        manager: flowMode === 'scrolled' ? 'continuous' : 'default',
        allowScriptedContent: true // Allow scripts so we can inject listeners
      });

      renditionRef.current = rendition;

      rendition.hooks.content.register((contents: any) => {
          const doc = contents.document;
          const head = doc.querySelector('head');
          if (head) {
              const style = doc.createElement('style');
              style.innerHTML = getAnnotationCss();
              head.appendChild(style);
          }
          
          // INJECT SPARKLE BUTTONS ON PARAGRAPHS
          const paragraphs = doc.querySelectorAll('p');
          paragraphs.forEach((p: HTMLElement) => {
              // Avoid re-injecting
              if (p.querySelector('.ai-trigger')) return;

              const trigger = doc.createElement('span');
              trigger.innerHTML = '✨'; // Sparkles icon
              trigger.className = 'ai-trigger';
              trigger.title = 'Explain this paragraph';
              trigger.onclick = (e: MouseEvent) => {
                  e.stopPropagation();
                  e.preventDefault();
                  
                  // Plan B Check
                  // We can't access `settings.aiDisplayMode` directly in this closure reliably if it's stale, 
                  // but we passed settings in dep array so it should be fine.
                  
                  // If Inline (Plan A):
                  // Check if already expanded
                  if (p.nextSibling && (p.nextSibling as HTMLElement).classList?.contains('inline-ai-portal-mount')) {
                      return; // Already open
                  }

                  if (settings.aiDisplayMode === 'popup') {
                       // Trigger global popup
                       openInlinePanel(p.innerText, `p-${Date.now()}`);
                  } else {
                       // Trigger Inline Portal
                       const container = doc.createElement('div');
                       container.className = 'inline-ai-portal-mount';
                       p.insertAdjacentElement('afterend', container);
                       openInlinePanel(p.innerText, `p-${Date.now()}`, container);
                  }
              };
              
              p.appendChild(trigger);
          });

          // Ruler Mouse Event Listener inside iframe
          doc.addEventListener('mousemove', (e: MouseEvent) => {
             const iframe = doc.defaultView?.frameElement as HTMLElement;
             if (iframe && rulerRef.current) {
                 const rect = iframe.getBoundingClientRect();
                 const screenY = rect.top + e.clientY;
                 rulerRef.current.style.top = `${screenY - 16}px`;
             } else if (rulerRef.current) {
                 rulerRef.current.style.top = `${e.clientY - 16}px`;
             }
          });
      });

      const savedData = loadUserData(book.id);
      if (savedData) {
          setBookmarks(savedData.bookmarks || []);
          setAnnotations(savedData.annotations || []);
      } else {
          setBookmarks([]);
          setAnnotations([]);
      }

      epubBook.loaded.navigation.then((nav: any) => {
          if (mounted) {
              setToc(nav.toc); 
              setLandmarks(nav.landmarks);
          }
      });

      const startCfi = savedData?.lastCfi || undefined;
      
      rendition.display(startCfi).then(() => {
        if (!mounted) return;
        setLoading(false);
        applyStyles(rendition, settings);
        
        if (savedData?.annotations) {
            savedData.annotations.forEach((note: Annotation) => {
                const prefix = note.style === 'highlight' ? 'hl' : 'ul';
                const color = note.color || 'yellow';
                const className = `${prefix}-${color}`;
                try {
                    rendition.annotations.add(note.style, note.cfiRange, { cfiRange: note.cfiRange }, undefined, className);
                } catch(e) { console.warn(e); }
            });
        }

        setIsGeneratingLocations(true);
        epubBook.locations.generate(1000).then(() => {
            setIsGeneratingLocations(false);
            if (rendition.location) {
                const current = rendition.currentLocation() as any;
                if (current && current.start) {
                    const percentage = epubBook.locations.percentageFromCfi(current.start.cfi);
                    setProgress(percentage);
                }
            }
        }).catch(() => setIsGeneratingLocations(false));
        
        // --- Event Listeners ---
        
        rendition.on('selected', (cfiRange: string, contents: any) => {
          selectionTimeRef.current = Date.now();
          const selection = contents.window.getSelection();
          if (!selection || selection.rangeCount === 0) return;
          const range = selection.getRangeAt(0);
          const text = range.toString();
          if (!text.trim()) return;

          onSelection({ text, cfiRange });

          const viewElement = viewerRef.current;
          if (viewElement) {
               const iframe = viewElement.querySelector('iframe');
               if (iframe) {
                   const iframeRect = iframe.getBoundingClientRect();
                   const rect = range.getBoundingClientRect();
                   if (rect.width === 0 && rect.height === 0) return;

                   setMenu({
                       visible: true,
                       x: iframeRect.left + rect.left + (rect.width / 2),
                       y: iframeRect.top + rect.top - 10,
                       cfiRange: cfiRange,
                       text: text
                   });
               }
          }
        });

        rendition.on('markClicked', (cfiRange: string, data: any) => {
             const currentAnnotations = annotationsRef.current;
             const annotation = currentAnnotations.find(a => a.cfiRange === cfiRange || (data && data.cfiRange === a.cfiRange));
             
             if (annotation) {
                 setEditingAnnotation(annotation);
                 setPendingAnnotation(null);
                 setMenu(prev => ({ ...prev, visible: false }));
                 setIsAnnotationModalOpen(true);
             }
        });

        rendition.on('click', () => {
            if (Date.now() - selectionTimeRef.current < 300) return;
            setMenu(prev => ({ ...prev, visible: false }));
        });
        
        rendition.on('relocated', (location: any) => {
            setMenu(prev => ({ ...prev, visible: false }));
            setCurrentCfi(location.start.cfi);
            
            // Cleanup active portals that might be off-screen/destroyed
            // Actually, keep them in state, but DOM nodes might be gone.
            // setInlineNotes([]); // Optional: Clear inline AI on page turn? Maybe better to keep if scrolled.
            
            if (epubBook.locations.length() > 0) {
                 const percentage = epubBook.locations.percentageFromCfi(location.start.cfi);
                 setProgress(percentage);
                 saveUserData(book.id, { lastCfi: location.start.cfi, progress: percentage });
            } else {
                 saveUserData(book.id, { lastCfi: location.start.cfi });
            }
        });

        rendition.on('resized', () => {
            setMenu(prev => ({ ...prev, visible: false }));
        });

      }).catch(err => {
        if (!mounted) return;
        setError("Failed to render this EPUB file.");
        setLoading(false);
      });

    } catch (e: any) {
      if (mounted) {
        setError(`Error loading book: ${e.message}`);
        setLoading(false);
      }
    }

    return () => {
      mounted = false;
      if (renditionRef.current) {
        try { renditionRef.current.destroy(); } catch(e) {}
        renditionRef.current = null;
      }
    };
  }, [book?.id, settings.flow, settings.aiDisplayMode]); // Re-render if AI mode changes to update listeners

  useEffect(() => {
    if (book?.type === 'epub' && renditionRef.current) {
       applyStyles(renditionRef.current, settings);
    }
  }, [settings, applyStyles]);

  const prevPage = () => renditionRef.current?.prev();
  const nextPage = () => renditionRef.current?.next();

  if (!book) return null;

  // --- TXT Render ---
  if (book.type === 'txt') {
    return (
      <div 
        className={`flex-1 h-full w-full overflow-y-auto relative reader-scroll transition-colors duration-300 group ${settings.enableFocusMode ? 'focus-mode-active' : ''}`}
        style={{ backgroundColor: colors.bg, color: colors.text }}
        onMouseUp={handleTxtSelection}
        onMouseMove={(e) => {
            if (settings.enableReadingRuler && rulerRef.current) {
                rulerRef.current.style.top = `${e.clientY - 16}px`;
            }
        }}
      >
        {settings.enableReadingRuler && (
             <div 
                 ref={rulerRef}
                 className="fixed left-0 right-0 h-8 bg-yellow-400/20 pointer-events-none z-40 mix-blend-multiply border-y border-yellow-400/30"
                 style={{ top: -100 }}
             />
        )}
        <div 
          className="max-w-4xl mx-auto"
          style={{ 
             fontFamily: getFontFamily().replace(/"/g, ''),
             fontSize: `${settings.fontSize}px`, 
             lineHeight: settings.lineHeight, 
             letterSpacing: `${settings.letterSpacing}px`,
             paddingTop: '2rem',
             paddingBottom: '2rem',
             paddingLeft: `${settings.marginX}%`,
             paddingRight: `${settings.marginX}%`,
             whiteSpace: 'pre-wrap',
             textAlign: settings.align === 'justify' ? 'justify' : settings.align === 'left' ? 'left' : 'start'
          }}
        >
          {(book.content as string).split('\n').map((para, idx) => {
             const inlineNote = inlineNotes.find(n => n.id === `txt-${idx}`);
             
             return (
                 <div key={idx} className="relative group/line">
                     <p 
                        style={{ marginBottom: `${settings.paragraphSpacing}px` }}
                        className="transition-opacity duration-300 ease-in-out hover:!opacity-100 pr-8"
                     >
                         {para}
                         {/* TXT Hover Trigger */}
                         {para.trim().length > 0 && (
                             <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (inlineNote) return; // Already open (if inline)
                                    openInlinePanel(para, `txt-${idx}`);
                                }}
                                className="absolute right-0 top-0 opacity-0 group-hover/line:opacity-100 text-amber-500 hover:text-amber-600 hover:bg-amber-100 p-1 rounded transition-all transform hover:scale-110"
                                title="Explain this paragraph"
                             >
                                 <Sparkles size={16} />
                             </button>
                         )}
                     </p>
                     
                     {/* Inline Expansion Panel (Accordion) - Only if NOT popup mode */}
                     {inlineNote && settings.aiDisplayMode === 'inline' && (
                         <div className="mb-6 pl-4">
                             <InlineAiPanel 
                                content={inlineNote.aiResponse}
                                isLoading={inlineNote.isLoading}
                                onClose={() => removeInlineNote(inlineNote.id)}
                                onSend={(prompt) => handleAiSubmit(inlineNote, prompt)}
                             />
                         </div>
                     )}
                 </div>
             );
          })}
        </div>
        
        {/* Floating AI Card for Plan B */}
        {activePopupNote && (
            <FloatingAiCard 
                contextText={activePopupNote.textContext}
                aiResponse={activePopupNote.aiResponse}
                isLoading={activePopupNote.isLoading}
                onClose={closePopupNote}
                onSend={(prompt) => handleAiSubmit(activePopupNote, prompt)}
            />
        )}
        
        <style>{`
            ::selection {
                background: ${settings.highlightColor} !important;
                color: black !important;
            }
            .focus-mode-active:hover p {
                opacity: 0.3;
            }
            .focus-mode-active:hover p:hover {
                opacity: 1 !important;
            }
        `}</style>
        
        {menu.visible && (
            <div 
                className="fixed z-50 flex items-center bg-slate-800 text-white rounded-lg shadow-xl py-1 px-1 transform -translate-x-1/2 -translate-y-full mb-2 animate-in fade-in zoom-in-95 duration-200 border border-slate-700"
                style={{ left: menu.x, top: menu.y }}
            >
                 <button onClick={handleCopy} className="p-2 hover:bg-slate-700 rounded transition-colors" title="Copy">
                    <Copy size={14} />
                </button>
                 <button onClick={handleAskAI} className="p-2 hover:bg-slate-700 rounded-md flex items-center gap-2 text-xs font-semibold bg-slate-700/50 ml-1" title="Ask AI">
                    <Sparkles size={14} className="text-amber-400" />
                    <span>Ask AI</span>
                </button>
            </div>
        )}

        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 p-1.5 rounded-lg bg-white/90 shadow-sm border border-slate-200/50 backdrop-blur-sm">
             <button onClick={() => onSettingsChange({...settings, fontSize: Math.max(12, settings.fontSize - 2)})} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><ZoomOut size={18} /></button>
             <span className="text-xs font-medium w-8 text-center text-slate-600">{settings.fontSize}px</span>
             <button onClick={() => onSettingsChange({...settings, fontSize: Math.min(36, settings.fontSize + 2)})} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><ZoomIn size={18} /></button>
             <div className="w-px h-4 bg-slate-300 mx-1"></div>
             <button onClick={onToggleChat} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded transition-colors" title="Open AI Chat">
                 <MessageSquare size={18} />
             </button>
        </div>
      </div>
    );
  }

  // --- PDF Render ---
  if (book.type === 'pdf') {
     const blob = new Blob([book.content as ArrayBuffer], { type: 'application/pdf' });
     const url = URL.createObjectURL(blob);
     return (
        <div className="flex-1 h-full w-full bg-slate-200 flex flex-col items-center justify-center relative overflow-hidden">
            <iframe src={url} className="w-full h-full border-none" title="PDF Reader" />
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 p-1.5 rounded-lg bg-white/90 shadow-sm border border-slate-200/50 backdrop-blur-sm">
                 <button onClick={onToggleChat} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded transition-colors" title="Open AI Chat">
                     <MessageSquare size={18} />
                 </button>
            </div>
        </div>
     );
  }

  // --- EPUB Render ---
  return (
    <div className="flex-1 flex flex-col h-full w-full relative overflow-hidden transition-colors duration-300" style={{ backgroundColor: colors.bg }}>
      
      {/* React Portals for EPUB Inline AI (Plan A) */}
      {settings.aiDisplayMode === 'inline' && inlineNotes.map(note => 
          note.domNode 
          ? ReactDOM.createPortal(
              <InlineAiPanel 
                  content={note.aiResponse}
                  isLoading={note.isLoading}
                  onClose={() => removeInlineNote(note.id)}
                  onSend={(prompt) => handleAiSubmit(note, prompt)}
              />,
              note.domNode
          ) 
          : null
      )}

      {/* Floating AI Card (Plan B) */}
      {activePopupNote && (
          <FloatingAiCard 
              contextText={activePopupNote.textContext}
              aiResponse={activePopupNote.aiResponse}
              isLoading={activePopupNote.isLoading}
              onClose={closePopupNote}
              onSend={(prompt) => handleAiSubmit(activePopupNote, prompt)}
          />
      )}

      {/* Reading Ruler Overlay */}
      {settings.enableReadingRuler && (
          <div 
              ref={rulerRef}
              className="fixed left-0 right-0 h-8 bg-yellow-400/20 pointer-events-none z-40 mix-blend-multiply border-y border-yellow-400/30 transition-transform duration-75 ease-linear"
              style={{ top: -100 }}
          />
      )}

      <style>{getAnnotationCss()}</style>

      {/* Floating Search Bar (Ctrl+F) */}
      {isSearchBarOpen && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md animate-in fade-in slide-in-from-top-2 duration-200">
           <div className="bg-white/95 backdrop-blur shadow-xl rounded-full border border-slate-200 px-4 py-2 flex items-center gap-2 ring-2 ring-slate-100">
               <Search size={16} className="text-slate-400" />
               <div className="flex-1">
                   <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="查找内容..."
                      className="w-full bg-transparent border-none outline-none text-sm text-slate-700 placeholder-slate-400"
                   />
               </div>
               <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                    <button onClick={() => handleInteractiveSearch()} className="mr-2 p-1 text-blue-600 font-bold text-xs hover:bg-blue-50 rounded">
                        Go
                    </button>
                   <span className="text-xs text-slate-400 mr-2 min-w-[30px] text-center font-mono">
                       {searchMatches.length > 0 ? `${currentMatchIndex + 1}/${searchMatches.length}` : '0/0'}
                   </span>
                   <button onClick={() => prevSearchMatch()} className="p-1 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-50" disabled={searchMatches.length === 0} title="Previous (Up/Left)">
                       <ArrowUp size={16} />
                   </button>
                   <button onClick={() => nextSearchMatch()} className="p-1 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-50" disabled={searchMatches.length === 0} title="Next (Down/Right/Enter)">
                       <ArrowDown size={16} />
                   </button>
                   <button onClick={closeSearchBar} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500 ml-1">
                       <X size={16} />
                   </button>
               </div>
           </div>
           {isSearching && (
               <div className="absolute -bottom-8 left-0 right-0 text-center">
                    <span className="text-[10px] bg-black/60 text-white px-3 py-1 rounded-full backdrop-blur-md shadow-sm">
                        <Loader2 size={8} className="inline animate-spin mr-1"/> 正在搜索全文...
                    </span>
               </div>
           )}
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50 backdrop-blur-sm">
          <Loader2 className="animate-spin text-amber-600" size={32} />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 p-8 text-center text-red-500">
          <p>{error}</p>
        </div>
      )}

      <div className="flex-1 relative z-0 overflow-hidden w-full h-full">
          <div ref={viewerRef} className="h-full w-full" />
      </div>
      
      <ReaderMenu 
         isOpen={isNavOpen}
         onClose={() => setIsNavOpen(false)}
         toc={toc}
         landmarks={landmarks}
         onNavigate={handleNavigate}
         bookmarks={bookmarks}
         onRemoveBookmark={handleRemoveBookmark}
         annotations={annotations}
         onRemoveAnnotation={handleRemoveAnnotation}
         onSearch={performSearch}
         currentPage={currentCfi}
         currentPercentage={progress}
      />
      
      <AnnotationModal 
        isOpen={isAnnotationModalOpen}
        onClose={() => setIsAnnotationModalOpen(false)}
        onSave={handleSaveAnnotation}
        onDelete={handleDeleteAnnotation}
        selectedText={editingAnnotation ? editingAnnotation.text : (pendingAnnotation?.text || '')}
        initialData={editingAnnotation ? {
            note: editingAnnotation.note,
            color: editingAnnotation.color,
            style: editingAnnotation.style,
            tags: editingAnnotation.tags
        } : undefined}
      />

      {menu.visible && (
          <div 
            className="fixed z-50 flex items-center bg-slate-800 text-white rounded-lg shadow-xl py-1.5 px-2 transform -translate-x-1/2 -translate-y-full gap-2 animate-in fade-in zoom-in-95 duration-200 border border-slate-700"
            style={{ left: menu.x, top: menu.y - 10 }}
          >
            <button 
                onClick={handleOpenAnnotationModal}
                className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-slate-700 rounded transition-colors text-blue-200 font-medium text-xs" 
                title="Add Note & Highlight"
            >
                <FilePenLine size={16} />
                <span>注解</span>
            </button>
            <div className="w-px h-4 bg-slate-600 mx-0.5"></div>
            <button 
                onClick={handleCopy}
                className="p-1.5 hover:bg-slate-700 rounded transition-colors text-slate-300 hover:text-white" 
                title="Copy"
            >
                <Copy size={16} />
            </button>
            
            {/* INLINE/POPUP AI BUTTON FOR EPUB SELECTION MENU */}
            <div className="w-px h-4 bg-slate-600 mx-0.5"></div>
            <button 
                onClick={handleInlineFromSelection}
                className="px-2 py-1.5 hover:bg-slate-700 rounded flex items-center gap-1.5 transition-colors bg-gradient-to-r from-amber-500/10 to-transparent border border-white/5" 
                title="AI Analysis"
            >
                <Sparkles size={16} className="text-amber-400" />
                <span className="text-xs font-bold text-slate-100">AI</span>
            </button>

            <button 
                onClick={handleAskAI}
                className="px-2 py-1.5 hover:bg-slate-700 rounded flex items-center gap-1.5 transition-colors text-slate-300" 
                title="Ask in Chat Sidebar"
            >
                <MessageSquare size={16} />
                <span className="text-xs">Chat</span>
            </button>
          </div>
      )}

      {!settings.hideIndicators && settings.flow !== 'scrolled' && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-8 pointer-events-none z-20">
            <button onClick={prevPage} className="pointer-events-auto p-2 rounded-full bg-slate-900/10 hover:bg-slate-900/20 text-slate-700 transition-all backdrop-blur-sm"><ChevronLeft size={24} /></button>
            <button onClick={nextPage} className="pointer-events-auto p-2 rounded-full bg-slate-900/10 hover:bg-slate-900/20 text-slate-700 transition-all backdrop-blur-sm"><ChevronRight size={24} /></button>
        </div>
      )}

      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 p-1.5 rounded-lg bg-white/90 shadow-sm border border-slate-200/50 backdrop-blur-sm">
         <button onClick={() => onSettingsChange({...settings, fontSize: Math.max(12, settings.fontSize - 2)})} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><ZoomOut size={18} /></button>
         <span className="text-xs font-medium w-8 text-center text-slate-600">{settings.fontSize}px</span>
         <button onClick={() => onSettingsChange({...settings, fontSize: Math.min(36, settings.fontSize + 2)})} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><ZoomIn size={18} /></button>
         <div className="w-px h-4 bg-slate-300 mx-1"></div>
         <button onClick={onToggleChat} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded transition-colors" title="Open AI Chat">
             <MessageSquare size={18} />
         </button>
      </div>

      <div className="absolute top-4 left-4 z-20">
          <button 
            onClick={() => setIsNavOpen(true)}
            className="p-2 bg-white/90 rounded-lg shadow-sm border border-slate-200/50 backdrop-blur-sm text-slate-700 hover:text-blue-600 hover:bg-white transition-all"
            title="Menu"
          >
              <ListIcon size={20} />
          </button>
      </div>

    </div>
  );
};

export default Reader;