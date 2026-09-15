/** Contrato comum de tudo que o jogador pode "usar" ao chegar perto. */
export interface Interactable {
  id: string;
  /** Centro em pixels de mundo. */
  x: number;
  y: number;
  radius: number;
  /** Texto do prompt (null = nao interagivel agora). */
  prompt(): string | null;
  interact(): void;
  /**
   * Dispara sozinho ao entrar no raio?
   *
   * Vale para o que e instantaneo e desejado (entregar no deposito, ler uma
   * pista, resgatar alguem). NAO vale para o que abre tela: passar perto da
   * oficina nao pode sequestrar o jogo — esses continuam pedindo um toque no
   * proprio aviso na tela.
   */
  auto?: boolean;
  update?(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  /** Desenhado depois da iluminacao (brilhos, balões). */
  renderOverlay?(ctx: CanvasRenderingContext2D): void;
}
