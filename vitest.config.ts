import { cloudflareTest } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [cloudflareTest({
    wrangler: { configPath: './wrangler.jsonc' },
    // Isolated test-only value; never used by wrangler deployments.
    miniflare: { bindings: {
      ALLOWED_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173',
      ROOM_TOKEN_SECRET: 'x'.repeat(48),
    } },
  })],
  test: { include: ['tests/**/*.test.ts'], testTimeout: 10_000 },
})
