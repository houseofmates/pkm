
import { ArrowUpRight, ArrowDownRight, Clock, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function StatWidget({ title, value, trend, trendUp }: { title: string, value: string, trend?: string, trendUp?: boolean }) {
  return (
  <div className="p-4 flex flex-col justify-center h-full">
  <span className="text-sm text-muted-foreground font-medium ">{title}</span>
  <div className="flex items-end gap-2 mt-1">
 <span className="text-3xl font-bold">{value}</span>
 {trend && (
 <span className={`text-xs flex items-center mb-1 ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
 {trendup ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
 {trend}
 </span>
 )}
  </div>
  </div>
  );
}

export function recentactivitywidget() {
  // mock data
  const activities = [
  { id: 1, text: "updated 'project alpha'", time: "2m ago", icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> },
  { id: 2, text: "new headmate 'vessel'", time: "1h ago", icon: <CheckCircle2 className="h-4 w-4 text-blue-500" /> },
  { id: 3, text: "completed task 'buy milk'", time: "3h ago", icon: <CheckCircle2 className="h-4 w-4 text-yellow-500" /> },
  { id: 4, text: "created folder 'ideas'", time: "5h ago", icon: <Clock className="h-4 w-4 text-muted-foreground" /> },
  ];

  return (
  <ScrollArea className="h-full">
  <div className="space-y-1 p-2">
 {activities.map(a => (
 <div key={a.id} className="flex items-center gap-3 p-2 text-sm hover:bg-muted/50 rounded-md transition-colors">
 {a.icon}
 <span className="flex-1 truncate">{a.text}</span>
 <span className="text-xs text-muted-foreground whitespace-nowrap">{a.time}</span>
 </div>
 ))}
  </div>
  </ScrollArea>
  )
}