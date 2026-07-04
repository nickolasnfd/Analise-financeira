'use client'

import { useActionState } from 'react'
import { authenticate, type AuthState } from '@/lib/auth-actions'

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    authenticate,
    undefined,
  )

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-black/10 p-8 dark:border-white/15">
        <h1 className="text-xl font-semibold">Análise Financeira</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Entre para acompanhar sua carteira.
        </p>

        <form action={action} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-md border border-black/15 px-3 py-2 dark:border-white/20 dark:bg-transparent"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Senha
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              className="rounded-md border border-black/15 px-3 py-2 dark:border-white/20 dark:bg-transparent"
            />
          </label>

          {state?.error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {state.error}
            </p>
          )}
          {state?.message && (
            <p className="text-sm text-green-700 dark:text-green-400">
              {state.message}
            </p>
          )}

          <button
            type="submit"
            name="intent"
            value="login"
            disabled={pending}
            className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            Entrar
          </button>
          <button
            type="submit"
            name="intent"
            value="signup"
            disabled={pending}
            className="rounded-md border border-black/15 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-white/20"
          >
            Criar conta
          </button>
        </form>
      </div>
    </main>
  )
}
