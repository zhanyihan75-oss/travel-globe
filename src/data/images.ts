// 图片清单 — 将图片放入 public/travel-images/ 后，在此添加路径
// 例如: '/travel-images/japan.jpg',

export const TRAVEL_IMAGES = [
] as const;

// 默认占位图片（unsplash 旅行主题）
export const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=600&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
  'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=600&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=80',
  'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?w=600&q=80',
  'https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?w=600&q=80',
  'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=600&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80',
  'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=600&q=80',
  'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=600&q=80',
  'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=600&q=80',
  'https://images.unsplash.com/photo-1504567961542-e24d9439a724?w=600&q=80',
  'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&q=80',
  'https://images.unsplash.com/photo-1540202404-a2f29016b523?w=600&q=80',
] as const;

export function getTravelImages(): string[] {
  if (TRAVEL_IMAGES.length > 0) {
    return [...TRAVEL_IMAGES];
  }
  return [...FALLBACK_IMAGES];
}
