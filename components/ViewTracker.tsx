'use client';

/**
 * Stage 10 Part 4 — view + reading-session tracking.
 *
 * Mount this once on a page. It does two things:
 *  1. records a single page view on mount (React StrictMode mounts effects
 *     twice in development, so a module-level key guards against duplicates);
 *  2. on page leave, sends how long the reader stayed and how far they
 *     scrolled, using `navigator.sendBeacon` so the request survives the
 *     navigation.
 *
 * Reading sessions are only sent for articles (`newsId` present) and only when
 * the reader stayed at least one second, so a mis-click does not create noise.
 */
import { useEffect, useRef } from 'react';
import { trackReadingSession, trackView } from '@/lib/analytics';

/** Survives StrictMode double-mounts and client-side re-renders. */
const sentViews = new Set<string>();

export default function ViewTracker({ newsId }: { newsId?: string }) {
  const startedAt = useRef<number>(Date.now());
  const maxScroll = useRef<number>(0);
  const sessionSent = useRef<boolean>(false);

  useEffect(() => {
    const path = window.location.pathname;
    const key = `${newsId ?? 'home'}:${path}`;

    if (!sentViews.has(key)) {
      sentViews.add(key);
      trackView({
        ...(newsId === undefined ? {} : { newsId }),
        path,
        // The backend prefers the Referer header and uses this only as a
        // fallback (for example after a client-side navigation).
        ...(document.referrer.length > 0 ? { referrer: document.referrer } : {}),
      });
    }

    if (newsId === undefined) return;

    startedAt.current = Date.now();
    maxScroll.current = 0;
    sessionSent.current = false;

    const measureScroll = () => {
      // scrollable == 0 means the whole article fits on screen, so it has been
      // fully "seen" by definition.
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const depth = scrollable <= 0 ? 100 : Math.round((window.scrollY / scrollable) * 100);
      const bounded = Math.max(0, Math.min(100, depth));
      if (bounded > maxScroll.current) maxScroll.current = bounded;
    };

    const flush = () => {
      if (sessionSent.current) return;
      const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000);
      if (durationSeconds < 1) return;
      sessionSent.current = true;
      trackReadingSession({
        newsId,
        durationSeconds,
        scrollDepthPercent: maxScroll.current,
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    measureScroll();
    window.addEventListener('scroll', measureScroll, { passive: true });
    window.addEventListener('resize', measureScroll);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('scroll', measureScroll);
      window.removeEventListener('resize', measureScroll);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      // Client-side navigation away from the article also ends the session.
      flush();
    };
  }, [newsId]);

  return null;
}
