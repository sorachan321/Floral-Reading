
export type FileType = 'epub' | 'txt' | 'pdf' | 'unsupported';

export interface Book {
  id: string;
  title: string;
  author: string;
  content: ArrayBuffer | string; // ArrayBuffer for EPUB, string for TXT
  type: FileType;
  coverUrl?: string;
  textContent?: string; // Extracted text for AI context
  extractedText?: string; // The full converted text content
  isContextEnabled?: boolean; // Whether to send this text to AI
}

export type Theme = 'light' | 'sepia' | 'dark';

export interface ReaderSettings {
  // Appearance
  theme: Theme;
  fontSize: number;
  fontFamily: 'serif' | 'sans' | 'song' | 'hei' | 'kai';
  
  // Layout - Sliders
  lineHeight: number;       // e.g., 1.4 to 2.0
  letterSpacing: number;    // e.g., 0 to 2px
  paragraphSpacing: number; // e.g., 0 to 20px
  marginX: number;          // e.g., 0 to 20% (Side margins)

  // Layout - Advanced Modes
  flow: 'paginated' | 'scrolled';
  align: 'auto' | 'justify' | 'left';
  columns: 'auto' | '1' | '2';
  
  // Toggles
  useMathJax: boolean;
  reduceMotion: boolean;
  hideFootnotes: boolean;
  hideIndicators: boolean;
  hideFurigana: boolean; // Hide Japanese ruby text
  disableRtl: boolean;   // Force LTR
  
  // Focus Tools
  enableFocusMode: boolean;    // Dim inactive paragraphs
  enableReadingRuler: boolean; // Show a reading guide line/bar
  
  // Preferences
  highlightColor: string;   // Default browser selection color
  
  // AI
  customAiPrompt?: string;  // User defined system instruction override
  aiModel: string;          // Selected Gemini Model ID
  aiDisplayMode: 'inline' | 'popup'; // Plan A (Inline) vs Plan B (Popup)
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export interface AIConfig {
  apiKey: string;
  model: string;
}

export interface SelectionData {
  text: string;
  cfiRange?: string; // For EPUB
}

export interface NavItem {
  id: string;
  href: string;
  label: string;
  subitems?: NavItem[];
}

export interface Annotation {
  cfiRange: string;
  text: string; // The selected text context
  note: string; // User's written note
  color: string; // e.g. 'red', 'yellow'
  style: 'highlight' | 'underline';
  tags: string[];
  date: string;
  type: 'annotation';
}

export interface BookmarkData {
  cfi: string;
  text: string;
  date: string;
  type: 'bookmark';
}

export interface BookUserData {
  id: string;
  lastCfi: string;
  progress: number; // percentage 0-1
  bookmarks: BookmarkData[];
  annotations: Annotation[];
  lastRead: number;
}

export interface ActiveInlineNote {
    id: string;      // Unique ID for the note block
    cfi?: string;    // If EPUB
    textContext: string; // The paragraph text
    aiResponse: string;  // Streamed content
    isLoading: boolean;
    domNode?: HTMLElement; // The container element in the DOM (for EPUB portal)
}