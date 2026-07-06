import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface TargetCursorProps {
  spinDuration?: number;
  hideDefaultCursor?: boolean;
  hoverDuration?: number;
  cursorColor?: string;
  cursorColorOnTarget?: string;
  isHoveringCountry?: boolean;
}

export default function TargetCursor({
  spinDuration: _spinDuration,
  hideDefaultCursor = true,
  hoverDuration = 0.2,
  cursorColor = '#6aeaff',
  cursorColorOnTarget,
  isHoveringCountry = false,
}: TargetCursorProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const cornersRef = useRef<(HTMLDivElement | null)[]>([]);
  const animatingRef = useRef(false);
  const prevHoverRef = useRef(false);
  const isMobileRef = useRef(false);

  useEffect(() => {
    isMobileRef.current = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  useEffect(() => {
    if (isMobileRef.current) return;
    if (hideDefaultCursor) document.body.style.cursor = 'none';
    return () => { document.body.style.cursor = ''; };
  }, [hideDefaultCursor]);

  useEffect(() => {
    if (isMobileRef.current || !wrapperRef.current) return;
    const cursor = wrapperRef.current;
    gsap.set(cursor, { xPercent: -50, yPercent: -50 });
    const onMove = (e: MouseEvent) => {
      gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.15, ease: 'power2.out', overwrite: 'auto' });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => {
    if (isMobileRef.current) return;
    if (animatingRef.current) return;
    if (prevHoverRef.current === isHoveringCountry) return;
    prevHoverRef.current = isHoveringCountry;
    animatingRef.current = true;
    const tl = gsap.timeline({
      onComplete: () => { animatingRef.current = false; },
    });
    const expandDirs = [['-200%','-200%'],['100%','-200%'],['100%','100%'],['-200%','100%']];
    const restDirs = [['-150%','-150%'],['50%','-150%'],['50%','50%'],['-150%','50%']];
    const dirs = isHoveringCountry ? expandDirs : restDirs;
    cornersRef.current.forEach((corner, i) => {
      if (!corner) return;
      const tx = dirs[i][0];
      const ty = dirs[i][1];
      tl.to(corner, { css: { transform: 'translate(' + tx + ', ' + ty + ')' }, duration: hoverDuration, ease: 'power2.out' }, 0);
    });
    if (dotRef.current) {
      tl.to(dotRef.current, { scale: isHoveringCountry ? 1.2 : 1, duration: hoverDuration, ease: 'power2.out' }, 0);
    }
    const tc = isHoveringCountry ? (cursorColorOnTarget || cursorColor) : cursorColor;
    if (dotRef.current) {
      tl.to(dotRef.current, { backgroundColor: isHoveringCountry ? tc : '#fff', borderColor: tc, duration: hoverDuration }, 0);
    }
    cornersRef.current.forEach((c) => {
      if (c) tl.to(c, { borderColor: tc, duration: hoverDuration }, 0);
    });
    // Return undefined destructor to satisfy EffectCallback
    return () => { tl.kill(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHoveringCountry, hoverDuration, cursorColor, cursorColorOnTarget]);

  if (isMobileRef.current) return null;
  return (
    <div ref={wrapperRef} className="target-cursor-wrapper">
      <div ref={dotRef} className="target-cursor-dot" />
      {['tl', 'tr', 'br', 'bl'].map((p, i) => (
        <div key={p} ref={(el) => { if (el) cornersRef.current[i] = el; }} className={'target-cursor-corner corner-' + p} />
      ))}
    </div>
  );
}
