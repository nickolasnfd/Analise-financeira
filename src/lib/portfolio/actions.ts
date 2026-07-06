'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { fetchQuote } from '@/lib/brapi/client'
import type { AssetType } from '@/lib/portfolio/types'

export type PositionFormState = { error?: string } | undefined

function parseCommon(formData: FormData) {
  const quantity = Number(formData.get('quantity'))
  const avgPrice = Number(formData.get('avg_price'))
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: 'Quantidade inválida.' as const }
  }
  if (!Number.isFinite(avgPrice) || avgPrice < 0) {
    return { error: 'Preço médio inválido.' as const }
  }
  return { quantity, avgPrice }
}

export async function addPosition(
  _prev: PositionFormState,
  formData: FormData,
): Promise<PositionFormState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const ticker = String(formData.get('ticker') ?? '').trim().toUpperCase()
  const assetType = String(formData.get('asset_type') ?? '') as AssetType
  if (!ticker) return { error: 'Informe o ticker.' }
  if (assetType !== 'stock' && assetType !== 'fii') {
    return { error: 'Selecione o tipo do ativo.' }
  }

  const parsed = parseCommon(formData)
  if ('error' in parsed) return { error: parsed.error }

  // Validate the ticker against brapi before persisting.
  const quote = await fetchQuote(ticker)
  if (!quote.ok) {
    if (quote.reason === 'invalid_ticker') {
      return { error: `Ticker ${ticker} não encontrado na brapi.` }
    }
    return { error: `Não foi possível validar o ticker agora (${quote.message}).` }
  }

  const { error } = await supabase.from('portfolio_positions').insert({
    user_id: user.id,
    ticker,
    asset_type: assetType,
    quantity: parsed.quantity,
    avg_price: parsed.avgPrice,
  })
  if (error) {
    if (error.code === '23505') {
      return { error: `${ticker} já está na carteira. Edite a posição existente.` }
    }
    return { error: 'Erro ao salvar a posição.' }
  }

  revalidatePath('/dashboard')
  return undefined
}

export async function updatePosition(
  _prev: PositionFormState,
  formData: FormData,
): Promise<PositionFormState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Posição inválida.' }

  const parsed = parseCommon(formData)
  if ('error' in parsed) return { error: parsed.error }

  const { error } = await supabase
    .from('portfolio_positions')
    .update({
      quantity: parsed.quantity,
      avg_price: parsed.avgPrice,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: 'Erro ao atualizar a posição.' }

  revalidatePath('/dashboard')
  return undefined
}

export async function removePosition(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const id = String(formData.get('id') ?? '')
  if (!id) return

  await supabase
    .from('portfolio_positions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/dashboard')
}
