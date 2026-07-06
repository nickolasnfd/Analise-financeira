export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="h-8 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-6 h-20 animate-pulse rounded-lg bg-black/5 dark:bg-white/5" />
      <div className="mt-6 h-24 animate-pulse rounded-lg bg-black/5 dark:bg-white/5" />
      <p className="mt-4 text-sm text-black/50 dark:text-white/50">
        Carregando carteira…
      </p>
    </main>
  )
}
