import { defineConfig, type Plugin } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Carimba o build no service worker.
 *
 * Sem isso o cache do PWA mantem o nome entre deploys e o celular pode ficar
 * preso numa versao antiga — o pior tipo de bug para testar no telefone.
 */
/**
 * O carimbo do build, um so para o service worker e para a tela de Ajustes.
 *
 * Dentro do modulo antes era local do plugin: agora o mesmo numero vai para o
 * `sw.js` e para dentro do jogo, entao da para OLHAR no aparelho qual versao
 * esta rodando em vez de discutir se o deploy chegou.
 */
const BUILD_ID = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);

function stampServiceWorker(): Plugin {
  const buildId = BUILD_ID;
  return {
    name: 'profundezas:stamp-sw',
    apply: 'build',
    closeBundle() {
      const file = resolve(__dirname, 'dist/sw.js');
      try {
        const source = readFileSync(file, 'utf8');
        writeFileSync(file, source.replace('__BUILD_ID__', buildId));
        console.log(`[pwa] service worker carimbado: ${buildId}`);
      } catch {
        /* sem sw.js no dist: nada a fazer */
      }
    },
  };
}

export default defineConfig({
  // O carimbo entra no bundle como texto: a tela de Ajustes mostra ele.
  define: { __VERSAO__: JSON.stringify(BUILD_ID) },
  // Caminho relativo: funciona na raiz do dominio, em subpasta e no file://.
  base: './',
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  plugins: [stampServiceWorker()],
  build: {
    target: 'es2020',
    // Sourcemap so quando pedido: economiza ~700 kB por deploy.
    sourcemap: process.env.SOURCEMAP === '1',
    assetsInlineLimit: 0,
    reportCompressedSize: false,
  },
});
