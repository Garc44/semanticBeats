import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const kabelsalatStub = fileURLToPath(new URL('./eval/node-hooks/kabelsalat-stub.mjs', import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Headless Strudel for eval/: stub the broken @kabelsalat/web import and inline
    // @strudel/* so the alias reaches imports inside node_modules. Tests only.
    alias: { '@kabelsalat/web': kabelsalatStub },
    server: { deps: { inline: [/@strudel\//] } },
  },
});
