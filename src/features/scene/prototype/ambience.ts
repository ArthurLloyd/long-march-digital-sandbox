/** Original synthesized ambience: filtered noise, no recording or historical audio. */
export function createAmbience() {
  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  const sources: AudioBufferSourceNode[] = [];
  let enabled = false;
  let volume = 0.35;
  let disposed = false;
  function initialize() {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);
    const buffer = context.createBuffer(
      1,
      context.sampleRate * 5,
      context.sampleRate,
    );
    const data = buffer.getChannelData(0);
    // Deterministic, softly coloured noise; never an imitation of a historical recording.
    let seed = 1601;
    let brown = 0;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      const white = ((seed >>> 0) / 4294967295) * 2 - 1;
      brown = (brown + white * 0.025) / 1.025;
      data[i] = brown * 3.4;
    }
    for (const [frequency, gain, rate] of [
      [550, 0.55, 1],
      [1800, 0.18, 0.81],
    ]) {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.playbackRate.value = rate!;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = frequency!;
      filter.Q.value = 0.3;
      const layer = context.createGain();
      layer.gain.value = gain!;
      source.connect(filter).connect(layer).connect(master);
      source.start();
      sources.push(source);
    }
  }
  function update() {
    if (!context || !master || disposed) return;
    master.gain.setTargetAtTime(
      enabled && !document.hidden ? volume : 0,
      context.currentTime,
      0.25,
    );
  }
  return {
    async toggle() {
      if (disposed) return false;
      if (!context) initialize();
      await context!.resume();
      if (disposed) return false;
      enabled = !enabled;
      update();
      return enabled;
    },
    volume(value: number) {
      volume = Math.max(0, Math.min(0.7, value));
      update();
    },
    visibility: update,
    dispose() {
      if (disposed) return;
      disposed = true;
      enabled = false;
      for (const source of sources) source.stop();
      void context?.close();
    },
  };
}
