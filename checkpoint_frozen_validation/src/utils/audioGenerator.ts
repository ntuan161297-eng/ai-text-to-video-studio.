import fs from 'fs';
import path from 'path';

/**
 * Generates background music (WAV) offline without external dependencies.
 * Supports styles: 'lofi' | 'ambient' | 'sports' | 'upbeat' | 'dramatic' | 'none'
 */
export function generateAmbientBgm(
  outputPath: string,
  durationSeconds: number = 60,
  style: string = 'lofi'
): string {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sampleRate = 44100;
  const numChannels = 2;
  const bytesPerSample = 2; // 16-bit
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = totalSamples * blockAlign;

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // bits per sample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  const cleanStyle = (style || 'lofi').toLowerCase();

  // Chords definition based on style
  let chords: number[][];
  let tempoSeconds = 4.0;
  let kickInterval = 0.75;

  if (cleanStyle.includes('sport') || cleanStyle.includes('upbeat')) {
    // Driving upbeat energy: Dm -> F -> C -> G
    chords = [
      [146.83, 220.0, 293.66, 349.23], // Dm
      [174.61, 220.0, 261.63, 349.23], // F
      [130.81, 196.0, 261.63, 329.63], // C
      [196.0, 246.94, 293.66, 392.0],  // G
    ];
    tempoSeconds = 2.0; // Faster chord changes
    kickInterval = 0.5;  // 120 BPM driving pulse
  } else if (cleanStyle.includes('dramat') || cleanStyle.includes('epic')) {
    // Dramatic suspense: Cm -> Ab -> Fm -> G
    chords = [
      [130.81, 196.0, 261.63, 311.13], // Cm
      [103.83, 164.81, 207.65, 261.63], // Ab
      [87.31, 130.81, 174.61, 207.65],  // Fm
      [98.0, 146.83, 196.0, 246.94],    // G
    ];
    tempoSeconds = 3.5;
    kickInterval = 0.85;
  } else {
    // Lofi Chill: Fmaj7 -> G -> Am7 -> Em7
    chords = [
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [196.0, 261.63, 293.66, 392.0],  // G
      [220.0, 261.63, 329.63, 392.0],  // Am7
      [164.81, 196.0, 246.94, 293.66], // Em7
    ];
    tempoSeconds = 4.0;
    kickInterval = 0.75;
  }

  const isMuted = cleanStyle === 'none' || cleanStyle === 'mute';

  const chordDurationSamples = Math.floor(sampleRate * tempoSeconds);

  for (let i = 0; i < totalSamples; i++) {
    if (isMuted) {
      const offset = 44 + i * blockAlign;
      buffer.writeInt16LE(0, offset);
      buffer.writeInt16LE(0, offset + 2);
      continue;
    }

    const t = i / sampleRate;
    const chordIdx = Math.floor(i / chordDurationSamples) % chords.length;
    const currentChord = chords[chordIdx];

    // Harmonic synthesis
    let sample = 0;
    for (let f of currentChord) {
      sample += Math.sin(2 * Math.PI * f * t) * 0.10;
      sample += Math.sin(4 * Math.PI * f * t) * 0.025;
    }

    // Dynamic rhythm kick
    const beatPhase = (i % Math.floor(sampleRate * kickInterval)) / Math.floor(sampleRate * kickInterval);
    const kick = Math.exp(-beatPhase * 16) * Math.sin(2 * Math.PI * 60 * t) * 0.20;
    sample += kick;

    // Hi-hat tick
    const hatInterval = kickInterval / 2;
    const hatPhase = (i % Math.floor(sampleRate * hatInterval)) / Math.floor(sampleRate * hatInterval);
    if (hatPhase < 0.06) {
      sample += (Math.random() * 2 - 1) * 0.035 * Math.exp(-hatPhase * 70);
    }

    // Clamp volume to prevent clipping
    const clamped = Math.max(-0.95, Math.min(0.95, sample));
    const intSample = Math.floor(clamped * 32767);

    // Left and Right channels
    const offset = 44 + i * blockAlign;
    buffer.writeInt16LE(intSample, offset);
    buffer.writeInt16LE(intSample, offset + 2);
  }

  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}
