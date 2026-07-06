export const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const dec = (n: number) =>
  n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

export const pct = (n: number) => `${n >= 0 ? '+' : ''}${dec(n)}%`

export const dateTime = (iso: string) => new Date(iso).toLocaleString('pt-BR')
