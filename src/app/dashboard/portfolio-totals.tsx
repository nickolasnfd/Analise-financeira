import type { Position } from '@/lib/portfolio/types'
import type { MarketData } from '@/lib/market/service'
import { brl, pct } from '@/lib/format'

// Totals are computed only over positions with available market data so that
// invested vs. current stays apples-to-apples; excluded ones are flagged.
export function PortfolioTotals({
  positions,
  markets,
}: {
  positions: Position[]
  markets: MarketData[]
}) {
  let invested = 0
  let current = 0
  let excluded = 0

  positions.forEach((p, i) => {
    const m = markets[i]
    if (m.available) {
      invested += p.quantity * p.avg_price
      current += p.quantity * m.price
    } else {
      excluded += 1
    }
  })

  const resultAbs = current - invested
  const resultPct = invested > 0 ? (resultAbs / invested) * 100 : null
  const up = resultAbs >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'

  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
      <div className="flex flex-wrap gap-x-8 gap-y-2">
        <div>
          <p className="text-xs text-black/50 dark:text-white/50">Investido</p>
          <p className="text-lg font-semibold">{brl(invested)}</p>
        </div>
        <div>
          <p className="text-xs text-black/50 dark:text-white/50">Valor atual</p>
          <p className="text-lg font-semibold">{brl(current)}</p>
        </div>
        <div>
          <p className="text-xs text-black/50 dark:text-white/50">Resultado</p>
          <p className={`text-lg font-semibold ${up}`}>
            {brl(resultAbs)}
            {resultPct === null ? '' : ` (${pct(resultPct)})`}
          </p>
        </div>
      </div>
      {excluded > 0 && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          {excluded} ativo(s) sem dados de mercado não incluído(s) nos totais.
        </p>
      )}
    </div>
  )
}
