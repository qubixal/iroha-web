// @ts-check
import { defineConfig } from 'astro/config';

import starlight from '@astrojs/starlight';

// https://astro.build/config

export default defineConfig({
  site: 'https://qubixal.github.io',
  base: '/iroha-web',
  integrations: [starlight({
    title: 'iroha-web',
    sidebar: [
      { label: 'Getting Started', slug: 'getting-started' },
    ],
  })]
});
