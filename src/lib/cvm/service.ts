// Unified entry point: given a ticker, resolves the company/fund name via
// brapi (already fetched for market data) and queries the right CVM system.

import { fetchQuote } from '@/lib/brapi/client'
import { fetchStockManagementReports } from './rad-cvm'
import { fetchFiiManagementReports } from './fundos-net'
import type { ManagementReportsResult } from './types'

// B3 units (FIIs among them) trade under tickers ending in "11"/"11B" — this
// app's scope is Ações B3 + FIIs only (AGENTS.md), so the suffix is a
// reasonable, documented heuristic (specs/relatorios-gerenciais.md section
// 5) rather than a fabricated classification.
export function isLikelyFii(ticker: string): boolean {
  return /11B?$/i.test(ticker.trim())
}

export async function getManagementReports(ticker: string): Promise<ManagementReportsResult> {
  const quote = await fetchQuote(ticker)
  if (!quote.ok) {
    return { available: false, reason: quote.reason, message: quote.message }
  }

  const companyName = quote.data.longName || quote.data.shortName
  if (!companyName) {
    return {
      available: false,
      reason: 'no_company_name',
      message: 'Nome do ativo não disponível para busca na CVM.',
    }
  }

  return isLikelyFii(ticker)
    ? fetchFiiManagementReports(companyName)
    : fetchStockManagementReports(companyName)
}
