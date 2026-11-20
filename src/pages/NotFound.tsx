import { Link } from 'react-router';
import { useContent } from '@/i18n/LangContext';

export default function NotFound() {
  const t = useContent();
  return (
    <main className="grid min-h-svh place-items-center px-[var(--gutter)] text-center">
      <div>
        <p className="label text-mist/50">404</p>
        <h1 className="display mt-6 text-5xl md:text-7xl">{t.ui.notFound.title}</h1>
        <Link to={`/${t.lang}`} className="label mt-10 inline-block border-b border-mist/30 pb-1 hover:border-accent hover:text-accent">
          {t.ui.notFound.back}
        </Link>
      </div>
    </main>
  );
}
