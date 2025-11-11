/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Temporarily disable Turbopack for build due to module resolution issues
  // Re-enable once Turbopack issues are resolved in future Next.js versions
  // Use webpack instead for more stable builds
}

module.exports = nextConfig
