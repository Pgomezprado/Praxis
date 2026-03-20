# Praxis — Historia Clínica Electrónica

Sistema de Historia Clínica Electrónica (HCE) SaaS para clínicas y consultorios médicos en Chile.

**Dominio:** praxisapp.cl

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js (App Router) + TypeScript |
| UI | Tailwind CSS + lucide-react |
| Auth + DB | Supabase (PostgreSQL + RLS) |
| IA | Anthropic Claude (resumen de consultas) |
| Email | Resend |
| Deploy | Vercel |

---

## Requisitos

- Node.js 20+
- npm 10+
- Cuenta en [Supabase](https://supabase.com) (proyecto creado)
- Cuenta en [Anthropic](https://console.anthropic.com) (API key)
- Cuenta en [Resend](https://resend.com) (API key + dominio verificado)

---

## Variables de entorno

Copia `.env.example` y completa con tus valores reales:

```bash
cp .env.example .env.local
```

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key pública de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (solo en servidor) |
| `ANTHROPIC_API_KEY` | API key de Anthropic |
| `CLINICA_SLUG` | Slug de la clínica activa (ej: `demo`) |
| `RESEND_API_KEY` | API key de Resend |
| `RESEND_FROM` | Remitente de emails (ej: `Praxis <no-reply@praxisapp.cl>`) |

---

## Levantar en local

```bash
# Instalar dependencias
npm install

# Levantar servidor de desarrollo
npm run dev
```

La app estará disponible en [http://localhost:3000](http://localhost:3000).

---

## Migraciones de base de datos

Las migraciones están en `supabase/migrations/`. Para aplicarlas:

**Opción 1 — Supabase Dashboard (recomendado para piloto):**
1. Ve a tu proyecto en [supabase.com](https://supabase.com)
2. SQL Editor → New query
3. Pega y ejecuta cada archivo en orden (`001_initial.sql`, `002_seed_piloto.sql`, etc.)

**Opción 2 — Supabase CLI:**
```bash
# Instalar CLI
npm install -g supabase

# Vincular proyecto
supabase link --project-ref <tu-project-ref>

# Aplicar migraciones
supabase db push
```

**Orden de migraciones:**
```
001_initial.sql              → Esquema completo + RLS + triggers
002_seed_piloto.sql          → Datos clínica demo (editar email antes de correr)
003_fix_rls.sql              → Ajustes RLS
004_add_pacientes_fields.sql → Campos adicionales pacientes
005_add_usuarios_fields.sql  → Campos adicionales usuarios
006_create_citas.sql         → Tabla citas
007_create_horarios.sql      → Tabla horarios (JSONB por médico)
008_clinica_config.sql       → Configuración de clínica
009_es_doctor.sql            → Función helper is_doctor()
```

> **Antes de correr `002_seed_piloto.sql`:** editar el email en la línea `WHERE email = '...'` con el usuario que creaste en Supabase Authentication.

---

## Estructura de carpetas

```
medhistorial/
├── middleware.ts              → Protección de rutas + redirección por rol
├── src/
│   ├── app/                   → Rutas (App Router)
│   │   ├── (public)/          → Sin auth: landing, agendar, activar-cuenta
│   │   ├── (auth)/            → Login
│   │   ├── (dashboard)/       → Recepcionista
│   │   ├── (medico)/          → Médico
│   │   ├── (admin)/           → Administrador de clínica
│   │   └── api/               → API routes
│   │       ├── public/        → Endpoints sin auth (portal paciente)
│   │       ├── arco/          → Solicitudes ARCO (Ley 19.628)
│   │       └── demo-request/  → Formulario de contacto
│   ├── components/
│   │   ├── ui/                → Design system: Button, Input, Card, Badge, Avatar
│   │   ├── layout/            → Header, Sidebar
│   │   ├── landing/           → Secciones de la landing page
│   │   ├── agendamiento/      → Portal de agendamiento público
│   │   ├── admin/             → Componentes panel administrador
│   │   ├── medico/            → Componentes panel médico
│   │   ├── secretaria/        → Componentes panel recepcionista
│   │   ├── paciente/          → Ficha del paciente
│   │   └── consulta/          → Formulario de consulta
│   ├── lib/
│   │   ├── supabase/          → Clientes Supabase (browser, server, admin)
│   │   ├── anthropic/         → Singleton Anthropic SDK
│   │   ├── email/             → Templates de email
│   │   ├── queries/           → Queries pre-buildadas para agenda
│   │   └── utils/             → Formatters (RUT, fechas, edad)
│   └── types/
│       └── database.ts        → Tipos TypeScript del esquema DB
└── supabase/
    └── migrations/            → Archivos SQL en orden numérico
```

---

## Roles de usuario

| Rol | Acceso |
|-----|--------|
| `admin_clinica` | `/admin/*` — gestión completa de la clínica |
| `doctor` | `/medico/*` — agenda y consultas propias |
| `recepcionista` | `/inicio`, `/pacientes`, `/agenda` |

---

## Comandos útiles

```bash
npm run dev        # Servidor de desarrollo
npm run build      # Build de producción
npm run lint       # Linter
npm run typecheck  # Verificación de tipos TypeScript
```
