import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/reports/export': ['./src/assets/fonts/**/*'],
    '/api/cron/monthly-report': ['./src/assets/fonts/**/*'],
  },
}

export default nextConfig
