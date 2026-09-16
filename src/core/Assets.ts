import { ART, type ArtManifest } from '../data/art';
import { CREATURES } from '../data/creatures';
import { RESOURCES } from '../data/resources';

/** Nomes gravados por tools/slice-assets.mjs em public/art/skills. */
const SKILL_ICON_NAMES = [
  'power', 'speed', 'hardstone', 'ore_target', 'crit', 'crit_mult', 'fracture', 'charged',
  'cat_mining', 'pickup', 'magnet', 'radius', 'yield', 'luck', 'jackpot', 'backpack',
  'organize', 'cat_collect', 'boots', 'weight', 'jump', 'aircontrol', 'lantern', 'eye',
  'reach', 'legacy_mark', 'veteran_hand',
];

/**
 * Carregador de imagens tolerante a falhas.
 * Arquivo ausente nao e erro: o sistema correspondente cai no placeholder.
 */
class AssetsImpl {
  private images = new Map<string, HTMLImageElement>();
  private blocks = new Map<string, HTMLImageElement[]>();
  private backwalls: (HTMLImageElement[] | null)[] = [];
  /** Cores extraidas da propria textura, usadas pelas particulas. */
  private palettes = new Map<string, string[]>();

  /** True quando ao menos um bloco com textura foi carregado. */
  hasBlockArt = false;
  /** True quando ao menos uma animacao do personagem foi carregada. */
  hasCharacterArt = false;
  /** Quais tiras de animacao do heroi existem de fato. */
  readonly characterStrips = new Set<string>();
  /** Quais criaturas tem arte carregada. */
  readonly creatureArts = new Set<string>();
  hasCrackArt = false;
  hasBackgroundArt = false;
  private skillIcons = new Set<string>();
  /** Cache de imagens recoloridas: chave -> canvas. */
  private tinted = new Map<string, HTMLCanvasElement>();
  /** Cache do retrato da HUD: `undefined` = nao tentou, `null` = nao da. */
  private heroPortrait: string | null | undefined = undefined;
  private tintedSets = new Map<string, HTMLCanvasElement[]>();
  loaded = false;

  async load(manifest: ArtManifest = ART): Promise<void> {
    if (!manifest.enabled) {
      this.loaded = true;
      return;
    }

    const jobs: Promise<void>[] = [];

    for (const key of manifest.blockKeys) {
      jobs.push(this.loadVariants(manifest, key));
    }
    for (const key of manifest.backwallKeys) {
      jobs.push(this.loadVariants(manifest, key));
    }
    jobs.push(
      this.loadImage(manifest.basePath + manifest.character.dir + manifest.character.sheet).then(
        (img) => {
          if (!img) return;
          this.images.set('character', img);
          this.hasCharacterArt = true;
        }
      )
    );
    // Tiras por animacao. Cada uma que chegar substitui aquele estado; o que
    // faltar continua vindo da folha 4x4.
    for (const [name, strip] of Object.entries(manifest.character.strips)) {
      jobs.push(
        this.loadImage(manifest.basePath + manifest.character.dir + strip.file).then((img) => {
          if (!img) return;
          this.images.set('char:' + name, img);
          this.hasCharacterArt = true;
          this.characterStrips.add(name);
        })
      );
    }

    // Criaturas: uma imagem por animacao de cada bicho. O que faltar cai no
    // desenho vetorial daquela criatura, sem quebrar nada.
    const artes = new Set<string>();
    for (const def of CREATURES) {
      if (def.art) artes.add(def.art);
    }
    // Ajudantes usam a mesma pasta. A toupeira saiu do bestiario ao virar
    // coletora, e com ela a arte deixou de ser carregada — a toupeira virava
    // um retangulo marrom. Quem desenha do /creatures precisa pedir a arte
    // aqui, e nao depender de continuar sendo monstro.
    for (const art of ART.helperArts) artes.add(art);

    // Folhas de NPC: moradores de Blockia e mineiros presos.
    for (const npc of manifest.npcArts) {
      for (const anim of manifest.npcAnims) {
        jobs.push(
          this.loadImage(`${manifest.basePath}${manifest.npcDir}${npc}_${anim}.png`).then((img) => {
            if (img) this.images.set(`npc:${npc}:${anim}`, img);
          })
        );
      }
    }

    for (const art of artes) {
      for (const anim of manifest.creatureAnims) {
        jobs.push(
          this.loadImage(`${manifest.basePath}${manifest.creaturesDir}${art}_${anim}.png`).then(
            (img) => {
              if (!img) return;
              this.images.set(`creature:${art}:${anim}`, img);
              this.creatureArts.add(art);
            }
          )
        );
      }
    }

    for (const key of manifest.skyKeys) {
      jobs.push(
        this.loadImage(`${manifest.basePath}${manifest.bgDir}${key}.png`).then((img) => {
          if (!img) return;
          this.images.set('bg:' + key, img);
          this.hasBackgroundArt = true;
        })
      );
    }
    for (const bg of manifest.backgrounds) {
      jobs.push(
        this.loadImage(`${manifest.basePath}${manifest.bgDir}${bg.key}.png`).then((img) => {
          if (!img) return;
          this.images.set('bg:' + bg.key, img);
          this.hasBackgroundArt = true;
        })
      );
    }
    for (const [key, prop] of Object.entries(manifest.props)) {
      jobs.push(
        this.loadImage(`${manifest.basePath}${manifest.propsDir}${prop.file}`).then((img) => {
          if (img) this.images.set('prop:' + key, img);
        })
      );
    }
    for (const name of SKILL_ICON_NAMES) {
      jobs.push(
        this.loadImage(`${manifest.basePath}skills/${name}.png`).then((img) => {
          if (img) this.skillIcons.add(name);
        })
      );
    }
    jobs.push(
      this.loadImage(manifest.basePath + manifest.fx.dir + manifest.fx.cracks).then((img) => {
        if (!img) return;
        this.images.set('cracks', img);
        this.hasCrackArt = true;
      })
    );
    for (const key of manifest.iconKeys) {
      jobs.push(
        this.loadImage(`${manifest.basePath}${manifest.iconsDir}${key}.png`).then((img) => {
          if (img) this.images.set('icon:' + key, img);
        })
      );
      jobs.push(
        this.loadImage(`${manifest.basePath}${manifest.oreDir}${key}.png`).then((img) => {
          if (img) this.images.set('ore:' + key, img);
        })
      );
    }

    await Promise.all(jobs);

    this.backwalls = manifest.backwallKeys.map((k) => this.blocks.get(k) ?? null);
    this.buildTintedIcons();
    this.loaded = true;
  }

