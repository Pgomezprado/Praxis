import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isLoginPage = pathname.startsWith('/login')
  const isPublicApiRoute =
    pathname.startsWith('/api/public/') ||
    pathname.startsWith('/api/superadmin/') ||
    pathname === '/api/arco' ||
    pathname === '/api/demo-request' ||
    pathname === '/api/onboarding'
  const isPublicPage =
    pathname === '/' ||
    pathname.startsWith('/agendar') ||
    pathname.startsWith('/activar-cuenta') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/superadmin') ||
    pathname.startsWith('/privacidad') ||
    pathname.startsWith('/terminos') ||
    isPublicApiRoute

  // Rutas que requieren verificar el rol en DB
  const needsRoleCheck =
    isLoginPage ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/medico')

  if (!user && !isLoginPage && !isPublicPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && needsRoleCheck) {
    // Consultar rol solo cuando la ruta lo requiere — evita query en cada request
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol, es_doctor')
      .eq('id', user.id)
      .single()

    const rol = usuario?.rol as string | undefined
    const esDoctor = usuario?.es_doctor === true

    // Redirigir desde /login al dashboard correcto
    if (isLoginPage) {
      if (rol === 'doctor') {
        return NextResponse.redirect(new URL('/medico/inicio', request.url))
      } else if (rol === 'admin_clinica') {
        return NextResponse.redirect(new URL('/admin', request.url))
      } else if (rol) {
        return NextResponse.redirect(new URL('/inicio', request.url))
      }
      // Si no se pudo determinar el rol, dejar pasar al login
      return supabaseResponse
    }

    // Proteger /admin/* — solo admin_clinica
    if (pathname.startsWith('/admin') && rol !== 'admin_clinica') {
      return NextResponse.redirect(new URL('/inicio', request.url))
    }

    // Proteger /medico/* — doctor o admin_clinica con es_doctor
    if (pathname.startsWith('/medico') && rol !== 'doctor' && !(rol === 'admin_clinica' && esDoctor)) {
      return NextResponse.redirect(new URL('/inicio', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
