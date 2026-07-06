export type AssetType = 'stock' | 'fii'

export type Position = {
  id: string
  ticker: string
  asset_type: AssetType
  quantity: number
  avg_price: number
  created_at: string
  updated_at: string
}
