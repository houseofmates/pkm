import { useState } from 'react';
import { format } from 'date-fns';

interface PublicDocViewerProps {
  slug: string;
}

export function PublicDocViewer({ slug }: PublicDocViewerProps) {
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch public document
  useState(() => {
  fetch(`/api/public/doc/${slug}`)
  .then(res => {
 if (!res.ok) throw new Error('Document not found or not public');
 return res.json();
  })
  .then(data => {
 setDocument(data);
 setLoading(false);
  })
  .catch(err => {
 setError(err.message);
 setLoading(false);
  });
  });

  if (loading) {
  return (
  <div className="min-h-screen bg-background flex items-center justify-center font-varela">
 <div className="text-muted-foreground">loading...</div>
  </div>
  );
  }

  if (error || !document) {
  return (
  <div className="min-h-screen bg-background flex items-center justify-center font-varela">
 <div className="text-center">
 <h1 className="text-2xl font-bold mb-2">document not found</h1>
 <p className="text-muted-foreground">{error || 'This document does not exist or is not public.'}</p>
 </div>
  </div>
  );
  }

  const documentColor = document.color || '#8b5cf6';
  const createdDate = document.created_at ? new Date(document.created_at) : new Date();

  return (
  <div className="min-h-screen bg-background font-varela">
  {/* Banner Image */}
  {document.banner_image && (
 <div className="w-full h-64 border-b">
 <img
 src={document.banner_image}
 alt="Banner"
 className="w-full h-full object-cover"
 />
 </div>
  )}

  {/* Centered Content */}
  <div className="max-w-3xl mx-auto px-6 py-12">
 <h1
 className="text-5xl font-bold text-center mb-4 font-varela"
 style={{ color: documentColor }}
 >
 {document.title || 'Untitled'}
 </h1>

 <div className="text-center text-muted-foreground text-lg mb-8 font-varela">
 {format(createdDate, 'MMMM d, yyyy')}
 </div>

 <div className="w-24 h-0.5 bg-border mx-auto mb-12" />

 <div
 className="prose prose-lg max-w-none font-varela"
 dangerouslySetInnerHTML={{ __html: document.content || '' }}
 />
  </div>
  </div>
  );
}
