export class TinyAudio {
  enabled = true;
  musicEnabled = true;
  private ctx: AudioContext | null = null;
  private ambient: { gain: GainNode; oscillators: OscillatorNode[] } | null = null;

  private ensure() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  beep(freq: number, duration = 0.05, gain = 0.035, type: OscillatorType = 'square', slide = 0) {
    if (!this.enabled) return;
    try {
      const ctx = this.ensure();
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ctx.currentTime + duration);
      amp.gain.setValueAtTime(gain, ctx.currentTime);
      amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(amp).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio remains optional when the browser blocks AudioContext.
    }
  }

  setAmbient(active: boolean) {
    if (!active || !this.musicEnabled) {
      if (this.ambient) {
        const ctx = this.ctx;
        if (ctx) this.ambient.gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
        for (const osc of this.ambient.oscillators) {
          try { osc.stop((ctx?.currentTime ?? 0) + 0.28); } catch { /* already stopped */ }
        }
        this.ambient = null;
      }
      return;
    }
    if (this.ambient) return;
    try {
      const ctx = this.ensure();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      gain.connect(ctx.destination);
      gain.gain.linearRampToValueAtTime(0.008, ctx.currentTime + 0.6);
      const oscillators = [55, 82.5].map((frequency, i) => {
        const osc = ctx.createOscillator();
        osc.type = i ? 'triangle' : 'sine';
        osc.frequency.value = frequency;
        osc.detune.value = i ? -5 : 4;
        osc.connect(gain);
        osc.start();
        return osc;
      });
      this.ambient = { gain, oscillators };
    } catch {
      // Ambient sound is non-essential.
    }
  }
}
