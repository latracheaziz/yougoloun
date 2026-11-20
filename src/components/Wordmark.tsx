import { useContent } from '@/i18n/LangContext';

/** Typeset placeholder until the official logo is supplied: يقولون + YOUGOLOUN, ember dot = Hail. */
export function Wordmark() {
  const t = useContent();
  return (
    <span className="flex items-center gap-3">
      <span aria-hidden="true" className="relative grid size-8 place-items-center rounded-full border border-sand/40">
        <span className="absolute size-1.5 rounded-full bg-ember" style={{ insetInlineStart: '58%', top: '34%' }} />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.05rem] font-semibold tracking-tight">{t.brand.name}</span>
        <span lang={t.lang === 'ar' ? 'en' : 'ar'} className="label mt-1 text-[0.6rem] text-sand/50">
          {t.brand.nameAlt}
        </span>
      </span>
    </span>
  );
}
