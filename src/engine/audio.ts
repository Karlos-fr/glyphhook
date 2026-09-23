export class TinyAudio {
  enabled = true;
  private ctx: AudioContext | null = null;

  private ensure() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  beep(freq: number, duration = 0.05, gain = 0.035, type: OscillatorType = 'square') {
    if (!this.enabled) return;
    try {
      const ctx = this.ensure();
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      amp.gain.setValueAtTime(gain, ctx.currentTime);
      amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(amp).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio is optional; browsers may block it until user interaction.
    }
  }
}
