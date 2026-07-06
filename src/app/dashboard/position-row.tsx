'use client'

import { useActionState, useState } from 'react'
import {
  updatePosition,
  removePosition,
  type PositionFormState,
} from '@/lib/portfolio/actions'
import type { Position } from '@/lib/portfolio/types'

export function PositionRow({ position }: { position: Position }) {
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
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-black/10 py-3 dark:border-white/10">
      <span className="w-24 font-medium">{position.ticker}</span>
      <span className="text-sm text-black/60 dark:text-white/60">{typeLabel}</span>
      <span className="text-sm">Qtd: {position.quantity}</span>
      <span className="text-sm">
        PM: {position.avg_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
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
  )
}
