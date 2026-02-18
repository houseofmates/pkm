// used pure css columns instead of mui masonry for lightweight implementation
// user requested "masonry layout (like pinterest)".
// css columns are the easiest.

interface ImageGridProps {
  images?: Array<{ src: string; alt?: string; aspectRatio?: number }>;
}

// mock data
const mockImages = [
  { src: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba', alt: 'Mountain', aspectRatio: 1.5 },
  { src: 'https://images.unsplash.com/photo-1682686581854-5e71f58e7e3f', alt: 'Dessert', aspectRatio: 0.8 },
  { src: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538', alt: 'Sea', aspectRatio: 1.2 },
  { src: 'https://images.unsplash.com/photo-1682685797661-9e0c8c1848fd', alt: 'forest', aspectRatio: 0.9 },
  { src: 'https://images.unsplash.com/photo-1682687220199-d0124f48f95b', alt: 'building', aspectRatio: 1.4 },
];

export function ImageGrid({ images = mockImages }: ImageGridProps) {
  return (
  <div className="w-full p-4 border border-dashed rounded-xl bg-card/20">
  <div className="text-xs text-muted-foreground mb-4  font-bold">moodboard</div>
  <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
 {images.map((img, idx) => (
 <div key={idx} className="break-inside-avoid relative group rounded-xl shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-[1.02] isolate border border-border bg-card p-0">
 {/* inner vessel */}
 <div className="contents rounded-[inherit] overflow-hidden">
   <img
   src={img.src}
   alt={img.alt}
   className="w-full h-auto object-cover block rounded-[inherit]"
   loading="lazy"
   />
   <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[inherit]">
   <span className="text-white text-xs font-bold  border border-white/50 px-2 py-1 rounded">view</span>
   </div>
 </div>
 </div>
 ))}
  </div>
  </div>
  );
}
