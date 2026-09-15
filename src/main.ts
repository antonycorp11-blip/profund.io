import './style.css';
import { Assets } from './core/Assets';
import { Game } from './core/Game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
const uiRoot = document.getElementById('ui-root');

if (!canvas || !uiRoot) {
  throw new Error('Elementos base nao encontrados no index.html');
}

/**
 * A arte e carregada antes do jogo comecar.
 * Arquivo que nao existe nao e erro: o sistema correspondente usa o placeholder.
 */
Assets.load()
  .catch((err) => console.warn('[art] falha ao carregar assets', err))
  .then(() => {
    const game = new Game(canvas, uiRoot);
    game.start();
    // Expoe para depuracao no console durante o desenvolvimento.
    (window as unknown as { game: Game }).game = game;
  });

// PWA: registra o service worker apenas em producao.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline opcional */
    });
  });
}
