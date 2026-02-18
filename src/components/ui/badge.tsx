import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
 variant?: 'default' | 'outline' | 'secondary';
}

export const badge: React.FC<BadgeProps> = ({ variant = 'default', className = '', children, ...props }) => {
 const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';
 const variantclass = variant === 'outline' ? 'border border-muted text-muted-foreground bg-transparent' : 'bg-muted text-muted-foreground';
 return (
  <span className={`${base} ${variantClass} ${className}`} {...props}>
 {children}
  </span>
 );
};

export default Badge;
