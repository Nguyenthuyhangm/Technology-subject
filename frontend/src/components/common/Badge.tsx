import React from 'react';

type BadgeVariant =
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'soft';

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  brand:
    'border border-[#E7D8DB] dark:border-[#4A2D31] bg-[#F8F1F3] dark:bg-[#2A1A1D]/60 text-[#8E6A72]',
  success:
    'border border-[#EAE7DF] dark:border-stone-700/50 bg-[#F8F6F1] dark:bg-stone-800/50 text-[#6F6A62] dark:text-stone-400',
  warning:
    'border border-[#EFE5D7] dark:border-[#4A3A28] bg-[#FBF6EE] dark:bg-[#2A2018]/60 text-[#8A735C] dark:text-[#C4A87A]',
  danger:
    'border border-[#F1DFE2] dark:border-[#5A2D31] bg-[#FCF4F5] dark:bg-[#2A1518]/60 text-[#9A6C73]',
  neutral:
    'border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/60 text-stone-600 dark:text-stone-400',
  soft:
    'border border-white/70 dark:border-stone-700/40 bg-white/80 dark:bg-stone-800/50 text-stone-600 dark:text-stone-400 backdrop-blur-md',
};

export default function Badge({
  children,
  variant = 'neutral',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${VARIANT_STYLES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}