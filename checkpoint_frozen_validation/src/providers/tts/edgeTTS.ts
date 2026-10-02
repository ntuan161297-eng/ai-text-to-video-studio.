import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { parseFile } from 'music-metadata';
import { ITTSProvider } from '../../types/index.js';

const execFileAsync = promisify(execFile);

export class EdgeTTSProvider implements ITTSProvider {
  readonly name = 'EdgeTTS';
  private voice: string;
  private rate: string;
  private pythonPath: string;
  private scriptPath: string;

  constructor(
    voice: string = process.env.TTS_VOICE || 'vi-VN-HoaiMyNeural',
    rate: string = process.env.TTS_RATE || '+5%',
    _pitch: string = process.env.TTS_PITCH || '+0Hz'
  ) {
    this.voice = voice;
    this.rate = rate;

    const defaultPython = 'C:\\Users\\Admin\\AppData\\Local\\Programs\\Python\\Python314\\python.exe';
    if (fs.existsSync(defaultPython)) {
      this.pythonPath = defaultPython;
    } else {
      this.pythonPath = 'python';
    }

    this.scriptPath = path.resolve('scripts/tts_runner.py');
  }

  async generateAudio(
    text: string,
    outputPath: string
  ): Promise<{ audioPath: string; durationInSeconds: number }> {
    console.log(`🎙️ [EdgeTTS] Đang tạo giọng đọc tiếng Việt (${this.voice}): "${text.slice(0, 40)}..."`);
    
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write text to utf-8 temp file
    const tempTextFile = outputPath.replace(/\.[^/.]+$/, '_text.txt');
    fs.writeFileSync(tempTextFile, text, 'utf-8');

    try {
      const args = [
        this.scriptPath,
        '--text-file',
        tempTextFile,
        '--output',
        outputPath,
        '--voice',
        this.voice,
        '--rate',
        this.rate,
      ];

      await execFileAsync(this.pythonPath, args);

      if (fs.existsSync(tempTextFile)) {
        fs.unlinkSync(tempTextFile);
      }

      // Read audio duration
      let durationInSeconds = 0;
      try {
        const metadata = await parseFile(outputPath);
        durationInSeconds = metadata.format.duration || 0;
      } catch (metaErr) {
        const wordCount = text.trim().split(/\s+/).length;
        durationInSeconds = Math.max(2, Math.round(wordCount / 3.2));
      }

      if (durationInSeconds <= 0) {
        const wordCount = text.trim().split(/\s+/).length;
        durationInSeconds = Math.max(2, Math.round(wordCount / 3.2));
      }

      console.log(`✅ [EdgeTTS] Đã tạo audio: ${path.basename(outputPath)} (${durationInSeconds.toFixed(2)}s)`);
      return { audioPath: outputPath, durationInSeconds };
    } catch (err: any) {
      console.warn(`⚠️ [EdgeTTS] Lỗi sinh giọng đọc (${err.message}). Tạo audio dự phòng...`);
      if (fs.existsSync(tempTextFile)) {
        fs.unlinkSync(tempTextFile);
      }
      return this.createFallbackAudio(text, outputPath);
    }
  }

  private async createFallbackAudio(
    text: string,
    outputPath: string
  ): Promise<{ audioPath: string; durationInSeconds: number }> {
    const wordCount = text.trim().split(/\s+/).length;
    const durationInSeconds = Math.max(3, Math.ceil(wordCount / 3));

    // Xoá file cũ nếu bị lỗi 0-byte
    if (fs.existsSync(outputPath)) {
      try {
        fs.unlinkSync(outputPath);
      } catch {}
    }

    const tempWav = outputPath.replace(/\.[^/.]+$/, '_fallback.wav');
    const sampleRate = 44100;
    const numChannels = 1;
    const bytesPerSample = 2;
    const totalSamples = Math.floor(sampleRate * durationInSeconds);
    const dataSize = totalSamples * numChannels * bytesPerSample;

    const buffer = Buffer.alloc(44 + dataSize);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
    buffer.writeUInt16LE(numChannels * bytesPerSample, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * 440 * t) * 0.02;
      const intSample = Math.floor(sample * 32767);
      buffer.writeInt16LE(intSample, 44 + i * 2);
    }

    fs.writeFileSync(tempWav, buffer);

    if (outputPath.endsWith('.mp3')) {
      const ffmpegBin = 'C:\\Users\\Admin\\bin\\ffmpeg.exe';
      const ffmpegCmd = fs.existsSync(ffmpegBin) ? ffmpegBin : 'ffmpeg';
      try {
        await execFileAsync(ffmpegCmd, ['-i', tempWav, '-c:a', 'libmp3lame', outputPath, '-y']);
        if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav);
        return { audioPath: outputPath, durationInSeconds };
      } catch {
        return { audioPath: tempWav, durationInSeconds };
      }
    }

    return { audioPath: tempWav, durationInSeconds };
  }
}
