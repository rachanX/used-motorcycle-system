'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function LanguageSwitcher({ locale }: { locale: string }) {
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: 'th' | 'en') {
    const segments = pathname.split('/');
    segments[1] = next;
    router.push(segments.join('/'));
  }

  return (
    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-sm">
      <button
        onClick={() => switchTo('th')}
        className={`px-3 py-1.5 transition-colors ${
          locale === 'th'
            ? 'bg-blue-600 text-white'
            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
        }`}
      >
        ไทย
      </button>
      <button
        onClick={() => switchTo('en')}
        className={`px-3 py-1.5 transition-colors ${
          locale === 'en'
            ? 'bg-blue-600 text-white'
            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
        }`}
      >
        EN
      </button>
    </div>
  );
}
