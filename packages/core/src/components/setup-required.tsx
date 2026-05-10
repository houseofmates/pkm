import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Terminal, Copy } from 'lucide-react';
import { toast } from 'sonner';

export function SetupRequired() {
  const copyCommand = () => {
  navigator.clipboard.writeText('cp .env.example .env');
  toast.success('command copied to clipboard');
  };

  return (
  <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-varela">
  <Card className="max-w-md w-full border-muted/20 bg-muted/5 backdrop-blur-xl">
 <CardHeader className="text-center space-y-2">
 <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-2">
 <AlertCircle className="w-6 h-6 text-amber-500" />
 </div>
 <CardTitle className="text-2xl lowercase font-bold ">
 setup required
 </CardTitle>
 <CardDescription className="lowercase text-muted-foreground">
 your pkm instance needs a little configuration before it can fly.
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-6">
 <div className="space-y-4">
 <p className="text-sm lowercase leading-relaxed text-muted-foreground">
   this screen appears when the backend isn't reachable or hasn't been configured
   correctly. if you've just logged out you can safely <strong>reload</strong> to return
   to the login page. otherwise check that your API/sharing URLs are correct in the
   <code className="text-amber-500">.env</code> file (it may already exist) or that the
   server is running. once you've fixed the issue, restart the application.
 </p>

 <div className="relative group">
   <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 to-amber-500/0 rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-1000"></div>
   <div className="relative p-4 bg-black/40 rounded-lg border border-muted/20 flex items-center justify-between font-mono text-xs">
   <div className="flex items-center gap-3">
   <Terminal className="w-4 h-4 text-muted-foreground" />
   <span className="text-amber-200/70">cp .env.example .env</span>
   </div>
   <Button
   variant="ghost"
   size="icon"
   onClick={copyCommand}
   className="h-8 w-8 hover:bg-white/5"
   >
   <Copy className="w-4 h-4" />
   </Button>
   </div>
 </div>

 <ul className="space-y-2 text-xs lowercase text-muted-foreground list-disc pl-4 italic">
   <li>if you don't already have one, copy the example file using the command above</li>
   <li>open <code className="text-white/80">.env</code> in your editor</li>
   <li>verify the <code>VITE_API_URL</code> and <code>VITE_SHARING_URL</code> values</li>
   <li>restart the application or start the backend server</li>
 </ul>
 </div>

 <Button
 className="w-full bg-white text-black hover:bg-white/90 lowercase font-semibold"
 onClick={() => window.location.reload()}
 >
 i've done it, let's go
 </Button>
 </CardContent>
  </Card>
  </div>
  );
}
