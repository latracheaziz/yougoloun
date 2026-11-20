import type { Lang } from '@content/types';

/** Global site settings. Values marked TODO are placeholders. */
export const site = {
  /** Language served at `/`. */
  defaultLang: 'ar' as Lang,

  /** TODO(domain): production origin, no trailing slash — used for canonical, hreflang, OG, sitemap. */
  url: 'https://www.example.com',

  email: 'yougoloun@natheelco.com',

  /** TODO(phone): placeholder until the real number is provided. */
  phone: {
    display: '[+966 XX XXX XXXX]',
    /** International format, digits only, for wa.me / tel: links. */
    digits: '966XXXXXXXXX',
    isPlaceholder: true,
  },

  hail: {
    lat: 27.5219,
    lon: 41.6907,
    timeZone: 'Asia/Riyadh',
    coords: '27.5219° N · 41.6907° E',
  },
} as const;

/** "Book a Strategy Call" → WhatsApp with a message in the current language. */
export const whatsappLink = (message: string) =>
  `https://wa.me/${site.phone.digits}?text=${encodeURIComponent(message)}`;

export const mailtoLink = () => `mailto:${site.email}`;
