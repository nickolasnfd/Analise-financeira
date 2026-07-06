import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/lib/auth-actions'
import { getMarketData } from '@/lib/market/service'
import type { Position } from '@/lib/portfolio/types'
import { AddPositionForm } from './add-position-form'
import { PositionRow } from './position-row'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Secure check at the data source (proxy is only an optimistic guard).
  if (!user) redirect('/login')

  const { data: positions } = await supabase
    .from('portfolio_positions')
    .select('*')
    .order('ticker')

  const rows = (positions ?? []) as Position[]

  // Fetch market data for every position in parallel (each response is cached
  // for 15 min by the brapi client).
  const markets = await Promise.all(
    rows.map((p) => getMarketData(p.ticker, p.asset_type)),
  )

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Carteira</h1>
          <p className="text-sm text-black/60 dark:text-white/60">{user.email}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/20"
          >
            Sair
          </button>
        </form>
      </header>

      <section className="mt-6">
        <AddPositionForm />
      </section>

      <section className="mt-6">
        {rows.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">
            Nenhum ativo na carteira ainda. Adicione o primeiro acima.
          </p>
        ) : (
          <div>
            {rows.map((p, i) => (
              <PositionRow key={p.id} position={p} market={markets[i]} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
