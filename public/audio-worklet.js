// public/audio-worklet.js
class PlaybackRateProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'playbackRate',
        defaultValue: 1.0,
        minValue: 0.5,
        maxValue: 2.0,
      },
    ];
  }

  constructor() {
    super();
    this.playbackRate = 1.0;
    this.index = 0;

    this.port.onmessage = (e) => {
      if (e.data?.type === 'setPlaybackRate') {
        this.playbackRate = e.data.rate;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !output) return true;

    const rate = parameters.playbackRate[0] ?? this.playbackRate;

    for (let ch = 0; ch < input.length; ch++) {
      const inCh = input[ch];
      const outCh = output[ch];

      for (let i = 0; i < outCh.length; i++) {
        const idx = this.index;
        const i0 = Math.floor(idx);
        const frac = idx - i0;

        const s1 = inCh[i0 % inCh.length] || 0;
        const s2 = inCh[(i0 + 1) % inCh.length] || 0;

        outCh[i] = s1 + frac * (s2 - s1);
        this.index += rate;
      }
    }

    return true;
  }
}

registerProcessor('playback-rate-processor', PlaybackRateProcessor);
