// Normalizes a raw brapi quote into the shape the dashboard consumes.
// Missing indicators become `null` (rendered as "—") — never a fabricated value.
//
// CONFIRMED free-plan contract (2026-07-06, live token): quote + fundamental=true
// exposes price, day change %, time and priceEarnings (P/L; may be null for
// FIIs). dividendYield, ROE (financialData) and P/VP (defaultKeyStatistics) are
// paid-module fields → they stay null and render as "—" on the free plan (the
// trade-off approved in the spec, question 4). The defensive reads below light
// up automatically if the plan is ever upgraded.

import { fetchQuote } from '@/lib/brapi/client'

export type AssetType = 'stock' | 'fii'

export type NormalizedIndicator = { key: string; label: string; value: number | null }

export type MarketData =
  | {
      available: true
      price: number
      dayChangePct: number | null
      indicators: NormalizedIndicator[]
      collectedAt: string
    }
  | { available: false; reason: string; message: string }

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function toIso(v: unknown): string | null {
  if (typeof v === 'string' && v) {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    // brapi may send epoch seconds; scale to ms when it looks like seconds.
    const ms = v < 1e12 ? v * 1000 : v
    return new Date(ms).toISOString()
  }
  return null
}

export async function getMarketData(
  ticker: string,
  assetType: AssetType,
): Promise<MarketData> {
  const res = await fetchQuote(ticker)
  if (!res.ok) {
    return { available: false, reason: res.reason, message: res.message }
  }

  const d = res.data
  const price = num(d.regularMarketPrice)
  if (price === null) {
    return { available: false, reason: 'unavailable', message: 'Cotação indisponível.' }
  }

  const dks = (d.defaultKeyStatistics ?? {}) as Record<string, unknown>
  const fin = (d.financialData ?? {}) as Record<string, unknown>

  const indicators: NormalizedIndicator[] =
    assetType === 'stock'
      ? [
          { key: 'pl', label: 'P/L', value: num(d.priceEarnings) },
          { key: 'roe', label: 'ROE', value: num(fin.returnOnEquity) },
          { key: 'dy', label: 'DY', value: num(d.dividendYield) ?? num(dks.dividendYield) },
        ]
      : [
          {
            key: 'dy',
            label: 'DY',
            value:
              num(d.dividendYield) ??
              num(dks.dividendYield12m) ??
              num(dks.dividendYield),
          },
          {
            key: 'pvp',
            label: 'P/VP',
            value: num(dks.priceToBook) ?? num(dks.priceToNav),
          },
        ]

  return {
    available: true,
    price,
    dayChangePct: num(d.regularMarketChangePercent),
    collectedAt: toIso(d.regularMarketTime) ?? res.requestedAt,
    indicators,
  }
}
