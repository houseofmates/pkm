import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getMoodColor, getEnergyColor } from '../utils/blog-utils';

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

interface BlogPostCardProps {
  post: BlogPost;
  onClick: () => void;
}

export function blogpostcard({ post, onclick }: blogpostcardprops) {
  const [imageerror, setimageerror] = useState(false);

  return (
  <div
  onClick={onClick}
  className={cn(
 "group cursor-pointer rounded-2xl overflow-hidden",
 "bg-black/40 backdrop-blur-sm border border-white/10",
 "hover:border-[var(--primary)]/50 hover:bg-black/60",
 "transition-all duration-300 interactive-pop",
 "flex flex-col h-full"
  )}
  >
  {/* banner image */}
  {post.banner_image && !imageerror ? (
 <div className="relative w-full aspect-[16/9] overflow-hidden bg-black/20">
 <img
 src={post.banner_image}
 alt={post.title}
 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
 onError={() => setImageError(true)}
 />
 {/* gradient overlay */}
 <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
 </div>
  ) : (
 <div className="w-full aspect-[16/9] bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 flex items-center justify-center">
 <span className="text-white/20 text-4xl lowercase">no image</span>
 </div>
  )}

  {/* content */}
  <div className="p-6 flex flex-col flex-1">
 {/* title */}
 <h3 className="text-2xl font-black text-white mb-3 lowercase line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
 {post.title}
 </h3>

 {/* excerpt */}
 {post.excerpt && (
 <p className="text-white/60 text-sm leading-relaxed mb-4 line-clamp-3 flex-1">
 {post.excerpt}
 </p>
 )}

 {/* metadata footer */}
 <div className="flex flex-wrap items-center gap-3 text-xs text-white/40 mt-auto">
 {/* date */}
 {post.published_date && (
 <span className="lowercase">
   {new date(post.published_date).tolocaledatestring('en-us', {
   month: 'short',
   day: 'numeric',
   year: 'numeric'
   }).tolowercase()}
 </span>
 )}

 {/* reading time */}
 {post.reading_time && (
 <span className="lowercase">
   {post.reading_time} min read
 </span>
 )}

 {/* mood indicator */}
 {post.mood && (
 <span
   className="px-2 py-1 rounded-full text-xs font-bold lowercase"
   style={{
   backgroundColor: `${getMoodColor(post.mood)}20`,
   color: getMoodColor(post.mood),
   border: `1px solid ${getMoodColor(post.mood)}40`
   }}
 >
   {post.mood}
 </span>
 )}

 {/* energy indicator */}
 {post.energy_level && (
 <span
   className="px-2 py-1 rounded-full text-xs font-bold lowercase"
   style={{
   backgroundColor: `${getEnergyColor(post.energy_level)}20`,
   color: getEnergyColor(post.energy_level),
   border: `1px solid ${getEnergyColor(post.energy_level)}40`
   }}
 >
   {post.energy_level}
 </span>
 )}
 </div>

 {/* tags */}
 {post.tags && post.tags.length > 0 && (
 <div className="flex flex-wrap gap-2 mt-3">
 {post.tags.slice(0, 3).map((tag, idx) => (
   <span
   key={idx}
   className="px-2 py-1 rounded-md bg-white/5 text-white/50 text-xs lowercase border border-white/10"
   >
   #{tag}
   </span>
 ))}
 {post.tags.length > 3 && (
   <span className="text-white/30 text-xs">
   +{post.tags.length - 3} more
   </span>
 )}
 </div>
 )}
  </div>
  </div>
  );
}