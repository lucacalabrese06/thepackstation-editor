import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// The editor runs on the server (Cloudflare) so it can sign people in and
// save to GitHub without exposing any secrets to the browser.
export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  security: { checkOrigin: true },
});
