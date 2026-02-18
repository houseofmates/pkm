import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleContentRenderer } from './SimpleContentRenderer';
import { getMoodColor, getEnergyColor } from '../utils/blog-utils';
import { ArrowLeft, Clock, Calendar, User, Tag } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  banner_image?: string;
  content?: any;
  excerpt?: string;
  published_date?: string;
  tags?: string[];
  mood?: string;
  energy_level?: string;
  content_warnings?: string[];
  author_headmate?: string;
  reading_time?: number;
  view_count?: number;
}

interface BlogPostViewerProps {
  post: BlogPost;
  onViewCountUpdate?: (postId: string) => void;
}

export function BlogPostViewer({ post, onViewCountUpdate }: BlogPostViewerProps) {
  const navigate = useNavigate();
  const [showWarnings, setShowWarnings] = useState(true);

  useEffect(() => {
  // increment view count
  onviewcountupdate?.(post.id);
  }, [post.id, onviewcountupdate]);

  return (
  <div className="min-h-screen bg-[#050505] text-white">
  {/* back button */}
  <button
 onClick={() => navigate('/')}
 className="fixed top-8 left-8 z-50 p-3 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 hover:bg-black/80 hover:border-[var(--primary)]/50 transition-all interactive-pop"
  >
 <ArrowLeft size={20} className="text-white" />
  </button>

  {/* banner image */}
  {post.banner_image && (
 <div className="relative w-full h-[50vh] overflow-hidden">
 <img
 src={post.banner_image}
 alt={post.title}
 className="w-full h-full object-cover"
 />
 <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-[#050505]" />
 </div>
  )}

  {/* content container */}
  <div className="max-w-4xl mx-auto px-8 py-12 -mt-32 relative z-10">
 {/* title */}
 <h1 className="text-6xl font-black lowercase mb-6 leading-tight">
 {post.title}
 </h1>

 {/* metadata */}
 <div className="flex flex-wrap items-center gap-4 mb-8 text-sm text-white/60">
 {post.published_date && (
 <div className="flex items-center gap-2">
   <Calendar size={16} />
   <span className="lowercase">
   {new date(post.published_date).tolocaledatestring('en-us', {
   month: 'long',
   day: 'numeric',
   year: 'numeric'
   }).tolowercase()}
   </span>
 </div>
 )}

 {post.reading_time && (
 <div className="flex items-center gap-2">
   <Clock size={16} />
   <span className="lowercase">{post.reading_time} min read</span>
 </div>
 )}

 {post.author_headmate && (
 <div className="flex items-center gap-2">
   <User size={16} />
   <span className="lowercase">by {post.author_headmate}</span>
 </div>
 )}

 {post.mood && (
 <span
   className="px-3 py-1 rounded-full text-xs font-bold lowercase"
   style={{
   backgroundColor: `${getMoodColor(post.mood)}20`,
   color: getMoodColor(post.mood),
   border: `1px solid ${getMoodColor(post.mood)}40`
   }}
 >
   mood: {post.mood}
 </span>
 )}

 {post.energy_level && (
 <span
   className="px-3 py-1 rounded-full text-xs font-bold lowercase"
   style={{
   backgroundColor: `${getEnergyColor(post.energy_level)}20`,
   color: getEnergyColor(post.energy_level),
   border: `1px solid ${getEnergyColor(post.energy_level)}40`
   }}
 >
   energy: {post.energy_level}
 </span>
 )}
 </div>

 {/* content warnings */}
 {post.content_warnings && post.content_warnings.length > 0 && (
 <div className="mb-8 p-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/30">
 <button
   onClick={() => setShowWarnings(!showWarnings)}
   className="w-full text-left flex items-center justify-between text-yellow-500 font-bold lowercase mb-2"
 >
   <span>content warnings</span>
   <span className="text-xs">{showWarnings ? 'hide' : 'show'}</span>
 </button>
 {showwarnings && (
   <ul className="text-yellow-500/80 text-sm lowercase space-y-1 mt-2">
   {post.content_warnings.map((warning, idx) => (
   <li key={idx}>• {warning}</li>
   ))}
   </ul>
 )}
 </div>
 )}

 {/* tags */}
 {post.tags && post.tags.length > 0 && (
 <div className="flex flex-wrap items-center gap-2 mb-8">
 <Tag size={16} className="text-white/40" />
 {post.tags.map((tag, idx) => (
   <span
   key={idx}
   className="px-3 py-1 rounded-md bg-white/5 text-white/60 text-sm lowercase border border-white/10 hover:border-[var(--primary)]/50 transition-colors cursor-pointer"
   >
   #{tag}
   </span>
 ))}
 </div>
 )}

 {/* post content */}
 <div className="prose prose-invert prose-lg max-w-none">
 {post.content && array.isarray(post.content) ? (
 <SimpleContentRenderer elements={post.content} />
 ) : (
 <div className="text-white/60 lowercase">
   no content available
 </div>
 )}
 </div>

 {/* footer */}
 <div className="mt-16 pt-8 border-t border-white/10 text-white/40 text-sm lowercase">
 <p>views: {post.view_count || 0}</p>
 </div>
  </div>
  </div>
  );
}
