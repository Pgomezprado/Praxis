import { createClient } from '@/lib/supabase/server'
import { formatFecha } from '@/lib/utils/formatters'
import type { Usuario } from '@/types/database'

export const metadata = { title: 'Administración — Praxis' }

type UsuarioRow = Pick<Usuario, 'id' | 'nombre' | 'email' | 'especialidad' | 'rol' | 'activo'>
type PacienteRow = { id: string; nombre: string; rut: string; created_at: string }
type ConsultaRow = { id: string; fecha: string; motivo: string | null }

export default async function AdminPage() {
  const supabase = await createClient()

  const [usuariosRes, pacientesRes, consultasRes] = await Promise.all([
    supabase.from('usuarios').select('id, nombre, email, especialidad, rol, activo').eq('activo', true).order('nombre'),
    supabase.from('pacientes').select('id, nombre, rut, created_at').eq('activo', true).order('nombre').limit(50),
    supabase.from('consultas').select('id, fecha, motivo').order('fecha', { ascending: false }).limit(10),
  ])

  const usuarios = usuariosRes.data as UsuarioRow[] | null
  const pacientes = pacientesRes.data as PacienteRow[] | null
  const consultas = consultasRes.data as ConsultaRow[] | null

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Panel de administración</h2>
        <p className="text-slate-500 mt-1 text-base">Gestión de usuarios, pacientes y actividad</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Médicos activos', value: usuarios?.filter(u => u.rol === 'doctor').length ?? 0, icon: '👨‍⚕️' },
          { label: 'Pacientes', value: pacientes?.length ?? 0, icon: '🏥' },
          { label: 'Consultas recientes', value: consultas?.length ?? 0, icon: '📋' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="text-3xl mb-2">{stat.icon}</div>
            <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-slate-500 text-base mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Equipo médico */}
      <section>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Equipo médico</h3>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-4 gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-600">
            <span>Nombre</span>
            <span>Email</span>
            <span>Especialidad</span>
            <span>Rol</span>
          </div>
          {!usuarios || usuarios.length === 0 ? (
            <p className="px-5 py-8 text-center text-slate-500">Sin usuarios registrados.</p>
          ) : (
            usuarios.map((u) => (
              <div key={u.id} className="grid grid-cols-4 gap-4 px-5 py-4 border-b border-slate-100 last:border-0">
                <span className="text-base font-medium text-slate-800">{u.nombre}</span>
                <span className="text-base text-slate-600">{u.email}</span>
                <span className="text-base text-slate-600">{u.especialidad ?? '—'}</span>
                <span className="text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium border ${
                    u.rol === 'admin_clinica'
                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                      : u.rol === 'doctor'
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {u.rol}
                  </span>
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Últimas consultas */}
      <section>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Actividad reciente</h3>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {!consultas || consultas.length === 0 ? (
            <p className="px-5 py-8 text-center text-slate-500">Sin actividad reciente.</p>
          ) : (
            consultas.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-4 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-base font-medium text-slate-800">Consulta registrada</p>
                  {c.motivo && <p className="text-sm text-slate-500 mt-0.5">{c.motivo}</p>}
                </div>
                <span className="text-sm text-slate-400">{formatFecha(c.fecha)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
