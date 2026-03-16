# Praxis — Contexto del Proyecto para Claude Code

## ¿Qué es Praxis?
Sistema de Historia Clínica Electrónica (HCE) en etapa MVP bajo el dominio praxisapp.cl.

## Stack Tecnológico
- **Framework:** Next.js (App Router)
- **UI:** React + TypeScript
- **Estilos:** Tailwind CSS
- **Íconos:** lucide-react
- **Deploy:** praxisapp.cl

---

## Identidad Visual

### Paleta de colores (usar siempre estas variables)
```css
/* globals.css */
--color-primary: #1D4ED8;
--color-primary-light: #3B82F6;
--color-accent: #0EA5E9;
--color-bg: #F8FAFC;
--color-surface: #FFFFFF;
--color-text: #0F172A;
--color-muted: #64748B;
--color-success: #10B981;
--color-warning: #F59E0B;
--color-danger: #EF4444;
```

### Tipografía
- Fuente principal: **Inter** (Google Fonts)
- Títulos: font-bold, tracking normal
- Cuerpo: font-normal, line-height relajado

### Estilo general
- Limpio, profesional, minimalista médico
- Inspirado en: Linear, Elation Health
- Bordes: `rounded-xl` como estándar
- Sombras: suaves (`shadow-sm`, `shadow-md`)
- Fondo de página: `bg-slate-50`

---

## Estructura de Rutas

```
/login                    → Página de acceso (requiere auth)
/dashboard                → Vista principal del médico (requiere auth)
/pacientes                → Listado de pacientes (requiere auth)
/pacientes/[id]           → Ficha individual del paciente (requiere auth)
/agenda                   → Agenda interna — vista secretaria/médico (requiere auth)
/configuracion            → Ajustes del sistema (requiere auth)

/agendar                  → Portal público — paso 1: buscar médico (SIN auth)
/agendar/[medicoId]       → Portal público — paso 2: elegir hora (SIN auth)
/agendar/confirmar        → Portal público — paso 3: datos del paciente (SIN auth)
/agendar/exito            → Portal público — paso 4: confirmación final (SIN auth)
```

## Estructura de Archivos Clave

```
app/
  layout.tsx                    → Layout global (sidebar + topbar) — solo rutas auth
  (auth)/login/                 → Página de login
  (app)/dashboard/              → Dashboard principal
  (app)/pacientes/              → Módulo pacientes
  (app)/agenda/                 → Agenda interna
  (public)/agendar/             → Portal público (layout propio, sin sidebar)
    page.tsx                    → Buscar médico / especialidad
    [medicoId]/page.tsx         → Calendario de disponibilidad
    confirmar/page.tsx          → Formulario datos paciente
    exito/page.tsx              → Confirmación exitosa
components/
  ui/                           → Design system base
    Button.tsx
    Input.tsx
    Card.tsx
    Badge.tsx
    Avatar.tsx
    Sidebar.tsx
  agendamiento/                 → Componentes exclusivos del portal público
    StepIndicator.tsx           → Barra de progreso 1→2→3→4
    MedicoCard.tsx              → Tarjeta de médico con foto, especialidad, rating
    CalendarioDisponibilidad.tsx → Calendario interactivo con slots disponibles
    ResumenCita.tsx             → Resumen lateral de la cita en construcción
lib/
  mock-data.ts                  → Datos mockeados para desarrollo
  agendamiento.ts               → Lógica de slots, disponibilidad, validaciones
```

---

## Reglas de Desarrollo

### Obligatorias
1. **Todo el texto en español (Chile)** — nombres, labels, mensajes de error, todo
2. **Solo Tailwind CSS** — sin estilos inline ni CSS custom, salvo variables en globals.css
3. **TypeScript estricto** — todos los componentes con props tipadas
4. **Mobile-first** — diseñar para móvil primero, luego expandir a desktop
5. **No romper autenticación existente** — solo mejorar UI sobre lo que ya funciona

