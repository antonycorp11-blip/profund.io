import './style.css';
import './ui/expedition.css';
import './ui/cutscene.css';
import { Assets } from './core/Assets';
import { Game } from './core/Game';
import { esperarLiberacao } from './ui/Portao';
import { instalarTraducao } from './i18n/i18n';

// Antes de qualquer tela: o portao e o primeiro texto que o jogador ve.
instalarTraducao();

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
const uiRoot = document.getElementById('ui-root');

if (!canvas || !uiRoot) {
  throw new Error('Elementos base nao encontrados no index.html');
}

/**
 * A arte e carregada antes do jogo comecar.
 * Arquivo que nao existe nao e erro: o sistema correspondente usa o placeholder.
 */
/*
 * A arte carrega DURANTE o portao, mas o jogo so comeca depois dele.
 *
 * Sao duas esperas em paralelo de proposito: quem tem a senha digita enquanto
 * os assets baixam, e entra num jogo ja pronto em vez de esperar duas filas em
 * sequencia. O que o portao segura e o `start()` — enquanto ele nao cair, nada
 * e desenhado, e e por isso que ninguem sem senha ve um quadro do jogo.
 */
Promise.all([
  Assets.load().catch((err) => console.warn('[art] falha ao carregar assets', err)),
  esperarLiberacao(),
]).then(() => {
  document.getElementById('app')?.removeAttribute('data-trancado');
  const game = new Game(canvas, uiRoot);
  game.start();
  // Expoe para depuracao no console durante o desenvolvimento.
  (window as unknown as { game: Game }).game = game;
});

/**
 * PWA: registra o service worker e **se atualiza sozinho**.
 *
 * Instalado na tela inicial do iPhone, o app pode ficar dias sem recarregar o
 * documento — e a atualizacao so chegava reinstalando. Aqui: a cada volta para
 * o primeiro plano o registro e verificado; quando uma versao nova assume o
 * controle, o jogo salva e recarrega sozinho.
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    let reg: ServiceWorkerRegistration;
    try {
      reg = await navigator.serviceWorker.register('./sw.js');
    } catch {
      return; // sem offline; o jogo continua funcionando pela rede
    }

    // Na primeira instalacao o controlador tambem muda — ali nao se recarrega.
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      reloading = true;
      const game = (window as unknown as { game?: { save(): void } }).game;
      try {
        game?.save();
      } catch {
        /* salvar e melhor-esforco: a atualizacao nao pode travar aqui */
      }
      window.location.reload();
    });

    const check = (): void => {
      reg.update().catch(() => {
        /* offline: tenta na proxima */
      });
    };

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) check();
    });
    window.addEventListener('focus', check);
    // Rede de seguranca para quem deixa o jogo aberto.
    window.setInterval(check, 10 * 60 * 1000);
  });
}
