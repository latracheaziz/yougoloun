import { useLayoutEffect } from 'react';
import { Outlet, useParams } from 'react-router';
import { content, isLang } from '@content/index';
import { site } from '@/config/site';
import { useApp } from '@/store/app';
import { LangContext } from './LangContext';
import { Head } from '@/seo/Head';
import NotFound from '@/pages/NotFound';

/** /:lang — validates the language, sets <html lang dir>, provides the copy. */
export function LangLayout() {
  const params = useParams();
  const valid = isLang(params.lang);
  const t = content[valid ? (params.lang as keyof typeof content) : site.defaultLang];

  useLayoutEffect(() => {
    const html = document.documentElement;
    html.lang = t.lang;
    html.dir = t.dir;
    useApp.getState().setLang(t.lang, t.dir);
  }, [t]);

  return (
    <LangContext value={t}>
      <Head />
      {valid ? <Outlet /> : <NotFound />}
    </LangContext>
  );
}