### Buenas prácticas
- Datos mockeados siempre en `/lib/mock-data.ts`, nunca hardcodeados en componentes
- Usar `lucide-react` para todos los íconos
- Componentes reutilizables en `components/ui/`
- Un commit por feature: `feat: redesign login`, `feat: dashboard kpis`, etc.
- Transiciones suaves en navegación (framer-motion si disponible, si no CSS transitions)

### Nombrado
- Componentes: PascalCase (`PatientCard.tsx`)
- Funciones/hooks: camelCase (`usePatientData`)
- Constantes: UPPER_SNAKE_CASE (`MAX_RESULTS`)
- Clases Tailwind: orden lógico (layout → spacing → color → typography → estado)

---

## Componentes del Design System

Cada componente en `components/ui/` debe tener:

### Button
- Variantes: `primary` | `secondary` | `ghost` | `danger`
- Tamaños: `sm` | `md` | `lg`
- Estado: `loading` (spinner animado), `disabled`

### Input
- Label encima del campo
- Estado de error con mensaje y borde rojo
- Ícono opcional (izquierda o derecha)

### Card
- Header, body y footer opcionales
- Variante con borde izquierdo coloreado para alertas

### Badge
- Variantes de color para estados clínicos:
  - `activo` → verde
  - `pendiente` → amarillo
  - `urgente` → rojo
  - `completado` → gris

### Avatar
- Iniciales generadas desde el nombre
- Color de fondo determinístico por nombre
- Fallback a imagen si está disponible

---

## Datos Mockeados (lib/mock-data.ts)

Usar nombres y RUTs chilenos realistas. Ejemplo:
```typescript
export const mockPacientes = [
  {
    id: "1",
    nombre: "María José Fernández",
    rut: "12.345.678-9",
    edad: 42,
    prevision: "Fonasa",
    // ...
  }
]
```

---

## Contexto del Piloto

- Versión: **Praxis v1.0**
- Badge discreto en UI: `"Piloto Praxis v1.0"`
- No mostrar este badge en pantallas internas, solo en login

---

## Cómo Trabajar con Claude Code

Cuando recibas una tarea:
1. Lee este archivo primero para entender el contexto
2. Respeta la paleta de colores y estilo definidos aquí
3. Pregunta si algo no está claro antes de implementar
4. Muestra un preview o describe el enfoque antes de hacer cambios grandes
5. Commitea por tarea completada

---

## Módulo de Agendamiento

### Dos superficies distintas

**1. Portal público (`/agendar`) — para pacientes**
- No requiere login
- Layout propio: topbar simple con logo Praxis, sin sidebar
- Flujo de 4 pasos con barra de progreso visible siempre
- Optimizado para móvil (el paciente agenda desde su celular)
- Al final envía confirmación por email

**2. Agenda interna (`/agenda`) — para secretaria y médico**
- Requiere auth con rol `secretaria` o `medico`
- Vista semanal y diaria por médico
- Crear, editar, cancelar y reagendar citas manualmente
- Al modificar, notifica al paciente por email/SMS automáticamente

### Flujo portal público — detalle por paso

**Paso 1 — Buscar médico** (`/agendar`)
- Buscador por nombre o especialidad
- Grid de tarjetas: foto/avatar, nombre, especialidad, próxima hora disponible
- Filtro por especialidad (select)

**Paso 2 — Elegir hora** (`/agendar/[medicoId]`)
- Nombre y foto del médico seleccionado en el header
- Calendario mensual: días con disponibilidad en azul, sin disponibilidad en gris
- Al seleccionar día → muestra slots de hora (ej: 09:00, 09:30, 10:00...)
- Resumen lateral (desktop) o card inferior (móvil): médico, fecha, hora elegida

**Paso 3 — Datos del paciente** (`/agendar/confirmar`)
- Campos: nombre completo, RUT, email, teléfono, motivo de consulta
- Checkbox: "¿Primera consulta?"
- Checkbox: "Acepto recibir recordatorio por SMS"
- Validación de RUT chileno en tiempo real
- Resumen de la cita visible arriba del formulario

