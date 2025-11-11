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
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors. Use with caution.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors. Use with caution.
    ignoreBuildErrors: false,
  },
  // Handle pdf-parse as server-side external package
  serverExternalPackages: ['pdf-parse'],
}

module.exports = nextConfig
