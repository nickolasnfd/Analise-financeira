// Client for RAD CVM (rad.cvm.gov.br) — management report listing for stocks
// (ações). Public system, no API key. No REST API is documented; this
// replicates the browser's AJAX contract, confirmed via curl (2026-07-06):
// see specs/relatorios-gerenciais.md section 5 for the full write-up.
//
// Flow: GET the search page (session cookies + the full company directory
// embedded in a hidden field) → match the company name against that
// directory to find its Código CVM → POST ListarDocumentos with that code →
// parse the custom-delimited response → filter to ITR (quarterly reports,
// the closest match to "relatório gerencial" recorrente) → sort by delivery
// date (the server's own ordering is not reliable) → take the most recent 4.

import type { ManagementReport, ManagementReportsResult } from './types'

const BASE = 'https://www.rad.cvm.gov.br/ENETWeb'
const SEARCH_PAGE = `${BASE}/frmConsultaExternaCVM.aspx`
const LIST_ENDPOINT = `${BASE}/frmConsultaExternaCVM.aspx/ListarDocumentos`

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function fail(reason: string, message: string): ManagementReportsResult {
  console.error(`[rad-cvm] failed: ${reason} — ${message}`)
  return { available: false, reason, message }
}

async function findCompanyCode(
  companyName: string,
): Promise<{ code: string; cookie: string } | null> {
  const res = await fetch(SEARCH_PAGE)
  if (!res.ok) return null

  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ')
  const html = await res.text()

  const match = html.match(/id="hdnEmpresas"[^>]*value="([^"]*)"/)
  if (!match) return null

  const raw = match[1]
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')

  // Entries look like: { key:'C_009512', value:'009512 - PETROLEO BRASILEIRO S.A. PETROBRAS'}
  const entryRe = /key:\s*'C_(\d+)'\s*,\s*value:\s*'([^']*)'/g
  const target = normalize(companyName)

  let best: { code: string; score: number } | null = null
  for (const m of raw.matchAll(entryRe)) {
    const code = m[1]
    const label = normalize(m[2].replace(/^\d+\s*-\s*/, ''))
    if (!label) continue
    if (label === target) {
      best = { code, score: 1000 }
      break
    }
    if (label.includes(target) || target.includes(label)) {
      const score = Math.min(label.length, target.length)
      if (!best || score > best.score) best = { code, score }
    }
  }

  return best ? { code: best.code, cookie } : null
}

function extractField(record: string, index: number): string {
  return record.split('$&')[index] ?? ''
}

function stripSpanOrder(field: string): { sortKey: string; display: string } {
  const m = field.match(/<spanOrder>([^<]*)<\/spanOrder>\s*(.*)$/)
  if (!m) return { sortKey: '', display: field.trim() }
  return { sortKey: m[1], display: m[2].trim() }
}

export async function fetchStockManagementReports(
  companyName: string,
): Promise<ManagementReportsResult> {
  const found = await findCompanyCode(companyName)
  if (!found) {
    return fail('company_not_found', `Empresa "${companyName}" não localizada no RAD CVM.`)
  }

  const today = new Date()
  const twoYearsAgo = new Date(today)
  twoYearsAgo.setFullYear(today.getFullYear() - 2)
  const toBrDate = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`

  const body = {
    dataDe: toBrDate(twoYearsAgo),
    dataAte: toBrDate(today),
    empresa: `,${found.code}`,
    setorAtividade: '-1',
    categoriaEmissor: '-1',
    situacaoEmissor: '-1',
    tipoParticipante: '-1',
    dataReferencia: '',
    categoria: 'EST_-1,IPE_-1_-1_-1',
    periodo: '2',
    horaIni: '',
    horaFim: '',
    palavraChave: '',
    ultimaDtRef: 'false',
    tipoEmpresa: '0',
    token: '',
    versaoCaptcha: '',
  }

  let res: Response
  try {
    res = await fetch(LIST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Cookie: found.cookie,
      },
      body: JSON.stringify(body),
    })
  } catch {
    return fail('unavailable', 'Não foi possível contatar o RAD CVM.')
  }

  if (!res.ok) return fail('unavailable', `RAD CVM retornou HTTP ${res.status}.`)

  let json: {
    d?: { temErro: boolean; msgErro: string; SolicitarCaptcha: string; dados: string }
  }
  try {
    json = await res.json()
  } catch {
    return fail('unavailable', 'Resposta inválida do RAD CVM.')
  }

  const d = json.d
  if (!d) return fail('unavailable', 'Resposta inesperada do RAD CVM.')
  if (d.SolicitarCaptcha === 'S') {
    // Never attempt to solve a CAPTCHA — degrade gracefully instead.
    return fail('captcha_required', 'RAD CVM exigiu verificação anti-robô; tente novamente mais tarde.')
  }
  if (d.temErro) return fail('unavailable', d.msgErro || 'Erro ao consultar o RAD CVM.')
  if (!d.dados) return { available: true, reports: [] }

  // Keyed by reference period so a later retificação (higher versão) of the
  // same quarter replaces the earlier version instead of taking its own slot
  // among the "most recent 4".
  const byReferencePeriod = new Map<
    string,
    ManagementReport & { version: number }
  >()

  for (const record of d.dados.split('*')) {
    if (!record.trim()) continue
    const categoria = extractField(record, 2)
    if (!categoria.startsWith('ITR')) continue

    const referencia = stripSpanOrder(extractField(record, 5))
    const entrega = stripSpanOrder(extractField(record, 6))
    const versao = Number(extractField(record, 8)) || 0
    const acoes = extractField(record, 10)

    const dl = acoes.match(
      /OpenDownloadDocumentos\('(\d+)','(\d+)','([^']+)','([A-Z]+)'\)/,
    )
    if (!dl || !entrega.sortKey) continue

    const [, numSequencia, numVersao, numProtocolo, descTipo] = dl
    const key = referencia.sortKey || referencia.display
    const existing = byReferencePeriod.get(key)
    if (existing && existing.version >= versao) continue

    byReferencePeriod.set(key, {
      type: categoria,
      referenceDate: referencia.display || null,
      deliveryDate: entrega.sortKey, // yyyymmdd, sortable
      url: `${BASE}/frmDownloadDocumento.aspx?Tela=ext&numSequencia=${numSequencia}&numVersao=${numVersao}&numProtocolo=${numProtocolo}&descTipo=${descTipo}&CodigoInstituicao=1`,
      version: versao,
    })
  }

  const reports = [...byReferencePeriod.values()].sort((a, b) =>
    b.deliveryDate.localeCompare(a.deliveryDate),
  )

  return {
    available: true,
    reports: reports
      .slice(0, 4)
      .map(({ type, referenceDate, deliveryDate, url }) => ({
        type,
        referenceDate,
        deliveryDate: formatSortKey(deliveryDate),
        url,
      })),
  }
}

function formatSortKey(yyyymmdd: string): string {
  if (!/^\d{8}$/.test(yyyymmdd)) return yyyymmdd
  return `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(0, 4)}`
}