  private async loadVariants(manifest: ArtManifest, key: string): Promise<void> {
    const found: HTMLImageElement[] = [];
    const tries: Promise<HTMLImageElement | null>[] = [];
    for (let i = 0; i < manifest.blockVariants; i++) {
      tries.push(this.loadImage(`${manifest.basePath}${manifest.blocksDir}${key}_${i}.png`));
    }
    for (const img of await Promise.all(tries)) {
      if (img) found.push(img);
    }
    if (found.length > 0) {
      this.blocks.set(key, found);
      this.palettes.set(key, extractPalette(found[0]));
      this.hasBlockArt = true;
    }
  }

  private loadImage(src: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  /** Variacoes de textura de um bloco, ou null se a arte ainda nao existe. */
  blockVariants(key: string): HTMLImageElement[] | null {
    return this.blocks.get(key) ?? null;
  }

  /** Fundo de galeria por indice de camada (0 = terra, 1 = pedra, 2 = profundezas). */
  backwall(layer: number): HTMLImageElement[] | null {
    return this.backwalls[layer] ?? null;
  }

  /**
   * Recolore uma imagem mantendo o relevo.
   * O modo 'color' do canvas troca matiz e saturacao preservando a luminosidade,
   * que e exatamente o que precisamos para dar rocha propria a cada camada
   * sem gerar textura nova.
   */
  private tintImage(
    img: CanvasImageSource,
    w: number,
    h: number,
    color: string,
    strength: number
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    ctx.drawImage(img, 0, 0, w, h);
    ctx.globalAlpha = Math.max(0, Math.min(1, strength));
    ctx.globalCompositeOperation = 'color';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    // Recorta de volta ao alfa original (nao pintar fora da silhueta).
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(img, 0, 0, w, h);
    return canvas;
  }

  /** Variacoes de um bloco recoloridas para uma camada. */
  tintedBlockVariants(key: string, color: string, strength: number): HTMLCanvasElement[] | null {
    const cacheKey = `${key}|${color}|${strength}`;
    const cached = this.tintedSets.get(cacheKey);
    if (cached) return cached;
    const base = this.blocks.get(key);
    if (!base) return null;
    const made = base.map((img) => this.tintImage(img, img.width, img.height, color, strength));
    this.tintedSets.set(cacheKey, made);
    return made;
  }

  /** Folha do heroi recolorida — e assim que cada copia ganha cor propria. */
  tintedCharacter(color: string, strength: number): HTMLCanvasElement | null {
    const key = `char|${color}|${strength}`;
    const cached = this.tinted.get(key);
    if (cached) return cached;
    const src = this.images.get('character');
    if (!src) return null;
    const made = this.tintImage(src, src.width, src.height, color, strength);
    this.tinted.set(key, made);
    return made;
  }

  /** Recursos com `tintFrom` ganham icone derivado do icone de outro recurso. */
  private buildTintedIcons(): void {
    for (const def of Object.values(RESOURCES)) {
      if (!def.tintFrom || !def.tint) continue;
      const src = this.images.get('icon:' + def.tintFrom);
      if (src) {
        this.tinted.set(
          'icon:' + def.id,
          this.tintImage(src, src.width, src.height, def.tint, def.tintStrength ?? 0.8)
        );
      }
      const chunk = this.images.get('ore:' + def.tintFrom);
      if (chunk) {
        this.tinted.set(
          'ore:' + def.id,
          this.tintImage(chunk, chunk.width, chunk.height, def.tint, def.tintStrength ?? 0.8)
        );
      }
    }
  }

  /**
   * Paleta real do bloco (para estilhacos e poeira combinarem com a textura).
   * Null enquanto a arte nao existe — quem chama usa as cores de /data/blocks.ts.
   */
  blockPalette(key: string): string[] | null {
    return this.palettes.get(key) ?? null;
  }

  /** Folha do personagem, ou null se ainda nao existe. */
  character(): HTMLImageElement | null {
    return this.images.get('character') ?? null;
  }

  /** Quadro de animacao de uma criatura, ou null quando nao ha arte. */
  creature(art: string, anim: string): HTMLImageElement | null {
    return this.images.get(`creature:${art}:${anim}`) ?? null;
  }

  /** Tira de uma animacao do heroi, ou null quando aquele arquivo nao existe. */
  characterStrip(name: string): HTMLImageElement | null {
    return this.images.get('char:' + name) ?? null;
  }

  /** Tira de animacao de um NPC, ou null quando a folha nao existe. */
  npcStrip(id: string, anim: string): HTMLImageElement | null {
    return this.images.get(`npc:${id}:${anim}`) ?? null;
  }

  /** Tira recolorida — e assim que cada copia ganha cor propria. */
  tintedStrip(name: string, color: string, strength: number): HTMLCanvasElement | null {
    const key = `strip|${name}|${color}|${strength}`;
    const cached = this.tinted.get(key);
    if (cached) return cached;
    const src = this.images.get('char:' + name);
    if (!src) return null;
    const made = this.tintImage(src, src.width, src.height, color, strength);
    this.tinted.set(key, made);
    return made;
  }

  /** Folha de rachaduras (2x2), ou null. */
  cracks(): HTMLImageElement | null {
    return this.images.get('cracks') ?? null;
  }

  /** Fundo com parallax, ou null. */
  background(key: string): HTMLImageElement | null {
    return this.images.get('bg:' + key) ?? null;
  }

  /** Sprite de cenario da base, ou null. */
  prop(key: string): HTMLImageElement | null {
    return this.images.get('prop:' + key) ?? null;
  }

  /** Icone de um recurso, ou null. */
  icon(id: string): HTMLImageElement | null {
    return this.images.get('icon:' + id) ?? null;
  }

  /** Icone da arvore de habilidades (public/art/skills). */
  skillIcon(name: string): string | null {
    return this.skillIcons.has(name) ? `${ART.basePath}skills/${name}.png` : null;
  }

  /** Versao sem contorno, para incrustar na rocha. Cai no icone se faltar. */
  oreChunk(id: string): HTMLImageElement | null {
    return this.images.get('ore:' + id) ?? this.images.get('icon:' + id) ?? null;
  }

  /**
   * Retrato do heroi para a HUD: primeiro quadro da tira `idle`, recortado
   * num canvas e devolvido como data URL.
   *
   * Nao existe arte de retrato — e nem precisa. A tira parada ja tem o rosto
   * certo, e recortar o primeiro quadro custa um canvas de 64px uma vez.
   */
  heroPortraitUrl(): string | null {
    if (this.heroPortrait !== undefined) return this.heroPortrait;
    const strip = this.characterStrip('idle');
    if (!strip || !strip.width) {
      this.heroPortrait = null;
      return null;
    }
    // A tira e uma fileira de quadros quadrados; o lado e a propria altura.
    const fw = strip.height;
    const c = document.createElement('canvas');
    // So a metade de cima do quadro: o card quer cabeca e ombros, nao o corpo.
    const side = Math.min(fw, Math.floor(strip.height * 0.62));
    c.width = side;
    c.height = side;
    const ctx = c.getContext('2d');
    if (!ctx) {
      this.heroPortrait = null;
      return null;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(strip, Math.floor((fw - side) / 2), 0, side, side, 0, 0, side, side);
    this.heroPortrait = c.toDataURL();
    return this.heroPortrait;
  }

  /** Caminho do icone para uso em <img> na UI (null se nao existe). */
  iconUrl(id: string): string | null {
    return this.images.has('icon:' + id)
      ? `${ART.basePath}${ART.iconsDir}${id}.png`
      : null;
  }
}

export const Assets = new AssetsImpl();

/**
 * Reduz a textura a poucas cores representativas.
 * Assim os estilhacos saem da cor do bloco que quebrou, qualquer que seja a arte
 * que o artista/IA gerar — sem nenhuma lista de cores escrita a mao.
 */
function extractPalette(img: HTMLImageElement, samples = 24): string[] {
  try {
    const size = 24;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    // Agrupa em caixas de cor grosseiras e conta as mais frequentes.
    const bins = new Map<number, { r: number; g: number; b: number; n: number }>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 32) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
      const bin = bins.get(key);
      if (bin) {
        bin.r += r;
        bin.g += g;
        bin.b += b;
        bin.n++;
      } else {
        bins.set(key, { r, g, b, n: 1 });
      }
    }
    return Array.from(bins.values())
      .sort((a, b) => b.n - a.n)
      .slice(0, Math.max(3, Math.min(samples, 5)))
      .map((c) => `rgb(${Math.round(c.r / c.n)},${Math.round(c.g / c.n)},${Math.round(c.b / c.n)})`);
  } catch {
    return [];
  }
}
