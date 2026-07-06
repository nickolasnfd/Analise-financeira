import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMarketData } from '@/lib/market/service'
import { getManagementReports, isLikelyFii } from '@/lib/cvm/service'
import { brl, dec, pct, dateTime } from '@/lib/format'

export default async function AssetPage({
  params,
}: {
  params: Promise<{ ticker: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { ticker: rawTicker } = await params
  const ticker = rawTicker.trim().toUpperCase()
  const assetType = isLikelyFii(ticker) ? 'fii' : 'stock'

  const [market, reportsResult] = await Promise.all([
    getMarketData(ticker, assetType),
    getManagementReports(ticker),
  ])

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/dashboard" className="text-sm text-black/60 hover:underline dark:text-white/60">
        ← Carteira
      </Link>

      <header className="mt-2 flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{ticker}</h1>
        <span className="text-sm text-black/60 dark:text-white/60">
          {assetType === 'fii' ? 'FII' : 'Ação'}
        </span>
      </header>

      <section className="mt-4">
        {market.available ? (
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span>Cotação: {brl(market.price)}</span>
            <span>
              Dia: {market.dayChangePct === null ? '—' : pct(market.dayChangePct)}
            </span>
            {market.indicators.map((ind) => (
              <span key={ind.key} className="text-black/70 dark:text-white/70">
                {ind.label}: {ind.value === null ? '—' : dec(ind.value)}
              </span>
            ))}
            <span className="w-full text-xs text-black/50 dark:text-white/50">
              Coletado em {dateTime(market.collectedAt)}
            </span>
          </div>
        ) : (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Dados de mercado indisponíveis — {market.message}
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase text-black/60 dark:text-white/60">
          Relatórios gerenciais (CVM)
        </h2>

        {!reportsResult.available ? (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            Relatórios indisponíveis — {reportsResult.message}
          </p>
        ) : reportsResult.reports.length === 0 ? (
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Nenhum relatório encontrado para este ativo.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {reportsResult.reports.map((r) => (
              <li
                key={r.url}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-black/10 py-2 text-sm dark:border-white/10"
              >
                <span className="font-medium">{r.type}</span>
                {r.referenceDate && (
                  <span className="text-black/60 dark:text-white/60">Ref: {r.referenceDate}</span>
                )}
                <span className="text-black/60 dark:text-white/60">
                  Publicado em {r.deliveryDate}
                </span>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-blue-600 hover:underline dark:text-blue-400"
                >
                  Abrir no site da CVM
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
