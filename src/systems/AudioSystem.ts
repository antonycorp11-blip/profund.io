import { Events } from '../core/events';

export type SfxKey =
  | 'mine_terra'
  | 'mine_pedra'
  | 'mine_metal'
  | 'mine_cristal'
  | 'mine_estrutura'
  | 'break_terra'
  | 'break_pedra'
  | 'break_metal'
  | 'break_cristal'
  | 'break_estrutura'
  | 'pickup'
  | 'pickup_rare'
  | 'deliver'
  | 'quota'
  | 'progress'
  | 'ui'
  | 'story'
  | 'denied'
  | 'creature_hit'
  | 'creature_die'
  | 'player_hurt'
  | 'player_die';

interface SynthSpec {
  /** Frequencia central. */
  freq: number;
  /** Duracao em segundos. */
  dur: number;
  type: 'noise' | 'tone' | 'chime';
  q: number;
  gain: number;
  /** Variacao aleatoria de pitch (0..1). */
  jitter: number;
}

/**
 * Audio desacoplado do gameplay: o jogo so emite eventos.
 * Enquanto nao existirem os arquivos finais, um sintetizador simples cobre o feedback.
 * Para usar audio real: AudioSystem.registerSample('mine_pedra', url).
 */
class AudioSystemImpl {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<SfxKey, AudioBuffer>();
  private pending = new Map<SfxKey, string>();
  private noiseBuffer: AudioBuffer | null = null;
  private lastPlay = new Map<SfxKey, number>();

  enabled = true;
  volume = 0.5;

  /** Chamado no primeiro toque/clique (política de autoplay dos navegadores). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    this.buildNoise();
    for (const [key, url] of this.pending) void this.loadSample(key, url);
    this.pending.clear();
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  /** Registra um arquivo real para um evento (substitui o sintetizador). */
  registerSample(key: SfxKey, url: string): void {
    if (!this.ctx) {
      this.pending.set(key, url);
      return;
    }
    void this.loadSample(key, url);
  }

  private async loadSample(key: SfxKey, url: string): Promise<void> {
    try {
      const res = await fetch(url);
      const data = await res.arrayBuffer();
      const buf = await this.ctx!.decodeAudioData(data);
      this.buffers.set(key, buf);
    } catch {
      /* mantem o sintetizador */
    }
  }

  private buildNoise(): void {
    if (!this.ctx) return;
    const len = Math.floor(this.ctx.sampleRate * 0.4);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;
  }

  play(key: SfxKey, volumeScale = 1): void {
    if (!this.enabled || !this.ctx || !this.master) return;
    // Evita empilhar o mesmo som no mesmo frame.
    const now = this.ctx.currentTime;
    const last = this.lastPlay.get(key) ?? -1;
    if (now - last < 0.02) return;
    this.lastPlay.set(key, now);

    const sample = this.buffers.get(key);
    if (sample) {
      const src = this.ctx.createBufferSource();
      src.buffer = sample;
      const g = this.ctx.createGain();
      g.gain.value = volumeScale;
      src.connect(g).connect(this.master);
      src.start();
      return;
    }
    this.synth(SYNTH[key] ?? SYNTH.ui, volumeScale);
  }

