import { createContext, use } from 'react';
import type { Content } from '@content/types';
import { content } from '@content/index';
import { site } from '@/config/site';

export const LangContext = createContext<Content>(content[site.defaultLang]);

/** Copy for the current language. */
export const useContent = () => use(LangContext);

/** +1 in LTR, −1 in RTL — multiply horizontal motion by this to mirror it. */
export const dirSign = (dir: Content['dir']) => (dir === 'rtl' ? -1 : 1);
