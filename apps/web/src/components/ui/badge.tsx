import React from 'react';
import { cn } from '@pkm/core';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'outline' | 'secondary';
}

export const Badge: React.FC<BadgeProps> = React.memo(({ variant = 'default', className = '', children, ...props }) => {
    const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';
    const variantClass = variant === 'outline' ? 'border border-muted text-muted-foreground bg-transparent' : 'bg-muted text-muted-foreground';
    return (
        <span className={cn(base, variantClass, className)} {...props}>
            {children}
        </span>
    );
});

export default Badge;