  private synth(spec: SynthSpec, volumeScale: number): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    const freq = spec.freq * (1 + (Math.random() * 2 - 1) * spec.jitter);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, spec.gain * volumeScale), now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.dur);
    gain.connect(this.master!);

    if (spec.type === 'noise' && this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = spec.q;
      src.connect(filter).connect(gain);
      src.start(now);
      src.stop(now + spec.dur + 0.02);
    } else {
      const osc = ctx.createOscillator();
      osc.type = spec.type === 'chime' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(40, freq * (spec.type === 'chime' ? 1.6 : 0.5)),
        now + spec.dur
      );
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + spec.dur + 0.02);
    }
  }

  /** Liga o audio ao barramento de eventos (sem acoplar gameplay a audio). */
  bindEvents(): void {
    Events.on('block:hit', (p) => this.play(`mine_${p.material}` as SfxKey, 0.5));
    Events.on('block:break', (p) => this.play(`break_${p.material}` as SfxKey, 0.85));
    Events.on('block:blocked', () => this.play('denied', 0.6));
    Events.on('resource:collect', (p) => this.play(p.amount > 1 ? 'pickup_rare' : 'pickup', 0.5));
    Events.on('delivery:done', () => this.play('deliver', 0.9));
    Events.on('quota:complete', () => this.play('quota', 1));
    Events.on('clue:found', () => this.play('story', 0.9));
    Events.on('tool:upgraded', () => this.play('quota', 0.8));
    Events.on('tech:researched', () => this.play('progress', 0.85));
    Events.on('skill:learned', () => this.play('progress', 0.75));
    Events.on('creature:hurt', (p) => this.play('creature_hit', p.critical ? 1 : 0.7));
    Events.on('creature:killed', (p) => this.play('creature_die', p.guardian ? 1 : 0.75));
    Events.on('player:hurt', () => this.play('player_hurt', 0.9));
    Events.on('player:died', () => this.play('player_die', 1));
  }
}

const SYNTH: Record<string, SynthSpec> = {
  mine_terra: { freq: 220, dur: 0.1, type: 'noise', q: 1.2, gain: 0.25, jitter: 0.25 },
  mine_pedra: { freq: 900, dur: 0.07, type: 'noise', q: 4, gain: 0.28, jitter: 0.2 },
  mine_metal: { freq: 1500, dur: 0.08, type: 'noise', q: 9, gain: 0.26, jitter: 0.18 },
  mine_cristal: { freq: 2100, dur: 0.1, type: 'chime', q: 6, gain: 0.16, jitter: 0.12 },
  mine_estrutura: { freq: 600, dur: 0.09, type: 'noise', q: 3, gain: 0.26, jitter: 0.2 },
  break_terra: { freq: 150, dur: 0.22, type: 'noise', q: 0.9, gain: 0.34, jitter: 0.2 },
  break_pedra: { freq: 420, dur: 0.24, type: 'noise', q: 1.6, gain: 0.36, jitter: 0.18 },
  break_metal: { freq: 780, dur: 0.26, type: 'noise', q: 3, gain: 0.34, jitter: 0.15 },
  break_cristal: { freq: 1400, dur: 0.4, type: 'chime', q: 4, gain: 0.24, jitter: 0.1 },
  break_estrutura: { freq: 300, dur: 0.3, type: 'noise', q: 1.4, gain: 0.34, jitter: 0.15 },
  pickup: { freq: 880, dur: 0.09, type: 'tone', q: 1, gain: 0.12, jitter: 0.08 },
  pickup_rare: { freq: 1320, dur: 0.14, type: 'chime', q: 1, gain: 0.14, jitter: 0.05 },
  deliver: { freq: 540, dur: 0.36, type: 'chime', q: 1, gain: 0.22, jitter: 0 },
  quota: { freq: 660, dur: 0.58, type: 'chime', q: 1, gain: 0.24, jitter: 0 },
  progress: { freq: 740, dur: 0.34, type: 'chime', q: 1, gain: 0.18, jitter: 0 },
  ui: { freq: 700, dur: 0.06, type: 'tone', q: 1, gain: 0.1, jitter: 0 },
  story: { freq: 320, dur: 0.6, type: 'chime', q: 1, gain: 0.18, jitter: 0 },
  denied: { freq: 160, dur: 0.12, type: 'tone', q: 1, gain: 0.16, jitter: 0 },
  creature_hit: { freq: 340, dur: 0.12, type: 'noise', q: 2.2, gain: 0.3, jitter: 0.25 },
  creature_die: { freq: 190, dur: 0.42, type: 'noise', q: 1.1, gain: 0.34, jitter: 0.2 },
  player_hurt: { freq: 130, dur: 0.22, type: 'tone', q: 1, gain: 0.3, jitter: 0.1 },
  player_die: { freq: 90, dur: 0.9, type: 'tone', q: 1, gain: 0.34, jitter: 0 },
};

export const AudioSystem = new AudioSystemImpl();
