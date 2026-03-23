import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { translateText } from '../services/SarvamService';
import { translateWithGemini } from '../services/GeminiService';
import { UI_LANGUAGES, DICTIONARIES } from './translations';

const LanguageContext = createContext();

const STATIC_EN = {
  notifications: 'Notifications',
  notifMarkAllRead: 'Mark all as read',
  notifAllCaughtUp: 'All caught up!',
  notifViewDashboard: 'View Dashboard',
  navFeed: 'Feed',
  navMap: 'Map',
  navServices: 'Services',
  navDashboard: 'Dashboard',
  navProfile: 'Profile',
  reportIssue: 'Report Issue',
  feed: 'Feed',
  map: 'Map',
  services: 'Services',
  dashboard: 'Dashboard',
  profileSettings: 'Profile Settings',
  logout: 'Log out',
  login: 'Log in',
  signup: 'Sign up',
  language: 'Language',
  toggleTheme: 'Toggle theme',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeEyeComfort: 'Eye Comfort',
  infrastructure: 'Infrastructure',
  electricity: 'Electricity',
  water: 'Water',
  sanitation: 'Sanitation',
  statusReported: 'Reported'
};

const SLEEP_MS = 400; 

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => localStorage.getItem('cityspark_lang') || 'en');
  
  const [translations, setTranslations] = useState(() => {
    const saved = localStorage.getItem(`cityspark_trans_v10_${language}`);
    return saved ? JSON.parse(saved) : {};
  });
  
  const queueRef = useRef([]);
  const isProcessingRef = useRef(false);
  const loadingKeysRef = useRef(new Set());
  const currentLanguageRef = useRef(language);

  useEffect(() => {
    currentLanguageRef.current = language;
    localStorage.setItem('cityspark_lang', language);
    const saved = localStorage.getItem(`cityspark_trans_v10_${language}`);
    setTranslations(saved ? JSON.parse(saved) : {});
    queueRef.current = [];
    loadingKeysRef.current.clear();
  }, [language]);

  const processQueue = useCallback(async (targetLang) => {
    if (isProcessingRef.current || queueRef.current.length === 0) return;
    
    isProcessingRef.current = true;
    
    while (queueRef.current.length > 0) {
      if (currentLanguageRef.current !== targetLang) break;
      const key = queueRef.current.shift();
      loadingKeysRef.current.add(key);

      try {
        console.log(`[LanguageContext] Translating: "${key}" to ${targetLang}`);
        let result = await translateText(key, targetLang);
        
        const containsDevanagari = /[\u0900-\u097F]/.test(result);
        const needsScriptGuard = (targetLang === 'pa' || targetLang === 'bn') && containsDevanagari;
        const isFailure = !result || result === key;

        if (needsScriptGuard || isFailure) {
          console.warn(`[LanguageContext] Sarvam failure detected for "${key}". Falling back to Gemini...`);
          const fallback = await translateWithGemini(key, targetLang);
          if (fallback) result = fallback;
        }

        if (currentLanguageRef.current === targetLang && result && result !== key) {
          setTranslations(prev => {
            if (currentLanguageRef.current !== targetLang) return prev;
            const updated = { ...prev, [key]: result };
            localStorage.setItem(`cityspark_trans_v10_${targetLang}`, JSON.stringify(updated));
            return updated;
          });
        }
      } catch (err) {
        console.error(`[LanguageContext] Translation fail for: ${key}`, err);
        const fallback = await translateWithGemini(key, targetLang);
        if (fallback && currentLanguageRef.current === targetLang) {
          setTranslations(prev => {
            const updated = { ...prev, [key]: fallback };
            localStorage.setItem(`cityspark_trans_v10_${targetLang}`, JSON.stringify(updated));
            return updated;
          });
        }
      } finally {
        loadingKeysRef.current.delete(key);
      }
      await new Promise(resolve => setTimeout(resolve, SLEEP_MS));
    }
    
    isProcessingRef.current = false;
    if (queueRef.current.length > 0 && currentLanguageRef.current === targetLang) {
      processQueue(targetLang);
    }
  }, []);

  const t = useCallback((text) => {
    if (!text) return '';
    if (language === 'en') return STATIC_EN[text] || text;
    
    if (DICTIONARIES[language] && DICTIONARIES[language][text]) {
      return DICTIONARIES[language][text];
    }

    if (translations[text]) return translations[text];
    
    const sourceText = STATIC_EN[text] || text;
    if (/^[0-9%.,\s$+-]+$/.test(sourceText)) return sourceText;

    if (sourceText.length > 80 && /[.!?]/.test(sourceText)) {
      const sentences = sourceText.match(/[^.!?]+[.!?]*\s*/g) || [sourceText];
      if (sentences.length > 1) {
        let allTranslated = true;
        const translatedSentences = sentences.map(s => {
          const trimmed = s.trim();
          if (!trimmed) return s;
          if (translations[trimmed]) return s.replace(trimmed, translations[trimmed]);
          allTranslated = false;
          if (!loadingKeysRef.current.has(trimmed) && !queueRef.current.includes(trimmed)) {
            loadingKeysRef.current.add(trimmed);
            queueRef.current.push(trimmed);
            setTimeout(() => processQueue(language), 0);
          }
          return s;
        });
        if (allTranslated) {
          const joined = translatedSentences.join('');
          if (!translations[text]) {
            setTimeout(() => {
              setTranslations(prev => ({ ...prev, [text]: joined }));
            }, 0);
          }
          return joined;
        }
        return sourceText;
      }
    }

    if (!loadingKeysRef.current.has(text) && !queueRef.current.includes(text)) {
      loadingKeysRef.current.add(text);
      queueRef.current.push(text);
      setTimeout(() => processQueue(language), 0);
    }
    
    return sourceText;
  }, [language, translations, processQueue]);

  const value = useMemo(() => ({
    language,
    changeLanguage: setLanguage,
    t,
    languages: UI_LANGUAGES
  }), [language, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
