import { routes, type VercelConfig } from '@vercel/config/v1'

export const config: VercelConfig = {
  framework: 'nextjs',

  // Sarvam's API is in India. The default region is Washington, so every
  // pronunciation attempt would otherwise cross the Pacific twice before the
  // learner sees a verdict. Static pages still serve from the CDN edge.
  regions: ['bom1'],

  headers: [
    // Clip filenames are content hashes, so a cached file can never be stale.
    // Next only long-caches /_next/static by default; without this rule every
    // repeat visit revalidates each MP3 and we lose the point of pre-generating.
    routes.cacheControl('/audio/(.*)', { public: true, maxAge: '1 year', immutable: true }),
  ],
}

export default config
