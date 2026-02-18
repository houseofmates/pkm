import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/api/nocobase-client';
import { BlogGallery } from './components/BlogGallery';
import { BlogPostViewer } from './components/BlogPostViewer';
import { toast } from 'sonner';
import { AdminLoginModal } from '@/features/houseofmates-builder/components/AdminLoginModal';

const BlogEditor = lazy(() => import('./components/BlogEditor').then(m => ({ default: m.BlogEditor })));

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  banner_image?: string;
  content?: any;
  excerpt?: string;
  published: boolean;
  published_date?: string;
  tags?: string[];
  mood?: string;
  energy_level?: string;
  content_warnings?: string[];
  author_headmate?: string;
  reading_time?: number;
  view_count?: number;
}

export function BlogBuilder() {
  const { slug } = useParams<{ slug?: string }>();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [currentPost, setCurrentPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrollDirection, setScrollDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // check auth on mount
  useEffect(() => {
  const key = localStorage.getItem('hom_api_key');
  if (key) setIsAdmin(true);
  }, []);

  // global keyboard listener for ctrl+e
  useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
  if (e.ctrlKey && e.key.toLowerCase() === 'e') {
 e.preventDefault();
 const key = localStorage.getItem('hom_api_key');
 if (key) {
 setIsAdmin(true);
 toast.info('admin mode active');
 } else {
 setShowLoginModal(true);
 }
  }
  };
  window.addEventListener('keydown', handleKeyDown);
  <style dangerouslySetInnerHTML={{
 __html: `
 body { font-family: "Varela Round", sans-serif; }
 `
  }} />
  return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogin = (key: string) => {
  localStorage.setItem('hom_api_key', key);
  setIsAdmin(true);
  setShowLoginModal(false);
  toast.success('admin mode enabled');
  };

  if (isAdmin) {
  <style dangerouslySetInnerHTML={{
 __html: `
 body { font-family: "Varela Round", sans-serif; }
 `
  }} />
  return (
  <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-[#050505] text-white">loading editor...</div>}>
 <BlogEditor />
  </Suspense>
  );
  }

  // load scroll direction preference from localstorage
  useEffect(() => {
  const saved = localStorage.getItem('blog-scroll-direction');
  if (saved === 'vertical' || saved === 'horizontal') {
  setScrollDirection(saved);
  }
  }, []);

  // save scroll direction preference
  const handleScrollDirectionChange = (direction: 'horizontal' | 'vertical') => {
  setScrollDirection(direction);
  localStorage.setItem('blog-scroll-direction', direction);
  };

  // fetch posts or individual post
  useEffect(() => {
  const fetchData = async () => {
  setLoading(true);
  try {
 if (slug) {
 // fetch individual post by slug
 const response = await api.request('blog_posts', 'list', {
 params: {
   'filter[slug][$eq]': slug,
   'filter[published][$eq]': true,
 },
 });

 if (response.data?.data && response.data.data.length > 0) {
 setCurrentPost(response.data.data[0]);
 } else {
 toast.error('post not found');
 setCurrentPost(null);
 }
 } else {
 // fetch all published posts for gallery
 const response = await api.request('blog_posts', 'list', {
 params: {
   'filter[published][$eq]': true,
   sort: '-published_date',
   pageSize: 100,
 },
 });

 if (response.data?.data) {
 setPosts(response.data.data);
 }
 }
  } catch (error) {
 console.error('[BlogBuilder] Error fetching data:', error);
 toast.error('failed to load blog posts');
  } finally {
 setLoading(false);
  }
  };

  fetchData();
  }, [slug]);

  // increment view count
  const handleViewCountUpdate = async (postId: string) => {
  try {
  const post = currentPost || posts.find(p => p.id === postId);
  if (!post) return;

  await api.request('blog_posts', 'update', {
 method: 'POST',
 params: {
 filterByTk: postId,
 },
 data: {
 view_count: (post.view_count || 0) + 1,
 },
  });
  } catch (error) {
  console.error('[BlogBuilder] Error updating view count:', error);
  }
  };

  let content;
  if (loading) {
  content = (
  <div className="h-screen flex items-center justify-center bg-[#050505] text-[var(--primary)] lowercase text-xl">
 loading blog...
  </div>
  );
  } else if (slug && currentPost) {
  content = (
  <BlogPostViewer
 post={currentPost}
 onViewCountUpdate={handleViewCountUpdate}
  />
  );
  } else {
  content = (
  <BlogGallery
 posts={posts}
 scrollDirection={scrollDirection}
 onScrollDirectionChange={handleScrollDirectionChange}
  />
  );
  }

  <style dangerouslySetInnerHTML={{
 __html: `
 body { font-family: "Varela Round", sans-serif; }
 `
  }} />
  return (
  <>
  {content}
  <AdminLoginModal
 isOpen={showLoginModal}
 onClose={() => setShowLoginModal(false)}
 onLogin={handleLogin}
  />
  </>
  );
}

export default BlogBuilder;

