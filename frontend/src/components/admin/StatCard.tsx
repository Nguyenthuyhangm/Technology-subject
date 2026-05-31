import { COLORS } from './adminConstants';

export default function StatCard({ 
    icon: Icon, label, value, sub, color = COLORS.mauve 
}: {
    icon: any; label: string; value: string | number; sub?: string; color?: string;
}) {
    return (
        <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#171514] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-stone-100 dark:border-stone-800/60 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-0.5">
            <div className="relative z-10 flex flex-col gap-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-50 dark:bg-[#221F1E] border border-stone-100 dark:border-stone-800">
                    <Icon size={18} style={{ color }} strokeWidth={1.5} />
                </div>
                <div>
                    <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-500 dark:text-stone-400">{label}</h3>
                    <p className="mt-1.5 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                        {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
                    </p>
                    {sub && <p className="mt-2 text-[11px] text-stone-400 dark:text-stone-500">{sub}</p>}
                </div>
            </div>
            <div className="absolute bottom-0 left-0 h-[2px] w-0 transition-all duration-500 ease-out group-hover:w-full opacity-70"
                style={{ backgroundImage: `linear-gradient(to right, transparent, ${color})` }} />
        </div>
    );
}