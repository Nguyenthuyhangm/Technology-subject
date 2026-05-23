import type { TrendingDealDto } from '../../types/trendingDeal'
import {
  TRENDING_DEAL_SCORE_PARTS,
  trendingDealHasScoreBreakdown,
} from '../../util/trendingDealFormat'

export function TrendingDealScoreBreakdown({ d }: { d: TrendingDealDto }) {
  if (!trendingDealHasScoreBreakdown(d)) return null

  return (
    <div className="mt-2 flex flex-wrap gap-3">
      {TRENDING_DEAL_SCORE_PARTS.map(({ key, label }) => {
        const v = d[key]
        if (v == null) return null
        const pct = Math.round(Math.min(1, Math.max(0, v)) * 100)
        return (
          <div key={key} className="flex items-center gap-1.5">
            <span className="text-[10px] text-stone-400 dark:text-stone-500">{label}</span>
            <div className="h-1 w-16 overflow-hidden rounded-full bg-stone-200/70 dark:bg-stone-700/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#C9A9B0] to-[#8E6A72]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] tabular-nums text-stone-400 dark:text-stone-500">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}