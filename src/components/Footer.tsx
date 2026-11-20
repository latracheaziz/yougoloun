import { Link } from 'react-router';
import { useContent } from '@/i18n/LangContext';
import { mailtoLink, site } from '@/config/site';
import { Wordmark } from './Wordmark';

/** Phase 1 footer (contact details + copyright). Phase 3/4 add the menu, Hail clock and Privacy link. */
export function Footer() {
  const t = useContent();
  return (
    <footer className="relative z-20 border-t border-sand/10 bg-night px-[var(--gutter)] pt-16 pb-10">
      <div className="grid gap-12 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <Link to={`/${t.lang}`} aria-label={t.brand.name}>
          <Wordmark />
        </Link>
        <div>
          <p className="label text-sand/45">{t.contact.labels.email}</p>
          <a href={mailtoLink()} dir="ltr" className="mt-3 inline-block text-sand/85 hover:text-ember">
            {site.email}
          </a>
        </div>
        <div>
          <p className="label text-sand/45">{t.contact.labels.phone}</p>
          <p dir="ltr" className="mt-3 text-sand/85 rtl:text-right">
            {site.phone.display}
          </p>
        </div>
        <div>
          <p className="label text-sand/45">{t.contact.labels.location}</p>
          <p className="mt-3 text-sand/85">{t.contact.location}</p>
        </div>
      </div>
      <div className="mt-16 flex flex-wrap items-end justify-between gap-4 border-t border-sand/10 pt-6">
        <p className="text-sm text-sand/50">{t.contact.copyright}</p>
        <p className="label text-sand/35">{t.ui.earthCredit}</p>
      </div>
    </footer>
  );
}