**Paso 4 — Confirmación** (`/agendar/exito`)
- Ícono de check animado
- Resumen completo: médico, fecha, hora, lugar
- Número de folio (ej: PRX-2024-0042)
- Botón "Agregar a Google Calendar"
- Texto: "Recibirás un email de confirmación en [email]"

### Componentes exclusivos del portal público (`components/agendamiento/`)

- `StepIndicator.tsx` — barra de progreso pasos 1→2→3→4
- `MedicoCard.tsx` — tarjeta con avatar, especialidad, próxima disponibilidad
- `CalendarioDisponibilidad.tsx` — calendario con slots disponibles/ocupados
- `ResumenCita.tsx` — resumen lateral/inferior de la cita en construcción

### Modelo de datos (agregar en lib/agendamiento.ts)

```typescript
type Cita = {
  id: string
  medicoId: string
  pacienteNombre: string
  pacienteRut: string
  pacienteEmail: string
  pacienteTelefono: string
  fecha: string         // "2024-03-15"
  hora: string          // "09:30"
  motivo: string
  estado: "pendiente" | "confirmada" | "cancelada" | "completada"
  folio: string         // "PRX-2024-0042"
  creadaEn: string
}

type SlotDisponible = {
  fecha: string
  hora: string
  disponible: boolean
}
```

### Datos mockeados de agendamiento (agregar en lib/mock-data.ts)

```typescript
export const mockMedicos = [
  {
    id: "m1",
    nombre: "Dr. Alejandro Muñoz",
    especialidad: "Medicina Interna",
    foto: null,
    rating: 4.8,
    proximaDisponibilidad: "Mañana 09:30",
  },
  {
    id: "m2",
    nombre: "Dra. Catalina Herrera",
    especialidad: "Cardiología",
    foto: null,
    rating: 4.9,
    proximaDisponibilidad: "Hoy 15:00",
  }
]

export const mockSlots: SlotDisponible[] = [
  { fecha: "2024-03-15", hora: "09:00", disponible: true },
  { fecha: "2024-03-15", hora: "09:30", disponible: false },
  { fecha: "2024-03-15", hora: "10:00", disponible: true },
]
```

### Servicios de notificación

- **Email:** Resend (`resend.com`) — gratuito hasta 3.000 emails/mes
- **SMS:** Twilio — configurar número chileno (+56)
- Templates en `lib/email-templates/`: confirmación, recordatorio 24h antes, cancelación

### Rutas públicas (sin auth) — agregar en middleware.ts

```typescript
const PUBLIC_ROUTES = ["/agendar", "/agendar/confirmar", "/agendar/exito"]
```

---

## Landing Page (praxisapp.cl)

### Ubicación y lógica de rutas

La landing reemplaza la raíz del sitio. El login pasa a vivir en `/login`.

```
praxisapp.cl          → Landing page (pública, sin auth)
praxisapp.cl/login    → Acceso al sistema (médicos y secretarias)
praxisapp.cl/agendar  → Portal de agendamiento (pacientes)
```

Configurar en `middleware.ts`:
```typescript
const PUBLIC_ROUTES = ["/", "/agendar", "/agendar/confirmar", "/agendar/exito"]
// Todo lo demás redirige a /login si no hay sesión
```

### Estructura de archivos

```
app/
  (public)/
    page.tsx              → Landing page (raíz)
    layout.tsx            → Layout sin sidebar: solo navbar + footer
  (public)/agendar/       → Portal paciente (ya definido)
components/
  landing/
    Navbar.tsx            → Logo + botón "Ingresar al sistema"
    HeroSection.tsx       → Headline, subheadline, dos CTAs
    ComoFunciona.tsx      → 3 pasos horizontales
    ParaQuienEs.tsx       → 3 segmentos: médicos, secretarias, clínicas
    CtaDemo.tsx           → Formulario de solicitud de demo
    Footer.tsx            → Logo, email, WhatsApp, copyright
```

