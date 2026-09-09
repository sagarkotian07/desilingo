import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // There is a lockfile above this directory, so Turbopack's root inference is
  // ambiguous. Pin it to this project.
  turbopack: { root: import.meta.dirname },
}

export default nextConfig
