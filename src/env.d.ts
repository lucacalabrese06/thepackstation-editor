/// <reference types="astro/client" />

type Runtime = import('@astrojs/cloudflare').Runtime<{
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SESSION_SECRET: string;
}>;

declare namespace App {
  interface Locals extends Runtime {
    user?: { login: string; name: string; avatar: string };
    gh?: import('./lib/github').GitHub;
  }
}
