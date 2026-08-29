// Global language context — controls EN/MR toggle across the whole app.
// Import useLang() in any component to read/switch the language.
import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Lang = 'en' | 'mr';

interface LangContextType {
  lang: Lang;
  toggle: () => void;
}

const LangContext = createContext<LangContextType>({ lang: 'en', toggle: () => {} });

export const LangProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>('en');
  const toggle = () => setLang(l => (l === 'en' ? 'mr' : 'en'));
  return <LangContext.Provider value={{ lang, toggle }}>{children}</LangContext.Provider>;
};

export const useLang = () => useContext(LangContext);
