import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'

// ── Button ────────────────────────────────────────────────────────────────────

describe('Button', () => {
  it('renderiza el texto del botón', () => {
    render(<Button>Guardar</Button>)
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
  })

  it('llama onClick al hacer click', async () => {
    const user = userEvent.setup()
    let clicked = false
    render(<Button onClick={() => { clicked = true }}>Click</Button>)
    await user.click(screen.getByRole('button'))
    expect(clicked).toBe(true)
  })

  it('está deshabilitado cuando loading=true', () => {
    render(<Button loading>Cargando</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('está deshabilitado cuando disabled=true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('no dispara onClick cuando está deshabilitado', async () => {
    const user = userEvent.setup()
    let clicked = false
    render(<Button disabled onClick={() => { clicked = true }}>No click</Button>)
    await user.click(screen.getByRole('button'))
    expect(clicked).toBe(false)
  })

  it('muestra spinner cuando loading=true', () => {
    render(<Button loading>Guardar</Button>)
    expect(screen.getByRole('button').querySelector('svg')).toBeTruthy()
  })

  it('aplica variante danger', () => {
    render(<Button variant="danger">Eliminar</Button>)
    expect(screen.getByRole('button').className).toContain('bg-red-500')
  })

  it('aplica tamaño sm', () => {
    render(<Button size="sm">Pequeño</Button>)
    expect(screen.getByRole('button').className).toContain('px-3')
  })
})

// ── Badge ─────────────────────────────────────────────────────────────────────

describe('Badge', () => {
  it('renderiza el texto del badge', () => {
    render(<Badge>Activo</Badge>)
    expect(screen.getByText('Activo')).toBeInTheDocument()
  })

  it('aplica variante activo (verde)', () => {
    render(<Badge variant="activo">Activo</Badge>)
    expect(screen.getByText('Activo').className).toContain('emerald')
  })

  it('aplica variante urgente (rojo)', () => {
    render(<Badge variant="urgente">Urgente</Badge>)
    expect(screen.getByText('Urgente').className).toContain('red')
  })

  it('aplica variante pendiente (amarillo)', () => {
    render(<Badge variant="pendiente">Pendiente</Badge>)
    expect(screen.getByText('Pendiente').className).toContain('amber')
  })

  it('aplica clase extra con className prop', () => {
    render(<Badge className="test-class">Label</Badge>)
    expect(screen.getByText('Label').className).toContain('test-class')
  })
})

// ── Avatar ────────────────────────────────────────────────────────────────────

describe('Avatar', () => {
  it('muestra iniciales de nombre completo', () => {
    render(<Avatar nombre="María José Fernández" />)
    expect(screen.getByText('MJ')).toBeInTheDocument()
  })

  it('muestra iniciales de nombre simple', () => {
    render(<Avatar nombre="Carlos Muñoz" />)
    expect(screen.getByText('CM')).toBeInTheDocument()
  })

  it('muestra primeras 2 letras si hay un solo nombre', () => {
    render(<Avatar nombre="Praxis" />)
    expect(screen.getByText('PR')).toBeInTheDocument()
  })

  it('tiene title con el nombre completo', () => {
    render(<Avatar nombre="Ana López" />)
    const el = screen.getByTitle('Ana López')
    expect(el).toBeInTheDocument()
  })

  it('mismo nombre siempre produce el mismo color', () => {
    const { container: c1 } = render(<Avatar nombre="Juan Pérez" />)
    const { container: c2 } = render(<Avatar nombre="Juan Pérez" />)
    const cls1 = c1.firstChild as HTMLElement
    const cls2 = c2.firstChild as HTMLElement
    expect(cls1.className).toBe(cls2.className)
  })

  it('aplica tamaño sm', () => {
    render(<Avatar nombre="Test" size="sm" />)
    expect(screen.getByTitle('Test').className).toContain('w-8')
  })

  it('aplica tamaño lg', () => {
    render(<Avatar nombre="Test" size="lg" />)
    expect(screen.getByTitle('Test').className).toContain('w-14')
  })
})
