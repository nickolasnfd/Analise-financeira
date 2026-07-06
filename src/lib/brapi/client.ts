// Low-level brapi.dev client. Server-only (uses BRAPI_TOKEN).
//
// Free plan: ~15,000 req/month, 1 asset per request, token required, HTTP 402
// when the quota is exceeded (confirmed via brapi docs/FAQ, jul/2026).
//
// LIVE-PENDING: the exact fundamental field names/units (ROE, P/VP) on the free
// plan were NOT confirmed against a live token in this session (egress blocks
// brapi.dev). The raw shape below is read defensively; the normalizer
// (src/lib/market/service.ts) shows "—" for any field the API omits, so a wrong
// guess degrades gracefully instead of inventing a value.

const BRAPI_BASE = 'https://brapi.dev/api'
const REVALIDATE_SECONDS = 900 // 15 min cache to respect the free-plan quota

export type BrapiQuoteRaw = {
  symbol?: string
  regularMarketPrice?: number
  regularMarketChangePercent?: number
  regularMarketTime?: string | number
  priceEarnings?: number
  earningsPerShare?: number
  dividendYield?: number
  defaultKeyStatistics?: Record<string, unknown>
  financialData?: Record<string, unknown>
  [key: string]: unknown
}

export type BrapiResult =
  | { ok: true; data: BrapiQuoteRaw; requestedAt: string }
  | {
      ok: false
      reason: 'no_token' | 'invalid_ticker' | 'rate_limited' | 'unavailable'
      message: string
    }

export async function fetchQuote(ticker: string): Promise<BrapiResult> {
  const token = process.env.BRAPI_TOKEN
  if (!token) {
    return { ok: false, reason: 'no_token', message: 'BRAPI_TOKEN não configurado.' }
  }

  const symbol = encodeURIComponent(ticker.trim().toUpperCase())
  const url = `${BRAPI_BASE}/quote/${symbol}?token=${token}&fundamental=true&modules=defaultKeyStatistics,financialData`

  let res: Response
  try {
    res = await fetch(url, {
      next: { revalidate: REVALIDATE_SECONDS, tags: [`brapi:quote:${symbol}`] },
    })
  } catch {
    return { ok: false, reason: 'unavailable', message: 'Não foi possível contatar a brapi.' }
  }

  if (res.status === 402) {
    return { ok: false, reason: 'rate_limited', message: 'Limite do plano brapi excedido.' }
  }
  if (res.status === 404) {
    return { ok: false, reason: 'invalid_ticker', message: `Ticker ${ticker} não encontrado.` }
  }
  if (!res.ok) {
    return { ok: false, reason: 'unavailable', message: `brapi retornou HTTP ${res.status}.` }
  }

  let json: { results?: BrapiQuoteRaw[]; requestedAt?: string }
  try {
    json = await res.json()
  } catch {
    return { ok: false, reason: 'unavailable', message: 'Resposta inválida da brapi.' }
  }

  const data = json?.results?.[0]
  if (!data) {
    return { ok: false, reason: 'invalid_ticker', message: `Ticker ${ticker} não encontrado.` }
  }

  return {
    ok: true,
    data,
    requestedAt: json.requestedAt ?? new Date().toISOString(),
  }
}
