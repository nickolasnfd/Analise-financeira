'use client'

import { useActionState, useState } from 'react'
import {
  updatePosition,
  removePosition,
  type PositionFormState,
} from '@/lib/portfolio/actions'
import type { Position } from '@/lib/portfolio/types'
import type { MarketData } from '@/lib/market/service'

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dec = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
const pct = (n: number) => `${n >= 0 ? '+' : ''}${dec(n)}%`
const dt = (iso: string) => new Date(iso).toLocaleString('pt-BR')

// Indicator units (ROE/DY fraction vs. percent) are LIVE-PENDING; show the raw
// value to 2 decimals and "—" when absent — never a fabricated number.
function MarketMetrics({
  position,
  market,
}: {
  position: Position
  market: MarketData
}) {
  if (!market.available) {
    return (
      <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
        Dados de mercado indisponíveis — {market.message}
      </p>
    )
  }

  const currentValue = position.quantity * market.price
  const investedValue = position.quantity * position.avg_price
  const resultAbs = currentValue - investedValue
  const resultPct = investedValue > 0 ? (resultAbs / investedValue) * 100 : null
  const up = (n: number) => (n >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400')

  return (
    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
      <span>Cotação: {brl(market.price)}</span>
      <span className={market.dayChangePct === null ? '' : up(market.dayChangePct)}>
        Dia: {market.dayChangePct === null ? '—' : pct(market.dayChangePct)}
      </span>
      <span>Valor: {brl(currentValue)}</span>
      <span className={up(resultAbs)}>
        Resultado: {brl(resultAbs)}
        {resultPct === null ? '' : ` (${pct(resultPct)})`}
      </span>
      {market.indicators.map((ind) => (
        <span key={ind.key} className="text-black/70 dark:text-white/70">
          {ind.label}: {ind.value === null ? '—' : dec(ind.value)}
        </span>
      ))}
      <span className="w-full text-xs text-black/50 dark:text-white/50">
        Coletado em {dt(market.collectedAt)}
      </span>
    </div>
  )
}

export function PositionRow({
  position,
  market,
}: {
  position: Position
  market: MarketData
}) {
  const [editing, setEditing] = useState(false)
  const [state, action, pending] = useActionState<PositionFormState, FormData>(
    async (prev, formData) => {
      const result = await updatePosition(prev, formData)
      if (!result?.error) setEditing(false)
      return result
    },
    undefined,
  )

  const typeLabel = position.asset_type === 'fii' ? 'FII' : 'Ação'

  if (editing) {
    return (
      <form
        action={action}
        className="flex flex-wrap items-end gap-3 border-b border-black/10 py-3 dark:border-white/10"
      >
        <input type="hidden" name="id" value={position.id} />
        <span className="w-24 font-medium">{position.ticker}</span>
        <label className="flex flex-col gap-1 text-xs">
          Quantidade
          <input
            name="quantity"
            type="number"
            min="0"
            step="any"
            defaultValue={position.quantity}
            required
            className="w-28 rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/20 dark:bg-transparent"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Preço médio
          <input
            name="avg_price"
            type="number"
            min="0"
            step="any"
            defaultValue={position.avg_price}
            required
            className="w-28 rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/20 dark:bg-transparent"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-black px-3 py-1 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md border border-black/15 px-3 py-1 text-sm dark:border-white/20"
        >
          Cancelar
        </button>
        {state?.error && (
          <p className="w-full text-sm text-red-600 dark:text-red-400">{state.error}</p>
        )}
      </form>
    )
  }

  return (
    <div className="border-b border-black/10 py-3 dark:border-white/10">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <span className="w-24 font-medium">{position.ticker}</span>
        <span className="text-sm text-black/60 dark:text-white/60">{typeLabel}</span>
        <span className="text-sm">Qtd: {position.quantity}</span>
        <span className="text-sm">PM: {brl(position.avg_price)}</span>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-black/15 px-3 py-1 text-sm dark:border-white/20"
          >
            Editar
          </button>
          <form action={removePosition}>
            <input type="hidden" name="id" value={position.id} />
            <button
              type="submit"
              className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-600 dark:border-red-500/40 dark:text-red-400"
            >
              Remover
            </button>
          </form>
        </div>
      </div>
      <MarketMetrics position={position} market={market} />
    </div>
  )
}