### Secciones — detalle

**Navbar**
- Fondo blanco, borde inferior sutil (`border-b border-slate-100`)
- Izquierda: logo "Praxis" en azul + tagline "Sistema clínico inteligente"
- Derecha: botón ghost "Solicitar demo" (scroll a sección) + botón primary "Ingresar al sistema" → `/login`
- Sticky en scroll (`sticky top-0 z-50`)

**Hero**
- Layout dos columnas en desktop: texto izquierda, imagen/mockup derecha
- Headline: "El sistema clínico que simplifica tu consulta"
- Subheadline: "Historia clínica electrónica, agenda y evoluciones en un solo lugar. Diseñado para médicos chilenos."
- CTA primario: "Solicitar demo" → scroll a sección CtaDemo
- CTA secundario: "Contactar por WhatsApp" → `wa.me/+56993589027`
- Imagen derecha: mockup del dashboard (screenshot o ilustración)
- Fondo: gradiente sutil azul muy claro (`from-slate-50 to-blue-50`)

**Cómo funciona**
- Título: "Tres pasos para modernizar tu consulta"
- 3 cards horizontales con ícono (lucide-react), número, título y descripción:
  1. Registra al paciente — ficha clínica completa con antecedentes
  2. El paciente agenda su hora — portal de autoservicio 24/7
  3. Registra la evolución — notas SOAP, exámenes y recetas
- En móvil: columna vertical

**Para quién es**
- Título: "Hecho para equipos clínicos"
- 3 cards: Médicos / Secretarias / Clínicas y centros médicos
- Cada card: ícono, título, 3 bullets de beneficios concretos
- Fondo alterno gris claro (`bg-slate-50`)

**CTA Demo**
- Fondo azul (`bg-blue-700` texto blanco)
- Título: "Agenda una demo gratuita de 30 minutos"
- Subtítulo: "Te mostramos Praxis en acción con datos de tu clínica"
- Formulario (4 campos): Nombre, Clínica/Consultorio, Email, Teléfono
- Al enviar: POST a API route `/api/demo-request` → Resend email a contacto@praxisapp.cl
- Estado de éxito: mensaje de confirmación inline (sin redirect)

**Footer**
- 3 columnas: logo+tagline / contacto / legal
- Email: contacto@praxisapp.cl
- WhatsApp: botón con ícono → `wa.me/+56993589027`
- Links: Política de privacidad / Términos
- Copyright: "© 2024 Praxis · Todos los derechos reservados"
- Botón WhatsApp flotante en móvil (esquina inferior derecha)

### API route para formulario de demo

```typescript
// app/api/demo-request/route.ts
// Recibe: { nombre, clinica, email, telefono }
// Envía email a contacto@praxisapp.cl via Resend
// Responde: { success: true } o { error: string }
```

### Conexiones con la app

| Elemento | Destino | Método |
|---|---|---|
| Botón "Ingresar al sistema" | `/login` | `<Link href="/login">` |
| Botón "Solicitar demo" (navbar) | Scroll a `#cta-demo` | `scrollIntoView()` |
| Botón "Solicitar demo" (hero) | Scroll a `#cta-demo` | `scrollIntoView()` |
| Formulario demo | `contacto@praxisapp.cl` | `/api/demo-request` + Resend |
| Botón WhatsApp | `wa.me/+56XXXXXXXXX` | `<a target="_blank">` |
| Botón flotante WhatsApp (móvil) | `wa.me/+56XXXXXXXXX` | `fixed bottom-6 right-6` |

### Reglas específicas de la landing

1. **Cero imports del sistema interno** — la landing no importa nada de `(app)/`
2. **SEO básico**: meta title, description y og:image en `layout.tsx` del grupo público
3. **Sin autenticación**: el middleware debe excluir `/` explícitamente
4. **Performance**: imágenes con `next/image`, fuente Inter con `next/font`
5. **Animaciones**: solo `transition` de Tailwind, sin framer-motion en la landing
