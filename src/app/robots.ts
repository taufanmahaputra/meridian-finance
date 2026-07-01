import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // Nearly everything past login requires an authenticated session, so
      // there's little for an anonymous crawler to actually index besides
      // the sign-in page itself.
      allow: ['/', '/login'],
      disallow: [
        '/home', '/dashboard', '/monthly', '/transactions', '/budget',
        '/forecast', '/insights', '/upload', '/settings', '/invest', '/api',
      ],
    },
  };
}
