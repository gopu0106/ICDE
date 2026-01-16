import React from 'react';
import clsx from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'primary' | 'gray';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'gray',
  className,
}) => {
  return (
    <span
      className={clsx(
        'badge',
        {
          'badge-success': variant === 'success',
          'badge-danger': variant === 'danger',
          'badge-primary': variant === 'primary',
          'badge-gray': variant === 'gray',
        },
        className
      )}
    >
      {children}
    </span>
  );
};



