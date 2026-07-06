// Low-level brapi.dev client. Server-only (uses BRAPI_TOKEN).
//
// Free plan: ~15,000 req/month, 1 asset per request, token required, HTTP 402
// when the quota is exceeded (confirmed via brapi docs/FAQ, jul/2026).
//
// CONFIRMED against a live free-plan token (2026-07-06, via SQL http lab):
// - `modules=` is NOT allowed on the free plan → HTTP 403 ("Módulos permitidos:
//   summaryProfile"). Never send it.
// - `fundamental=true` works for stocks and FIIs and adds priceEarnings /
//   earningsPerShare (may be null for FIIs). dividendYield, ROE and P/VP are
//   NOT exposed on the free plan; the normalizer renders them as "—".

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

// Logs every failure so Vercel runtime logs show WHY a quote/validation failed
// (the 2026-07-06 modules-403 incident was invisible without this).
function fail(
  ticker: string,
  reason: Extract<BrapiResult, { ok: false }>['reason'],
  message: string,
): BrapiResult {
  console.error(`[brapi] quote ${ticker} failed: ${reason} — ${message}`)
  return { ok: false, reason, message }
}

export async function fetchQuote(ticker: string): Promise<BrapiResult> {
  const token = process.env.BRAPI_TOKEN
  if (!token) {
    return fail(ticker, 'no_token', 'BRAPI_TOKEN não configurado.')
  }

  // Free plan: `modules=` triggers HTTP 403, so only `fundamental=true` is sent.
  const symbol = encodeURIComponent(ticker.trim().toUpperCase())
  const url = `${BRAPI_BASE}/quote/${symbol}?token=${token}&fundamental=true`

  let res: Response
  try {
    res = await fetch(url, {
      next: { revalidate: REVALIDATE_SECONDS, tags: [`brapi:quote:${symbol}`] },
    })
  } catch {
    return fail(ticker, 'unavailable', 'Não foi possível contatar a brapi.')
  }

  if (res.status === 402) {
    return fail(ticker, 'rate_limited', 'Limite do plano brapi excedido.')
  }
  if (res.status === 404) {
    return fail(ticker, 'invalid_ticker', `Ticker ${ticker} não encontrado.`)
  }
  if (!res.ok) {
    return fail(ticker, 'unavailable', `brapi retornou HTTP ${res.status}.`)
  }

  let json: { results?: BrapiQuoteRaw[]; requestedAt?: string }
  try {
    json = await res.json()
  } catch {
    return fail(ticker, 'unavailable', 'Resposta inválida da brapi.')
  }

  const data = json?.results?.[0]
  if (!data) {
    return fail(ticker, 'invalid_ticker', `Ticker ${ticker} não encontrado.`)
  }

  return {
    ok: true,
    data,
    requestedAt: json.requestedAt ?? new Date().toISOString(),
  }
}
