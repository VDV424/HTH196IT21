// Web Audio API sound generator for clinical cues & patient bedside kiosk
class SoundManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    try {
      if (!this.ctx && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  // Pleasant notification chime for patient requests (water, blanket, etc.)
  playRequestChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch {
      // Audio context may be restricted by autoplay policy
    }
  }

  // Urgent attention double-pulse for emergency SOS
  playSOSAlarm() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [0, 0.22, 0.44].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now + delay);
        osc.frequency.setValueAtTime(1174.66, now + delay + 0.08);

        gain.gain.setValueAtTime(0.2, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.2);
      });
    } catch {
      // Audio context restricted
    }
  }

  // Gentle confirmation chime when action is completed or acknowledged
  playSuccessChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.2); // G5

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch {
      // Audio context restricted
    }
  }

  // Critical Code Blue Alarm (IEC 60601-1-8 high priority pattern: 5-pulse rapid harmonic burst)
  playCodeBlueAlarm() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const pitches = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
      pitches.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + (idx * 0.12));

        gain.gain.setValueAtTime(0.22, now + (idx * 0.12));
        gain.gain.exponentialRampToValueAtTime(0.001, now + (idx * 0.12) + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + (idx * 0.12));
        osc.stop(now + (idx * 0.12) + 0.11);
      });
    } catch {
      // Audio policy
    }
  }

  // Medication / Infusion Occlusion warning beep
  playMedicationAlert() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [0, 0.15].forEach((d) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(987.77, now + d); // B5
        gain.gain.setValueAtTime(0.15, now + d);
        gain.gain.exponentialRampToValueAtTime(0.001, now + d + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + d);
        osc.stop(now + d + 0.09);
      });
    } catch {
      // Audio policy
    }
  }
}

export const sounds = new SoundManager();
