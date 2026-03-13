import { NextResponse } from 'next/server'

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

    // TODO: Integrar Resend cuando esté configurado
    // import { Resend } from 'resend'
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({
    //   from: 'Praxis <noreply@praxisapp.cl>',
    //   to: 'contacto@praxisapp.cl',
    //   subject: `Nueva solicitud de demo — ${nombre} (${clinica})`,
    //   html: `<p><b>Nombre:</b> ${nombre}</p><p><b>Clínica:</b> ${clinica}</p><p><b>Email:</b> ${email}</p><p><b>Teléfono:</b> ${telefono}</p>`,
    // })

    console.log('[demo-request]', { nombre, clinica, email, telefono })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
