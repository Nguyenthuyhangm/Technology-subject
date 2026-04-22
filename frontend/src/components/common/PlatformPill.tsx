export type PlatformName = 'Coculux' | 'Gardian' | 'Hasaki';

type PlatformMeta = { label: string; bg: string; text: string; dot: string; border: string };

type PlatformPillProps = {
  platform: string;
  compact?: boolean;
};

const PLATFORM_META: Record<string, PlatformMeta> = {
  Coculux: {
    label: 'Coculux',
    bg: 'bg-[#F8F1EC]',
    text: 'text-[#A56A4F]',
    dot: 'bg-[#C98563]',
    border: 'border-[#EAD8CF]',
  },
  Gardian: {
    label: 'Gardian',
    bg: 'bg-[#F4F0F8]',
    text: 'text-[#7C6A96]',
    dot: 'bg-[#9A87B6]',
    border: 'border-[#E3DAEC]',
  },
  Hasaki: {
    label: 'Hasaki',
    bg: 'bg-[#EEF4F7]',
    text: 'text-[#5F7E8E]',
    dot: 'bg-[#7F9EAE]',
    border: 'border-[#DCE7ED]',
  },
};

export default function PlatformPill({ platform, compact = false }: PlatformPillProps) {
  const meta: PlatformMeta = PLATFORM_META[platform] ?? {
    label: platform,
    bg: 'bg-[#F5F5F4]',
    text: 'text-stone-600',
    dot: 'bg-stone-400',
    border: 'border-stone-200',
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