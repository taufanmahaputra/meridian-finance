import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OlahDana — All-In-One Financial Platform',
    short_name: 'OlahDana',
    description: 'OlahAtur for budgeting and tracking, OlahSaham for investing — all in one platform.',
    start_url: '/home',
    display: 'standalone',
    background_color: '#faf9f7',
    theme_color: '#1f4690',
    icons: [
      { src: '/icon', sizes: '64x64', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
