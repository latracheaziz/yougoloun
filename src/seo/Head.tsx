import { useLocation } from 'react-router';
import { useContent } from '@/i18n/LangContext';
import { site } from '@/config/site';
import { langs } from '@content/index';

/**
 * Per-language <head> tags (React 19 hoists these into <head>).
 * Phase 5 adds prerendered static HTML, Open Graph images and JSON-LD.
 */
export function Head() {
  const t = useContent();
  const { pathname } = useLocation();
  const rest = pathname.replace(/^\/(ar|en)(?=\/|$)/, '');
  const url = (lang: string) => `${site.url}/${lang}${rest}`;

  return (
    <>
      <title>{t.seo.title}</title>
      <meta name="description" content={t.seo.description} />
      <link rel="canonical" href={url(t.lang)} />
      {langs.map((l) => (
        <link key={l} rel="alternate" hrefLang={l} href={url(l)} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={url(site.defaultLang)} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={t.seo.title} />
      <meta property="og:description" content={t.seo.description} />
      <meta property="og:url" content={url(t.lang)} />
      <meta property="og:locale" content={t.seo.ogLocale} />
      <meta property="og:site_name" content="YOUGOLOUN (يقولون)" />
    </>
  );
}
