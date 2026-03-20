import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Rate limiting: máx. 3 solicitudes de demo por email por hora (serverless-safe, basado en DB)
const DEMO_RATE_LIMIT = 3
const DEMO_WINDOW_MS  = 60 * 60 * 1000 // 1 hora

interface DemoRequest {
  nombre: string
  clinica: string
  email: string
  telefono: string
}

export async function POST(request: Request) {
  try {
    const body: DemoRequest = await request.json()
    const { nombre, clinica, email, telefono } = body

    if (!nombre || !clinica || !email || !telefono) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
    }

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
    }
    if (nombre?.length > 100 || clinica?.length > 100 || telefono?.length > 30) {
      return NextResponse.json({ error: 'Datos demasiado largos.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Rate limiting por email: contar solicitudes recientes en DB (serverless-safe)
    const windowStart = new Date(Date.now() - DEMO_WINDOW_MS).toISOString()
    const { count: recentCount } = await supabase
      .from('demo_requests')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', windowStart)

    if ((recentCount ?? 0) >= DEMO_RATE_LIMIT) {
      return NextResponse.json(
        { error: 'Has alcanzado el límite de solicitudes por hora. Intenta más tarde.' },
        { status: 429 }
      )
    }

    // Persistir solicitud en DB
    const { error: dbError } = await supabase
      .from('demo_requests')
      .insert({ nombre, clinica, email, telefono })

    if (dbError) {
      console.error('Error al persistir solicitud de demo:', dbError)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    // TODO: Integrar Resend cuando esté configurado
    // import { Resend } from 'resend'
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({
    //   from: 'Praxis <noreply@praxisapp.cl>',
    //   to: 'contacto@praxisapp.cl',
    //   subject: `Nueva solicitud de demo — ${nombre} (${clinica})`,
    //   html: `<p><b>Nombre:</b> ${nombre}</p><p><b>Clínica:</b> ${clinica}</p><p><b>Email:</b> ${email}</p><p><b>Teléfono:</b> ${telefono}</p>`,
    // })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
