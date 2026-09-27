// Runs on the audio rendering thread. The AudioContext that owns this node
// is created with sampleRate: 16000, so the browser resamples the mic input
// before it ever reaches here — this just converts Float32 -> Int16 PCM.
class PCMRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._chunkSize = 2400; // ~150ms at 16kHz
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      const channelData = input[0];
      for (let i = 0; i < channelData.length; i++) {
        this._buffer.push(channelData[i]);
      }

      while (this._buffer.length >= this._chunkSize) {
        const chunk = this._buffer.splice(0, this._chunkSize);
        const int16 = new Int16Array(chunk.length);
        for (let i = 0; i < chunk.length; i++) {
          const s = Math.max(-1, Math.min(1, chunk[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        this.port.postMessage(int16.buffer, [int16.buffer]);
      }
    }
    return true;
  }
}

registerProcessor("pcm-recorder-processor", PCMRecorderProcessor);
