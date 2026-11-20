import { useEffect, useState } from 'react';
import { site } from '@/config/site';

const format = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: site.hail.timeZone });

/** Live local time in Hail (Asia/Riyadh), Western digits in both languages. */
export function HailClock({ className = '' }: { className?: string }) {
  const [now, setNow] = useState(() => format.format(new Date()));
  useEffect(() => {
    const id = window.setInterval(() => setNow(format.format(new Date())), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <time lang="en" dir="ltr" className={`font-mono tabular-nums ${className}`} suppressHydrationWarning>
      {now} <span className="opacity-50">GMT+3</span>
    </time>
  );
}
