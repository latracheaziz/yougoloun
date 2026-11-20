import { Link, useLocation } from 'react-router';
import { useContent } from '@/i18n/LangContext';
import { useApp } from '@/store/app';
import { scrollToSection } from '@/scroll/SmoothScroll';
import { whatsappLink } from '@/config/site';
import { Wordmark } from './Wordmark';

/**
 * Phase 1 header: wordmark, desktop menu, AR/EN switch, primary CTA.
 * Phase 4 adds hide-on-scroll, glass background, magnetic CTA and the fullscreen mobile menu.
 */
export function Header() {
  const t = useContent();
  const active = useApp((s) => s.activeSection);
  const { hash } = useLocation();
  const other = t.lang === 'ar' ? 'en' : 'ar';

  return (
    <header className="fixed inset-x-0 top-0 z-30">
      <div className="flex items-center justify-between gap-6 px-[var(--gutter)] py-5">
        <a
          href={`/${t.lang}`}
          onClick={(e) => {
            e.preventDefault();
            scrollToSection('home');
          }}
          aria-label={`${t.brand.name} — ${t.nav.items[0].label}`}
        >
          <Wordmark />
        </a>

        <nav aria-label={t.ui.menu} className="hidden xl:block">
          <ul className="flex items-center gap-7">
            {t.nav.items.slice(1).map((item) => (
              <li key={item.target}>
                <a
                  href={`#${item.target}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(item.target);
                  }}
                  aria-current={active === item.target ? 'true' : undefined}
                  className="label text-sand/60 transition-colors duration-500 hover:text-sand aria-[current]:text-sand"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to={`/${other}${hash}`}
            hrefLang={other}
            lang={other}
            aria-label={t.ui.switchLang.ariaLabel}
            className="label grid size-11 place-items-center rounded-full border border-sand/20 text-sand/80 transition-colors duration-500 hover:border-sand hover:text-sand"
          >
            {t.ui.switchLang.short}
          </Link>
          <a href={whatsappLink(t.ui.whatsappMessage)} target="_blank" rel="noopener noreferrer" className="btn btn-primary max-sm:hidden">
            {t.nav.cta.short}
          </a>
        </div>
      </div>
    </header>
  );
}
