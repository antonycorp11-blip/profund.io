/** Contrato comum de tudo que o jogador pode "usar" com o botao AGIR. */
export interface Interactable {
  id: string;
  /** Centro em pixels de mundo. */
  x: number;
  y: number;
  radius: number;
  /** Texto do prompt (null = nao interagivel agora). */
  prompt(): string | null;
  interact(): void;
  update?(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  /** Desenhado depois da iluminacao (brilhos, balões). */
  renderOverlay?(ctx: CanvasRenderingContext2D): void;
}
