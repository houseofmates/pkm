
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { PageTransition } from '@/components/page-transition';
import { useCollections, type Collection } from '@/hooks/use-collections';
import { Button } from '@/components/ui/button';
import { CollectionView } from '@/features/collections/components/collection-view';
import { Sidebar } from '@/components/sidebar';
import { Menu } from 'lucide-react';

export function Dashboard() {
  const { logout } = useAuth();
  const { collections, loading, error, refresh } = useCollections();
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleCollectionSelect = (col: Collection) => {
  setSelectedCollection(col);
  setMobileMenuOpen(false); // Close on mobile select
  };

  const handleBack = () => {
  setSelectedCollection(null);
  };

  return (
  <div className="flex min-h-screen bg-background text-foreground">
  {/* Mobile Menu Trigger - Visible only on small screens */}
  {/* Use a Sheet/Drawer here ideally, but for MVP just toggling visibility or using a simple absolute overlay */}

  {/* Sidebar - Hidden on mobile by default (controlled via CSS classes usually, but here 'hidden md:block') */}
  <Sidebar
 className="hidden md:block h-screen sticky top-0"
 collections={collections}
 selectedCollection={selectedCollection}
 onSelect={handleCollectionSelect}
  />

  {/* Main Content */}
  <div className="flex-1 flex flex-col min-h-screen">
 <header className="border-b-2 bg-background/95 backdrop-blur z-10 sticky top-0 h-14 flex items-center justify-between px-4">
 <div className="flex items-center gap-4">
 <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
   <Menu className="h-5 w-5" />
 </Button>
 <div className="font-bold text-lg md:hidden">pkm</div>
 </div>

 <div className="flex items-center gap-2">
 {!selectedCollection && (
   <Button variant="ghost" size="sm" onClick={() => refresh()} disabled={loading}>
   {loading ? 'Refreshing...' : 'Refresh'}
   </Button>
 )}
 <Button variant="outline" size="sm" onClick={logout}>logout</Button>
 </div>
 </header>

 <main className="flex-1 p-4 md:p-6 overflow-auto">
 {selectedCollection ? (
 <PageTransition key={selectedCollection.name} className="h-full">
   <CollectionView collection={selectedCollection} onBack={handleBack} />
 </PageTransition>
 ) : (
 <PageTransition className="h-full flex flex-col">
   <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4">
   <h1 className="text-4xl font-extrabold lg:text-5xl text-primary">
   Welcome to PKM
   </h1>
   <p className="text-xl text-muted-foreground max-w-[600px]">
   Select a database from the sidebar to view records.
   </p>
   {/* Mobile: Show list if Sidebar is hidden */}
   <div className="md:hidden w-full max-w-sm text-left border rounded-lg p-4 bg-card">
   <div className="font-medium mb-2">collections ({collections.length})</div>
   <div className="space-y-1">
  {collections.map((c: Collection) => (
  <Button key={c.name} variant="ghost" className="w-full justify-start" onClick={() => handleCollectionSelect(c)}>
  {c.title || c.displayName || c.name}
  </Button>
  ))}
   </div>
   </div>
   </div>
 </PageTransition>
 )}

 {error && (
 <div className="mt-4 p-4 text-red-500 bg-red-50 rounded-md border border-red-200">
   Error: {error}
 </div>
 )}
 </main>
  </div>
  </div>
  );
}

