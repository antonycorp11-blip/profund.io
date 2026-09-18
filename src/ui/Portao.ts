/**
 * O portao: quem nao tem a senha ve "em atualizacao".
 *
 * ISTO NAO E SEGURANCA, E CORTINA.
 *
 * O jogo e estatico e roda inteiro no navegador, entao a verificacao acontece
 * na maquina de quem esta olhando — qualquer pessoa com o console aberto passa
 * por cima em segundos. Guardar a senha como hash nao muda isso; so evita que
 * ela apareca de graca para quem abrir o bundle e usar a busca.
 *
 * O que isto resolve de verdade: um testador que abre o link sem senha ve uma
 * tela de manutencao em vez de ver bug pela metade. E o suficiente para o que
 * foi pedido, e e so isso que ele faz.
 */

/** djb2. Serve para nao deixar "1425" escrito por extenso no bundle. */
function embaralhar(texto: string): number {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h * 33) ^ texto.charCodeAt(i)) >>> 0;
  return h;
}

const SENHA = 2085875303;
const CHAVE = 'profundezas:acesso';

/** Ja liberado nesta maquina? Quem entrou uma vez nao redigita. */
export function liberado(): boolean {
  try {
    return localStorage.getItem(CHAVE) === String(SENHA);
  } catch {
    // Navegador anonimo ou armazenamento bloqueado: pede a senha de novo.
    return false;
  }
}

function guardar(): void {
  try {
    localStorage.setItem(CHAVE, String(SENHA));
  } catch {
    // Sem onde guardar, ele entra assim mesmo — so vai redigitar na proxima.
  }
}

/**
 * Resolve quando o jogo pode comecar.
 *
 * Se ja estiver liberado, resolve na hora e o portao nem chega a piscar.
 */
export function esperarLiberacao(): Promise<void> {
  const portao = document.getElementById('portao');
  if (!portao) return Promise.resolve();

  if (liberado()) {
    portao.remove();
    return Promise.resolve();
  }

  portao.removeAttribute('hidden');
  const form = document.getElementById('portao-form') as HTMLFormElement | null;
  const campo = document.getElementById('portao-senha') as HTMLInputElement | null;
  const aviso = document.getElementById('portao-aviso');
  campo?.focus();

  return new Promise<void>((resolve) => {
    const tentar = (): void => {
      const digitado = (campo?.value ?? '').trim();
      if (embaralhar(digitado) !== SENHA) {
        if (aviso) {
          aviso.textContent = 'Senha incorreta.';
          aviso.hidden = false;
        }
        if (campo) {
          campo.value = '';
          campo.focus();
        }
        return;
      }
      guardar();
      portao.remove();
      resolve();
    };

    /*
     * Um `submit`, e nao um clique mais um `keydown`.
     *
     * A primeira versao ouvia clique no botao e Enter no campo. O clique
     * funcionava e o Enter nao — e adivinhar nome de tecla ia continuar
     * falhando no teclado do celular, onde a tecla se chama "Ir" ou "Buscar"
     * dependendo do aparelho. O navegador ja sabe o que e enviar um formulario.
     */
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      tentar();
    });
    // Esconde o aviso assim que ele comeca a corrigir.
    campo?.addEventListener('input', () => {
      if (aviso) aviso.hidden = true;
    });
  });
}
