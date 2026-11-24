'use client';

import { useEffect, useState, type RefObject } from 'react';
import { pickCurrentSection } from '@telpen/domain';

/**
 * The menu section the person is looking at: follows scrolling, a tapped
 * link and the address #hash. Measures the page sections the menu's #links
 * point at; `pickCurrentSection` decides. Starts on `first` so the server
 * render and the first client render agree.
 */
export function useSectionFollow(navRef: RefObject<HTMLElement | null>, first: string, deps: unknown[] = []): string {
  const [current, setCurrent] = useState(first);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const ids = Array.from(nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'))
      .map((link) => decodeURIComponent(link.hash.slice(1)))
      .filter(Boolean);
    if (ids.length === 0) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const boxes = ids.flatMap((id) => {
        const el = document.getElementById(id);
        if (!el) return [];
        const rect = el.getBoundingClientRect();
        return [{ id, top: rect.top, bottom: rect.bottom }];
      });
      const doc = document.documentElement;
      const atPageEnd = window.innerHeight + window.scrollY >= doc.scrollHeight - 4;
      const picked = pickCurrentSection(boxes, { line: 120, atPageEnd, viewportHeight: window.innerHeight });
      if (picked) setCurrent(picked);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    const fromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (ids.includes(id)) setCurrent(id);
    };

    // Read the #hash and measure on the next frame (no state change during the effect itself).
    const start = window.requestAnimationFrame(() => {
      fromHash();
      schedule();
    });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', fromHash);
    return () => {
      window.cancelAnimationFrame(start);
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', fromHash);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navRef, first, ...deps]);

  return current;
}
