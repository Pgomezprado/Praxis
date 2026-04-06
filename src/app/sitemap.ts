import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://praxisapp.cl',
      lastModified: new Date('2026-04-06'), // actualizar al hacer cambios de contenido significativos
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      // Portal público de agendamiento — indexable para que pacientes encuentren clínicas
      url: 'https://praxisapp.cl/agendar',
      lastModified: new Date('2026-04-06'),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: 'https://praxisapp.cl/privacidad',
      lastModified: new Date('2026-01-01'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://praxisapp.cl/terminos',
      lastModified: new Date('2026-01-01'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
