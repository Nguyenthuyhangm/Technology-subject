export type PlatformName = 'Cocolux' | 'guardian' | 'Hasaki';

type PlatformMeta = { label: string; bg: string; text: string; dot: string; border: string };

type PlatformPillProps = {
  platform: string;
  compact?: boolean;
};

const PLATFORM_META: Record<string, PlatformMeta> = {
  Cocolux: {
    label: 'Cocolux',
    bg: 'bg-[#F8F1EC] dark:bg-[#2A1A1D]/40',
    text: 'text-[#A56A4F] dark:text-[#E8BCAE]',
    dot: 'bg-[#C98563] dark:bg-[#C98563]',
    border: 'border-[#EAD8CF] dark:border-[#4A2D31]',
  },
  guardian: {
    label: 'Guardian',
    bg: 'bg-[#F4F0F8] dark:bg-[#1A1A2A]/40',
    text: 'text-[#7C6A96] dark:text-[#D1C4E9]',
    dot: 'bg-[#9A87B6] dark:bg-[#9A87B6]',
    border: 'border-[#E3DAEC] dark:border-[#3A304A]',
  },
  Hasaki: {
    label: 'Hasaki',
    bg: 'bg-[#EEF4F7] dark:bg-[#1A252A]/40',
    text: 'text-[#5F7E8E] dark:text-[#B0CEDB]',
    dot: 'bg-[#7F9EAE] dark:bg-[#7F9EAE]',
    border: 'border-[#DCE7ED] dark:border-[#2A3F4A]',
  },
};

export default function PlatformPill({ platform, compact = false }: PlatformPillProps) {
  const meta: PlatformMeta = PLATFORM_META[platform] ?? {
    label: platform,
    bg: 'bg-[#F5F5F4] dark:bg-stone-800/40',
    text: 'text-stone-600 dark:text-stone-300',
    dot: 'bg-stone-400 dark:bg-stone-500',
    border: 'border-stone-200 dark:border-stone-700',
  };

  return (
      <span
          className={`inline-flex items-center rounded-full border ${meta.border} ${meta.bg} ${meta.text} ${
              compact ? 'gap-1.5 px-2.5 py-1 text-[10px]' : 'gap-2 px-3 py-1.5 text-xs'
          } font-medium`}
      >
      <span
          className={`rounded-full ${meta.dot} ${
              compact ? 'h-1.5 w-1.5' : 'h-2 w-2'
          }`}
      />
        {meta.label}
    </span>
  );
}