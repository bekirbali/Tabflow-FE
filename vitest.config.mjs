import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { transformSync } from 'rolldown/utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsxInJsPlugin = {
  name: 'jsx-in-js-plugin',
  enforce: 'pre',
  transform(code, id) {
    if (id.includes('app') && id.endsWith('.js') && (code.includes('</') || code.includes('/>') || code.includes('<div') || code.includes('<article') || code.includes('<form'))) {
      const result = transformSync(id, code, {
        lang: 'jsx',
        sourcemap: true,
      });
      return {
        code: result.code,
        map: result.map,
      };
    }
  },
};

export default defineConfig({
  plugins: [
    jsxInJsPlugin,
    react(),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.js'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
