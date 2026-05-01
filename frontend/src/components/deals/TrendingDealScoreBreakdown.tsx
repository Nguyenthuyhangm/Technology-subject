import type { TrendingDealDto } from '../../types/trendingDeal'
import {
  TRENDING_DEAL_SCORE_PARTS,
  trendingDealHasScoreBreakdown,
} from '../../util/trendingDealFormat'

export function TrendingDealScoreBreakdown({ d }: { d: TrendingDealDto }) {
  if (!trendingDealHasScoreBreakdown(d)) return null

  return (
    <div className="mt-3 rounded-xl border border-stone-200/60 bg-white/60 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-stone-400">
        Thành phần điểm deal
      </p>
      <ul className="mt-2 space-y-1.5">
        {TRENDING_DEAL_SCORE_PARTS.map(({ key, label }) => {
          const v = d[key]
          if (v == null) return null
          const pct = Math.round(Math.min(1, Math.max(0, v)) * 100)
          return (
            <li key={key} className="flex items-center gap-2 text-[11px]">
              <span className="w-[4.5rem] shrink-0 text-stone-500">{label}</span>
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-stone-200/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#B89AA1] to-[#8E6A72]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right tabular-nums text-stone-600">
                {pct}%
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
