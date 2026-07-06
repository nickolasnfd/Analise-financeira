// Client for Fundos.NET (fnet.bmfbovespa.com.br) — management report listing
// for FIIs. Public system, no API key. Contract confirmed via curl
// (2026-07-06): see specs/relatorios-gerenciais.md section 5.
//
// Flow: GET the search page (session cookie + CSRF token) → resolve the fund
// name to `idFundo` via `listarFundos` → fetch documents filtered to
// category "Informes Periódicos" (6) / type "Informe Mensal Estruturado"
// (40) → the server's own ordering is not reliable (confirmed empirically),
// so fetch broadly and sort by delivery date in this code → take the most
// recent 4 active (non-cancelled) reports.

import type { ManagementReport, ManagementReportsResult } from './types'

const BASE = 'https://fnet.bmfbovespa.com.br/fnet/publico'
const CATEGORIA_INFORMES_PERIODICOS = 6
const TIPO_INFORME_MENSAL_ESTRUTURADO = 40
const MAX_RECORDS_FETCHED = 200 // server-enforced max page size ("O limite de itens para pesquisas é 200!")

function fail(reason: string, message: string): ManagementReportsResult {
  console.error(`[fundos-net] failed: ${reason} — ${message}`)
  return { available: false, reason, message }
}

async function getSession(): Promise<{ cookie: string; csrfToken: string } | null> {
  const res = await fetch(`${BASE}/abrirGerenciadorDocumentosCVM`)
  if (!res.ok) return null

  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ')
  const html = await res.text()
  const match = html.match(/csrf_token\s*=\s*"([^"]+)"/)
  if (!match) return null

  return { cookie, csrfToken: match[1] }
}

async function findFundId(
  fundName: string,
  session: { cookie: string; csrfToken: string },
): Promise<number | null> {
  const url = new URL(`${BASE}/listarFundos`)
  url.searchParams.set('term', fundName)
  url.searchParams.set('page', '1')
  url.searchParams.set('idTipoFundo', '0')
  url.searchParams.set('idAdm', '0')
  url.searchParams.set('paraCerts', 'false')

  const res = await fetch(url, {
    headers: { CSRFToken: session.csrfToken, Cookie: session.cookie },
  })
  if (!res.ok) return null

  const json: { results?: { id: number }[] } = await res.json()
  return json.results?.[0]?.id ?? null
}

function parseDeliveryDate(deliveryDate: string): string {
  // "dd/mm/yyyy HH:mm" -> "yyyymmddHHmm" (sortable string)
  const m = deliveryDate.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/)
  if (!m) return ''
  const [, dd, mm, yyyy, hh, min] = m
  return `${yyyy}${mm}${dd}${hh}${min}`
}

export async function fetchFiiManagementReports(
  fundName: string,
): Promise<ManagementReportsResult> {
  const session = await getSession()
  if (!session) return fail('unavailable', 'Não foi possível contatar o Fundos.NET.')

  const fundId = await findFundId(fundName, session)
  if (fundId === null) {
    return fail('fund_not_found', `Fundo "${fundName}" não localizado no Fundos.NET.`)
  }

  const url = new URL(`${BASE}/pesquisarGerenciadorDocumentosDados`)
  url.searchParams.set('d', '1')
  url.searchParams.set('s', '0')
  url.searchParams.set('l', String(MAX_RECORDS_FETCHED))
  url.searchParams.set('idFundo', String(fundId))
  url.searchParams.set('idCategoriaDocumento', String(CATEGORIA_INFORMES_PERIODICOS))
  url.searchParams.set('idTipoDocumento', String(TIPO_INFORME_MENSAL_ESTRUTURADO))
  url.searchParams.set('idEspecieDocumento', '0')

  let res: Response
  try {
    res = await fetch(url, {
      headers: { CSRFToken: session.csrfToken, Cookie: session.cookie },
    })
  } catch {
    return fail('unavailable', 'Não foi possível contatar o Fundos.NET.')
  }
  if (!res.ok) return fail('unavailable', `Fundos.NET retornou HTTP ${res.status}.`)

  type Row = {
    id: number
    tipoDocumento: string
    dataReferencia: string
    dataEntrega: string
    status: string
  }
  let json: { data?: Row[] }
  try {
    json = await res.json()
  } catch {
    return fail('unavailable', 'Resposta inválida do Fundos.NET.')
  }

  const rows = json.data ?? []
  const active = rows.filter((r) => r.status?.startsWith('A')) // AC/A — excludes C/CC (cancelado)

  const withSortKey = active
    .map((r) => ({
      type: r.tipoDocumento,
      referenceDate: r.dataReferencia?.trim() || null,
      sortKey: parseDeliveryDate(r.dataEntrega),
      deliveryDate: r.dataEntrega,
      url: `${BASE}/downloadDocumento?id=${r.id}`,
    }))
    .filter((r) => r.sortKey)
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .slice(0, 4)

  const reports: ManagementReport[] = withSortKey.map(
    ({ type, referenceDate, deliveryDate, url }) => ({ type, referenceDate, deliveryDate, url }),
  )

  return { available: true, reports }
}
