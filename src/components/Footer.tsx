import { useContent } from '@/i18n/LangContext';
import { scrollToSection } from '@/scroll/SmoothScroll';
import { mailtoLink, site } from '@/config/site';
import { Wordmark } from './Wordmark';
import { HailClock } from './HailClock';

/** Footer — continues the dark contact band. Privacy Policy link arrives with the page (Phase 4). */
export function Footer() {
  const t = useContent();
  return (
    <footer data-tone="dark" className="tone-dark relative z-20 border-t border-paper/10 bg-ink text-paper">
      <div className="shell grid-12 gap-y-12 py-[clamp(3.5rem,7vw,6rem)]">
        <div className="col-span-12 md:col-span-4">
          <a
            href={`/${t.lang}`}
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('home');
            }}
            aria-label={t.brand.name}
            className="inline-block"
          >
            <Wordmark />
          </a>
          <p className="mt-6 max-w-[22rem] text-sm leading-relaxed text-paper/55">{t.hero.tagline}</p>
        </div>

        <nav aria-label={t.ui.menu} className="col-span-6 md:col-span-3">
          <ul className="space-y-2.5">
            {t.nav.items.map((item) => (
              <li key={item.target}>
                <a
                  href={`#${item.target}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(item.target);
                  }}
                  className="text-paper/70 transition-colors duration-300 hover:text-ember"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="col-span-6 space-y-5 text-sm md:col-span-3">
          <div>
            <p className="label text-paper/40">{t.contact.labels.email}</p>
            <a href={mailtoLink()} dir="ltr" className="mt-1.5 inline-block text-paper/80 transition-colors hover:text-ember">
              {site.email}
            </a>
          </div>
          <div>
            <p className="label text-paper/40">{t.contact.labels.phone}</p>
            <p dir="ltr" className="mt-1.5 text-paper/80 rtl:text-right">
              {site.phone.display}
            </p>
          </div>
          <div>
            <p className="label text-paper/40">{t.contact.labels.location}</p>
            <p className="mt-1.5 text-paper/80">{t.contact.location}</p>
          </div>
        </div>

        <div className="col-span-12 text-sm md:col-span-2">
          <p className="label text-paper/40">{t.ui.localTime}</p>
          <HailClock className="mt-1.5 block text-paper/80" />
        </div>
      </div>
      <div className="shell flex flex-wrap items-end justify-between gap-4 border-t border-paper/10 py-6">
        <p className="text-sm text-paper/50">{t.contact.copyright}</p>
        <p className="label text-paper/30">{t.ui.earthCredit}</p>
      </div>
    </footer>
  );
}
