import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useContent } from '@/i18n/LangContext';
import { useApp } from '@/store/app';
import { getLenis, scrollToSection } from '@/scroll/SmoothScroll';
import { whatsappLink } from '@/config/site';
import { Magnetic } from '@/interaction/Magnetic';
import { Wordmark } from './Wordmark';

/**
 * Header that stays readable everywhere: its tone (light text over space, dark text over clouds
 * and paper) follows whatever is under it ([data-tone] on stages and sections), it gains a glass
 * background once scrolled, hides while scrolling down and returns on scroll up.
 */
export function Header() {
  const t = useContent();
  const active = useApp((s) => s.activeSection);
  const { hash } = useLocation();
  const other = t.lang === 'ar' ? 'en' : 'ar';
  const header = useRef<HTMLElement>(null);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const el = header.current;
    if (!el) return;
    let lastY = window.scrollY;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      // tone: probe what sits under the header's middle line
      const probeY = el.offsetHeight / 2;
      const stack = document.elementsFromPoint(window.innerWidth / 2, probeY);
      const under = stack.find((node) => !el.contains(node) && node.closest('[data-tone]'));
      const tone = under?.closest<HTMLElement>('[data-tone]')?.dataset.tone ?? 'dark';
      if (el.dataset.tone !== tone) el.dataset.tone = tone;
      el.toggleAttribute('data-scrolled', y > 24);
      const goingDown = y > lastY + 4;
      const goingUp = y < lastY - 4;
      if (goingDown && y > 240) el.setAttribute('data-hidden', '');
      else if (goingUp || y < 240) el.removeAttribute('data-hidden');
      lastY = y;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // mobile menu: lock scroll, Escape closes
  useEffect(() => {
    if (!menu) return;
    const lenis = getLenis();
    lenis?.stop();
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('keydown', onKey);
    return () => {
      lenis?.start();
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const go = (target: string) => {
    setMenu(false);
    requestAnimationFrame(() => scrollToSection(target));
  };

  return (
    <>
      <header ref={header} className="site-header fixed inset-x-0 top-0 z-30" data-tone="dark">
        <div aria-hidden="true" className="glass absolute inset-0 border-b border-current/10" />
        <div className="relative flex items-center justify-between gap-6 px-[var(--gutter)] py-4">
          <a
            href={`/${t.lang}`}
            onClick={(e) => {
              e.preventDefault();
              go('home');
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
                      go(item.target);
                    }}
                    aria-current={active === item.target ? 'true' : undefined}
                    className="label relative opacity-65 transition-opacity duration-300 after:absolute after:inset-x-0 after:-bottom-1.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-500 hover:opacity-100 hover:after:scale-x-100 aria-[current]:opacity-100 aria-[current]:after:scale-x-100 rtl:after:origin-right"
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
              className="label grid size-11 place-items-center rounded-full border border-current/25 transition-colors duration-300 hover:border-current"
            >
              {t.ui.switchLang.short}
            </Link>
            <Magnetic className="max-sm:hidden">
              <a href={whatsappLink(t.ui.whatsappMessage)} target="_blank" rel="noopener noreferrer" data-cursor="talk" className="btn btn-primary">
                {t.nav.cta.short}
              </a>
            </Magnetic>
            <button
              type="button"
              className="grid size-11 place-items-center rounded-full border border-current/25 xl:hidden"
              aria-expanded={menu}
              aria-controls="mobile-menu"
              aria-label={menu ? t.ui.close : t.ui.menu}
              onClick={() => setMenu((m) => !m)}
            >
              <span aria-hidden="true" className="relative block h-2.5 w-4">
                <span className={`absolute inset-x-0 top-0 h-px bg-current transition-transform duration-500 ${menu ? 'translate-y-[5px] rotate-45' : ''}`} />
                <span className={`absolute inset-x-0 bottom-0 h-px bg-current transition-transform duration-500 ${menu ? '-translate-y-[4px] -rotate-45' : ''}`} />
              </span>
            </button>
          </div>
        </div>
      </header>

      <div
        id="mobile-menu"
        className={`light fixed inset-0 z-[29] flex flex-col justify-between bg-paper px-[var(--gutter)] pt-28 pb-10 transition-[clip-path] duration-700 ease-[var(--ease-in-out-quart)] xl:hidden ${menu ? '[clip-path:inset(0_0_0_0)]' : 'pointer-events-none [clip-path:inset(0_0_100%_0)]'}`}
        inert={!menu}
      >
        <nav aria-label={t.ui.menu}>
          <ul className="border-t hairline">
            {t.nav.items.map((item, i) => (
              <li key={item.target} className="border-b hairline">
                <a
                  href={`#${item.target}`}
                  onClick={(e) => {
                    e.preventDefault();
                    go(item.target);
                  }}
                  className="flex items-baseline justify-between py-4 font-display text-[clamp(1.75rem,8vw,2.75rem)] font-semibold"
                  style={{ transition: `transform 0.8s var(--ease-out-expo) ${menu ? i * 0.04 + 0.15 : 0}s, opacity 0.6s ${menu ? i * 0.04 + 0.15 : 0}s`, transform: menu ? 'none' : 'translateY(24px)', opacity: menu ? 1 : 0 }}
                >
                  {item.label}
                  <span lang="en" className="font-mono text-xs muted">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <a href={whatsappLink(t.ui.whatsappMessage)} target="_blank" rel="noopener noreferrer" className="btn btn-brand justify-center">
          {t.nav.cta.long}
        </a>
      </div>
    </>
  );
}
