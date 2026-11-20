import { useContent } from '@/i18n/LangContext';
import { SectionMark } from '@/components/SectionMark';

/** PDF §3 — over the globe turning to the Gulf (arcs + "they say" words are in the 3D). */
export function About() {
  const t = useContent();
  return (
    <section id="about" data-stage="about" data-tone="dark" aria-labelledby="about-title" className="stage flex items-end px-[var(--gutter)] pb-[clamp(5rem,13vh,9rem)]">
      <div className="max-w-[40rem]">
        <SectionMark n={2} label={t.about.label} />
        <h2 id="about-title" className="display mt-5 text-[clamp(2.4rem,5.6vw,5.25rem)]">
          {t.about.title}
        </h2>
        <p className="mt-6 max-w-[34rem] text-[clamp(1rem,1.15vw,1.15rem)] leading-relaxed text-mist/78">{t.about.body}</p>
      </div>
    </section>
  );
}
