
import { BookUserData, ReaderSettings } from '../types';

const STORAGE_KEYS = {
    DATA: 'lumina_reader_data',
    SETTINGS: 'lumina_global_settings'
};

// --- Book Data (Progress, Annotations) ---

export const saveUserData = (bookId: string, data: Partial<BookUserData>) => {
  try {
    const store = JSON.parse(localStorage.getItem(STORAGE_KEYS.DATA) || '{}');
    store[bookId] = { 
        ...store[bookId], 
        ...data, 
        id: bookId, 
        lastRead: Date.now() 
    };
    localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(store));
  } catch (e) {
    console.error("Save failed", e);
  }
};

export const loadUserData = (bookId: string): Partial<BookUserData> | null => {
  try {
    const store = JSON.parse(localStorage.getItem(STORAGE_KEYS.DATA) || '{}');
    return store[bookId] || null;
  } catch (e) {
    console.error("Load failed", e);
    return null;
  }
};

export const getAllUserData = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.DATA) || '{}');
    } catch (e) {
        return {};
    }
}

// --- Global Settings ---

const DEFAULT_SETTINGS: ReaderSettings = {
    theme: 'light',
    fontSize: 18,
    fontFamily: 'serif',
    lineHeight: 1.6,
    letterSpacing: 0,
    paragraphSpacing: 10,
    marginX: 10, // 10%
    
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
    
    highlightColor: '#fde047', // yellow
    customAiPrompt: '',
    aiModel: 'gemini-2.5-flash'
};

export const saveGlobalSettings = (settings: ReaderSettings) => {
    try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
        console.error("Failed to save settings", e);
    }
};

export const loadGlobalSettings = (): ReaderSettings => {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (!saved) return DEFAULT_SETTINGS;
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
        return DEFAULT_SETTINGS;
    }
};