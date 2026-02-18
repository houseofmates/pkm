
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreVertical, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface WidgetWrapperProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  onRemove?: () => void;
  editable?: boolean;
  headerActions?: React.ReactNode;
  // props passed by react-grid-layout
  style?: React.CSSProperties;
  onMouseDown?: React.MouseEventHandler;
  onMouseUp?: React.MouseEventHandler;
  onTouchEnd?: React.TouchEventHandler;
}

// forward ref is required for react-grid-layout
import { forwardRef } from 'react';

export const WidgetWrapper = forwardRef<HTMLDivElement, WidgetWrapperProps>(({
  title,
  children,
  className,
  onRemove,
  editable = true,
  headerActions,
  style,
  onMouseDown,
  onMouseUp,
  onTouchEnd,
  ...props
}, ref) => {
  return (
  <Card
  ref={ref}
  style={style}
  onMouseDown={onMouseDown}
  onMouseUp={onMouseUp}
  onTouchEnd={onTouchEnd}
  className={cn("h-full flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow", className)}
  {...props}
  >
  <div className="flex items-center justify-between px-4 py-2 border-b bg-card/50 cursor-move drag-handle group">
 <h3 className="font-semibold text-sm ">{title}</h3>
 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 {headerActions}
 {editable && (
 <DropdownMenu>
   <DropdownMenuTrigger asChild>
   <Button variant="ghost" size="icon" className="h-6 w-6">
   <MoreVertical className="h-3 w-3" />
   </Button>
   </DropdownMenuTrigger>
   <DropdownMenuContent align="end">
   <DropdownMenuItem onClick={onRemove} className="text-red-500">
   <X className="mr-2 h-4 w-4" /> Remove Widget
   </DropdownMenuItem>
   </DropdownMenuContent>
 </DropdownMenu>
 )}
 </div>
  </div>
  <CardContent className="flex-1 p-0 overflow-auto min-h-0 bg-background/50 backdrop-blur-sm">
 {children}
  </CardContent>
  </Card>
  );
});

WidgetWrapper.displayName = 'WidgetWrapper';
