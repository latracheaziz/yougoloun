import { ar } from './ar';
import { en } from './en';
import type { Content, Lang } from './types';

export const content: Record<Lang, Content> = { ar, en };
export const langs = ['ar', 'en'] as const satisfies readonly Lang[];
export const isLang = (v: unknown): v is Lang => v === 'ar' || v === 'en';

/**
 * ⚠ NOT FROM THE PDF — "they say" in many languages, whispered around the loader.
 * Non-Latin/Arabic scripts fall back to system fonts on purpose (no extra font weight).
 */
export const whispers = [
  'they say', 'يقولون', 'ils disent', 'dicen', 'dicono', 'sie sagen', 'dizem', 'diyorlar',
  'говорят', '他们说', 'कहते हैं', 'می‌گویند', 'کہتے ہیں', 'kata mereka', 'wanasema', 'λένε', 'mówią', 'zeggen ze',
];

export type { Content, Lang } from './types';
