import { useEffect, useRef, useMemo, useCallback } from 'react';
import gsap from 'gsap';
import { getTravelImages } from '../data/images';
import './BackgroundGallery.css';

const TILE_COUNT = 20;
const CURVE_DEPTH = 180; // 凹陷深度(px)，越大越凹

export default function BackgroundGallery() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tilesRef = useRef<HTMLDivElement[]>([]);
  const isMobileRef = useRef(false);
  const allImages = useMemo(() => getTravelImages(), []);

  useEffect(() => {
    isMobileRef.current = window.innerWidth < 768;
  }, []);

  const buildTiles = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.querySelectorAll('.bg-tile').forEach((el) => el.remove());
    tilesRef.current = [];

    const w = window.innerWidth;
    const h = window.innerHeight;
    const cols = isMobileRef.current ? 3 : 5;
    const rows = isMobileRef.current ? 3 : 5;
    const cellW = w / cols;
    const cellH = h / rows;
    const gap = 8;
    const maxTiles = isMobileRef.current ? 9 : TILE_COUNT;

    // 凹面中心点
    const cx = w / 2;
    const cy = h / 2;

    let imgIdx = 0;
    let count = 0;
    for (let r = 0; r < rows && count < maxTiles; r++) {
      for (let c = 0; c < cols && count < maxTiles; c++) {
        const tileW = cellW - gap;
        const tileH = cellH - gap;

        // 格子中心
        const tileCx = c * cellW + cellW / 2;
        const tileCy = r * cellH + cellH / 2;

        // 归一化距离 (0=中心, 1=边缘)
        const dx = (tileCx - cx) / cx;
        const dy = (tileCy - cy) / cy;
        const distRatio = Math.sqrt(dx * dx + dy * dy) / 1.5;
        const clampedDist = Math.min(Math.max(distRatio, 0), 1);

        // Z 轴深度：抛物线凹面
        const z = -CURVE_DEPTH * clampedDist * clampedDist;

        const scale = 1 - clampedDist * 0.25;
        const brightness = 0.5 + clampedDist * 0.5;
        const shadowBlur = 6 + clampedDist * 12;
        const shadowSpread = 16 + clampedDist * 24;
        const shadowAlpha = (0.15 + clampedDist * 0.3).toFixed(2);

        const tile = document.createElement('div');
        tile.className = 'bg-tile';
        tile.style.width = (tileW * scale) + 'px';
        tile.style.height = (tileH * scale) + 'px';
        // 用 translate3d 定位 + 深度
        tile.style.transform = `translate3d(${tileCx - (tileW * scale) / 2}px, ${tileCy - (tileH * scale) / 2}px, ${z}px) scale(${scale.toFixed(3)})`;
        tile.style.filter = 'brightness(' + brightness.toFixed(2) + ')';
        tile.style.boxShadow = '0 ' + shadowBlur + 'px ' + shadowSpread + 'px rgba(0, 0, 0, ' + shadowAlpha + ')';
        tile.style.opacity = '0';

        const img = document.createElement('img');
        img.src = allImages[imgIdx % allImages.length];
        img.alt = '';
        img.loading = 'lazy';
        img.className = 'bg-tile-img';
        tile.appendChild(img);
        container.appendChild(tile);
        tilesRef.current[count] = tile as unknown as HTMLDivElement;

        // GSAP 只控制 opacity 和 scale（不碰 transform，避免冲突）
        gsap.to(tile, {
          opacity: 1,
          duration: 0.5,
          delay: count * 0.04,
          ease: 'power2.out',
        });

        imgIdx++;
        count++;
      }
    }
  }, [allImages]);

  useEffect(() => {
    buildTiles();
    window.addEventListener('resize', buildTiles);
    return () => window.removeEventListener('resize', buildTiles);
  }, [buildTiles]);

  useEffect(() => {
    if (isMobileRef.current) return;
    const tiles = tilesRef.current.filter(Boolean);
    if (tiles.length === 0) return;
    tiles.forEach((tile, i) => {
      const imgEl = tile.querySelector('img');
      if (!imgEl) return;
      const interval = 10 + (i % 5) * 3;
      let idx = i;
      const cycle = () => {
        idx = (idx + 1) % allImages.length;
        gsap.to(imgEl, {
          opacity: 0,
          duration: 1,
          ease: 'power2.inOut',
          onComplete: () => {
            imgEl.src = allImages[idx];
            gsap.to(imgEl, { opacity: 1, duration: 1, ease: 'power2.inOut' });
          },
        });
      };
      const id = setInterval(cycle, interval * 1000);
      tile.dataset.intervalId = String(id);
    });
    return () => {
      tiles.forEach((tile) => {
        if (tile.dataset.intervalId) {
          clearInterval(parseInt(tile.dataset.intervalId));
        }
      });
    };
  }, [allImages]);

  return <div ref={containerRef} className="bg-gallery" />;
}

