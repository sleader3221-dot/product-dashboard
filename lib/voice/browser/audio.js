// Browser audio for the Live API.
// Mic: any device rate -> 16 kHz mono 16-bit PCM, little-endian, base64, 40 ms chunks.
// Speaker: model PCM (24 kHz) scheduled gap-free, flushed instantly on barge-in.

const TARGET_RATE = 16000;
const CHUNK_SAMPLES = 640; // 40 ms at 16 kHz

const WORKLET_SOURCE = `
class VaaniCapture extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) this.port.postMessage(ch.slice(0));
    return true;
  }
}
registerProcessor('vaani-capture', VaaniCapture);
`;

export function int16ToBase64(int16) {
  const bytes = new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength);
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

export function base64ToInt16(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
}

export class MicCapture {
  constructor({ onChunk, onLevel }) {
    this.onChunk = onChunk;
    this.onLevel = onLevel;
    this.muted = false;
    this.pending = new Int16Array(CHUNK_SAMPLES);
    this.pendingLen = 0;
    this.pos = 0; // fractional read position for resampling
    this.carry = new Float32Array(0);
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    this.ctx = new AudioContext();
    const url = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: 'application/javascript' }));
    try {
      await this.ctx.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, 'vaani-capture');
    this.node.port.onmessage = (e) => this.handleFrame(e.data);
    this.source.connect(this.node);
    // Keep the graph pulling without making any sound.
    this.sink = this.ctx.createGain();
    this.sink.gain.value = 0;
    this.node.connect(this.sink).connect(this.ctx.destination);
  }

  handleFrame(frame) {
    let sum = 0;
    for (let i = 0; i < frame.length; i += 1) sum += frame[i] * frame[i];
    this.onLevel?.(this.muted ? 0 : Math.min(1, Math.sqrt(sum / frame.length) * 4));
    if (this.muted) return;

    // Linear-interpolation resample to 16 kHz.
    const ratio = this.ctx.sampleRate / TARGET_RATE;
    const input = new Float32Array(this.carry.length + frame.length);
    input.set(this.carry, 0);
    input.set(frame, this.carry.length);
    let pos = this.pos;
    while (pos + 1 < input.length) {
      const i = Math.floor(pos);
      const t = pos - i;
      const s = input[i] * (1 - t) + input[i + 1] * t;
      const clamped = Math.max(-1, Math.min(1, s));
      this.pending[this.pendingLen] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      this.pendingLen += 1;
      if (this.pendingLen === CHUNK_SAMPLES) {
        this.onChunk?.(int16ToBase64(this.pending));
        this.pending = new Int16Array(CHUNK_SAMPLES);
        this.pendingLen = 0;
      }
      pos += ratio;
    }
    const keepFrom = Math.floor(pos);
    this.carry = input.slice(keepFrom);
    this.pos = pos - keepFrom;
  }

  setMuted(muted) {
    this.muted = muted;
  }

  stop() {
    try { this.node?.port && (this.node.port.onmessage = null); } catch { /* ignore */ }
    try { this.source?.disconnect(); } catch { /* ignore */ }
    try { this.node?.disconnect(); } catch { /* ignore */ }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}

export class PcmPlayer {
  constructor({ onPlayingChange } = {}) {
    this.onPlayingChange = onPlayingChange;
    this.sources = new Set();
    this.nextTime = 0;
  }

  ensure() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  enqueue(base64, mimeType = 'audio/pcm;rate=24000') {
    const ctx = this.ensure();
    const rate = Number((/rate=(\d+)/.exec(mimeType) || [])[1]) || 24000;
    const pcm = base64ToInt16(base64);
    if (!pcm.length) return;
    const buffer = ctx.createBuffer(1, pcm.length, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i += 1) data[i] = pcm[i] / 0x8000;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime + 0.02, this.nextTime);
    src.start(startAt);
    this.nextTime = startAt + buffer.duration;
    this.sources.add(src);
    if (this.sources.size === 1) this.onPlayingChange?.(true);
    src.onended = () => {
      this.sources.delete(src);
      if (this.sources.size === 0) this.onPlayingChange?.(false);
    };
  }

  flush() {
    for (const src of this.sources) {
      try { src.stop(); } catch { /* already stopped */ }
    }
    this.sources.clear();
    this.nextTime = 0;
    this.onPlayingChange?.(false);
  }

  close() {
    this.flush();
    this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}
