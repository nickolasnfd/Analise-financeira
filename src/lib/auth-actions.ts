'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AuthState = { error?: string; message?: string } | undefined

// Single action for the login form; `intent` selects login vs. signup.
export async function authenticate(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const intent = formData.get('intent')
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Preencha email e senha.' }
  }

  const supabase = await createClient()

  if (intent === 'signup') {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }
    return {
      message:
        'Conta criada. Se a confirmação por email estiver ativa, confirme pelo link enviado e depois entre.',
    }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: 'Email ou senha inválidos.' }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
