import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') ?? 'invite'

  try {
    const supabase = await createClient()

    const isRecovery = type === 'recovery'
    const successRedirect = isRecovery ? `${origin}/nueva-contrasena` : `${origin}/activar-cuenta`
    const errorRedirect = isRecovery ? `${origin}/recuperar-contrasena` : `${origin}/activar-cuenta`

    // PKCE flow: ?code=
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) return NextResponse.redirect(successRedirect)
      return NextResponse.redirect(
        `${errorRedirect}?error=${encodeURIComponent(error.message)}`
      )
    }

    // Token hash flow: ?token_hash=&type=
    if (token_hash) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as 'invite' | 'recovery' | 'email' | 'signup',
      })
      if (!error) return NextResponse.redirect(successRedirect)
      return NextResponse.redirect(
        `${errorRedirect}?error=${encodeURIComponent(error.message)}`
      )
    }

    return NextResponse.redirect(`${origin}/activar-cuenta?error=sin_token`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'callback_error'
    return NextResponse.redirect(
      `${origin}/activar-cuenta?error=${encodeURIComponent(msg)}`
    )
  }
}
