import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')

  try {
    const supabase = await createClient()

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) return NextResponse.redirect(`${origin}/nueva-contrasena`)
      return NextResponse.redirect(`${origin}/recuperar-contrasena?error=${encodeURIComponent(error.message)}`)
    }

    if (token_hash) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'recovery',
      })
      if (!error) return NextResponse.redirect(`${origin}/nueva-contrasena`)
      return NextResponse.redirect(`${origin}/recuperar-contrasena?error=${encodeURIComponent(error.message)}`)
    }

    return NextResponse.redirect(`${origin}/recuperar-contrasena?error=sin_token`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'callback_error'
    return NextResponse.redirect(`${origin}/recuperar-contrasena?error=${encodeURIComponent(msg)}`)
  }
}
