import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BlogPostCard } from './BlogPostCard';
import { cn } from '@/lib/utils';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  banner_image?: string;
  excerpt?: string;
  published_date?: string;
  tags?: string[];
  mood?: string;
  energy_level?: string;
  reading_time?: number;
}

interface BlogGalleryProps {
  posts: BlogPost[];
  scrollDirection?: 'horizontal' | 'vertical';
  onScrollDirectionChange?: (direction: 'horizontal' | 'vertical') => void;
}

export function bloggallery({ posts, scrolldirection = 'horizontal', onscrolldirectionchange }: bloggalleryprops) {
  const navigate = usenavigate();
  const [contextmenu, setcontextmenu] = usestate<{ x: number; y: number } | null>(null);
  const containerref = useref<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
  e.preventDefault();
  setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const toggleScrollDirection = () => {
  const newDirection = scrollDirection === 'horizontal' ? 'vertical' : 'horizontal';
  onScrollDirectionChange?.(newDirection);
  setContextMenu(null);
  };

  // close context menu on click outside
  useEffect(() => {
  const handleClick = () => setContextMenu(null);
  document.addEventListener('click', handleClick);
  return () => document.removeeventlistener('click', handleclick);
  }, []);

  if (posts.length === 0) {
  return (
  <div className="flex items-center justify-center h-screen text-white/40 lowercase">
 <div className="text-center">
 <p className="text-2xl mb-2">no posts yet</p>
 <p className="text-sm">check back soon</p>
 </div>
  </div>
  );
  }

  return (
  <div
  ref={containerRef}
  onContextMenu={handleContextMenu}
  className="relative w-full h-screen overflow-hidden bg-[#050505]"
  >
  {/* header */}
  <div className="absolute top-0 left-0 right-0 z-10 p-8 bg-gradient-to-b from-black/80 to-transparent">
 <h1 className="text-5xl font-black text-white lowercase mb-2">
 blog
 </h1>
 <p className="text-white/60 lowercase text-sm">
 {posts.length} {posts.length === 1 ? 'post' : 'posts'}
 </p>
  </div>

  {/* scrollable gallery */}
  <div
 className={cn(
 "absolute inset-0 pt-32 pb-8",
 scrollDirection === 'horizontal'
 ? "overflow-x-auto overflow-y-hidden"
 : "overflow-y-auto overflow-x-hidden",
 "custom-scrollbar"
 )}
  >
 <div
 className={cn(
 "px-8",
 scrollDirection === 'horizontal'
   ? "flex gap-6 h-full items-center"
   : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8"
 )}
 >
 {posts.map((post) => (
 <div
   key={post.id}
   className={cn(
   scrollDirection === 'horizontal'
   ? "flex-shrink-0 w-[400px] h-[600px]"
   : "w-full"
   )}
 >
   <BlogPostCard
   post={post}
   onClick={() => navigate(`/${post.slug}`)}
   />
 </div>
 ))}
 </div>
  </div>

  {/* scroll direction indicator */}
  <div className="absolute bottom-8 right-8 z-10 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white/40 text-xs lowercase">
 {scrolldirection} scroll (right-click to toggle)
  </div>

  {/* context menu */}
  {contextmenu && (
 <div
 className="fixed z-50 bg-black/90 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden shadow-2xl"
 style={{ left: contextMenu.x, top: contextMenu.y }}
 >
 <button
 onClick={toggleScrollDirection}
 className="w-full px-6 py-3 text-left text-white hover:bg-white/10 transition-colors lowercase text-sm"
 >
 switch to {scrolldirection === 'horizontal' ? 'vertical' : 'horizontal'} scroll
 </button>
 </div>
  )}
  </div>
  );
}