'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function TickerSearchForm() {
  const router = useRouter()
  const [ticker, setTicker] = useState('')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const trimmed = ticker.trim()
        if (trimmed) router.push(`/ativos/${encodeURIComponent(trimmed.toUpperCase())}`)
      }}
      className="flex items-center gap-2"
    >
      <input
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value)}
        placeholder="Buscar ativo (ex: PETR4)"
        className="rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/20 dark:bg-transparent"
      />
      <button
        type="submit"
        className="rounded-md border border-black/15 px-3 py-1 text-sm dark:border-white/20"
      >
        Ver
      </button>
    </form>
  )
}
