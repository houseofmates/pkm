import { useEffect, useState } from 'react';
import { useFronter } from '@/contexts/fronter-context';
import { SimplyPluralClient } from '@/lib/simply-plural-client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Target } from 'lucide-react';
import { storageManager } from '@/lib/storage-manager';
import { secureLogger } from '@/lib/secure-logger';

export function IdentityGroundingWidget({ className }: { className?: string }) {
  const { activeFronters, memberColors } = useFronter();
  const [fronterName, setFronterName] = useState<string>('system');
  const [primaryColor, setPrimaryColor] = useState<string>('');

  useEffect(() => {
  const loadFronterInfo = async () => {
  if (activeFronters.length > 0) {
 const id = activeFronters[0];
 if (memberColors[id]) setPrimaryColor(memberColors[id]);

 try {
 const apiKey = storageManager.getItem('pk_api_key');
 if (apiKey) {
 const res = await fetch(SimplyPluralClient.url(`/members/${id}`), {
   headers: { 'Authorization': apiKey }
 });
 const data = await res.json();
 if (data && data.content) {
   setFronterName(data.content.name);
   if (data.content.color) {
   setPrimaryColor(data.content.color);
   document.documentElement.style.setProperty('--primary-fronter', `#${data.content.color}`);
   }
 }
 }
 } catch (e) {
 secureLogger.error("Failed to fetch fronter info", e);
 }
  } else {
 setFronterName('System');
 setPrimaryColor('');
 document.documentElement.style.removeProperty('--primary-fronter');
  }
  };

  loadFronterInfo();
  }, [activeFronters, memberColors]);

  if (activeFronters.length === 0) return null;

  return (
  <div
  className={cn(
 "rounded-lg border p-4 shadow-sm transition-all duration-500",
 className
  )}
  style={{
 borderColor: primaryColor ? `#${primaryColor}` : 'var(--border)',
 backgroundColor: primaryColor ? `#${primaryColor}10` : 'transparent'
  }}
  >
  <div className="flex items-center gap-3 mb-2">
 <div
 className="w-3 h-3 rounded-full animate-pulse"
 style={{ backgroundColor: primaryColor ? `#${primaryColor}` : 'gray' }}
 />
 <span className="text-sm font-bold tracking-wide opacity-80">
 front: {fronterName}
 </span>
  </div>

  <div className="flex items-center justify-between mt-2">
 <div className="flex items-center gap-2 text-xs text-muted-foreground">
 <Target className="w-3 h-3" />
 <span>current mission</span>
 </div>
 <Button
 variant="outline"
 size="sm"
 className="h-6 text-xs border-primary/20 hover:bg-primary/10"
 onClick={() => {
 document.body.classList.add('flash-grounding');
 setTimeout(() => document.body.classList.remove('flash-grounding'), 1000);
 }}
 >
 ground & refocus
 </Button>
  </div>

  <div className="mt-2 text-sm font-medium opacity-90">
 maintaining system stability.
  </div>

  <style>{`
 .flash-grounding {
 animation: flash-overlay 1s ease-out;
 }
 @keyframes flash-overlay {
 0% { box-shadow: inset 0 0 0 0px ${primaryColor ? `#${primaryColor}` : 'white'}; }
 50% { box-shadow: inset 0 0 50px 10px ${primaryColor ? `#${primaryColor}40` : '#ffffff40'}; }
 100% { box-shadow: inset 0 0 0 0px transparent; }
 }
  `}</style>
  </div>
  );
}
