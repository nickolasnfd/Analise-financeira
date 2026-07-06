'use client'

import { useActionState } from 'react'
import { addPosition, type PositionFormState } from '@/lib/portfolio/actions'

export function AddPositionForm() {
  const [state, action, pending] = useActionState<PositionFormState, FormData>(
    addPosition,
    undefined,
  )

  return (
    <form
      action={action}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-black/10 p-4 dark:border-white/15"
    >
      <label className="flex flex-col gap-1 text-xs">
        Ticker
        <input
          name="ticker"
          required
          placeholder="MXRF11"
          className="w-28 rounded-md border border-black/15 px-2 py-1.5 text-sm uppercase dark:border-white/20 dark:bg-transparent"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Tipo
        <select
          name="asset_type"
          required
          defaultValue="fii"
          className="rounded-md border border-black/15 px-2 py-1.5 text-sm dark:border-white/20 dark:bg-transparent"
        >
          <option value="fii">FII</option>
          <option value="stock">Ação</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Quantidade
        <input
          name="quantity"
          type="number"
          min="0"
          step="any"
          required
          className="w-28 rounded-md border border-black/15 px-2 py-1.5 text-sm dark:border-white/20 dark:bg-transparent"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Preço médio
        <input
          name="avg_price"
          type="number"
          min="0"
          step="any"
          required
          className="w-28 rounded-md border border-black/15 px-2 py-1.5 text-sm dark:border-white/20 dark:bg-transparent"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        Adicionar
      </button>
      {state?.error && (
        <p className="w-full text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
    </form>
  )
}
