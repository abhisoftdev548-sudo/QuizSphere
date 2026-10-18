import React from 'react';

const sizes = {
  sm: 'w-8 h-8 text-[12px]',
  md: 'w-10 h-10 text-[14px]',
  lg: 'w-12 h-12 text-[16px]',
  xl: 'w-16 h-16 text-[20px]'
};

export default function Avatar({ src, name = 'U', size = 'md', className = '', ...props }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  return (
    <div className={`rounded-full bg-primary-light text-primary flex items-center justify-center font-medium overflow-hidden flex-shrink-0 ${sizes[size]} ${className}`} {...props}>
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : initials}
    </div>
  );
}
