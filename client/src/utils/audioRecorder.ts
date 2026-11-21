/**
 * Pure Web Audio API PCM WAV Recorder
 * Records 16,000 Hz, 16-bit mono PCM audio
 * Supported 100% natively by Addis AI Scribe, Whisper, and Google Gemini
 */

export interface ActiveRecorder {
  stop: () => Promise<Blob>;
}

export async function startWavRecording(): Promise<ActiveRecorder> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      sampleRate: 16000,
      echoCancellation: true,
      noiseSuppression: true,
    },
  });

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioContext = new AudioContextClass({ sampleRate: 16000 });
  if (audioContext.state === 'suspended') await audioContext.resume();
  const source = audioContext.createMediaStreamSource(stream);

  // Buffer size 4096, 1 input channel, 1 output channel
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const recordedSamples: Float32Array[] = [];

  processor.onaudioprocess = (e) => {
    const input = e.inputBuffer.getChannelData(0);
    recordedSamples.push(new Float32Array(input));
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  return {
    stop: async () => {
      // ScriptProcessor callbacks arrive in 256 ms blocks. Give the final block
      // time to reach the buffer before disconnecting, especially on touch.
      await new Promise((resolve) => window.setTimeout(resolve, 300));
      // Disconnect nodes
      try {
        processor.disconnect();
        source.disconnect();
        await audioContext.close();
      } catch (e) {
        console.warn('AudioContext cleanup warning:', e);
      }

      // Stop media tracks
      stream.getTracks().forEach((track) => track.stop());

      // Flatten float samples
      const totalLength = recordedSamples.reduce((acc, cur) => acc + cur.length, 0);
      if (totalLength < 3200) {
        throw new Error('Please speak for at least 0.2 seconds before stopping.');
      }
      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of recordedSamples) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      // Encode into 16-bit PCM WAV (16kHz mono)
      return encodeWav(merged, 16000);
    },
  };
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // Format chunk identifier
  writeString(view, 12, 'fmt ');
  // Format chunk length
  view.setUint32(16, 16, true);
  // Sample format (1 = PCM)
  view.setUint16(20, 1, true);
  // Channels (1 = mono)
  view.setUint16(22, 1, true);
  // Sample rate
  view.setUint32(24, sampleRate, true);
  // Byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // Block align (channels * bytes per sample)
  view.setUint16(32, 2, true);
  // Bits per sample
  view.setUint16(34, 16, true);
  // Data chunk identifier
  writeString(view, 36, 'data');
  // Data chunk length
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples (float32 -> int16)
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
