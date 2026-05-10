
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function DebugCornersPage() {
  return (
  <div className="min-h-screen bg-black text-white p-20 space-y-20">
  <h1 className="text-3xl font-bold mb-10">forensic corner audit</h1>

  <section className="space-y-4">
 <h2 className="text-xl text-yellow-500 font-mono">test 1: the user control (nuclear option)</h2>
 <div className="rounded-xl bg-zinc-900 p-6 border border-zinc-700 w-[600px] h-[400px]">
 <p className="text-white">test content (control)</p>
 </div>
  </section>

  <section className="space-y-4">
 <h2 className="text-xl text-red-500 font-mono">test 2: database widget replica</h2>
 {/* replicating the exact structure of databasewidget from src/features/databases/components/database-widget.tsx */}
 {/* uses inline styles to match what we assume the component renders */}
 <Card className={cn("w-[600px] h-[400px] flex flex-col shadow-lg border-2 border-zinc-700/50 rounded-xl overflow-hidden isolate bg-card")}>
 <CardHeader
 className="p-3 border-b flex flex-row items-center justify-between space-y-0 bg-zinc-800/20 handle cursor-move rounded-t-[inherit]"
 >
 <div className="flex items-center gap-2">
   <CardTitle className="text-sm font-bold lowercase flex items-center gap-2">
   bookmarks
   <span className="text-muted-foreground opacity-50 font-normal">/ gallery</span>
   </CardTitle>
 </div>
 </CardHeader>
 <CardContent className="p-0 flex-1 overflow-hidden relative bg-background rounded-b-[inherit]">
 <div className="w-full h-full flex items-center justify-center text-muted-foreground">
   content area (should be clipped)
 </div>
 </CardContent>
 </Card>
  </section>

  <section className="space-y-4">
 <h2 className="text-xl text-blue-500 font-mono">test 3: dashboard grid outline replica</h2>
 {/* replicating the dashboard grid wrapper + outline */}
 <div className="relative w-[600px] h-[400px] bg-transparent">
 {/* the widget */}
 <Card className={cn("w-full h-full flex flex-col shadow-lg border-2 border-zinc-700/50 rounded-xl overflow-hidden isolate bg-card")}>
 <CardHeader className="p-3 border-b rounded-t-[inherit] bg-zinc-800/20"><span className='font-bold'>widget</span></CardHeader>
 <CardContent className="flex-1 bg-black rounded-b-[inherit]">content</CardContent>
 </Card>

 {/* the selection outline (sibling) */}
 <div className="absolute inset-0 border-2 border-primary z-50 pointer-events-none rounded-xl" />
 </div>
  </section>
  </div>
  );
}
