import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { parseFile } from 'music-metadata';
import { ITTSProvider } from '../../types/index.js';

const execFileAsync = promisify(execFile);

export function sanitizeVietnameseForTTS(text: string): string {
  if (!text) return 'Nội dung video ngắn.';
  let s = text.replace(/\u00a0/g, ' ');
  // Remove URLs
  s = s.replace(/https?:\/\/\S+/gi, '');
  // Convert symbols to natural Vietnamese words
  s = s.replace(/&/g, ' và ');
  s = s.replace(/\+/g, ' và ');
  s = s.replace(/=/g, ' bằng ');
  s = s.replace(/>/g, ' lớn hơn ');
  s = s.replace(/</g, ' nhỏ hơn ');
  s = s.replace(/~/g, ' khoảng ');
  s = s.replace(/\|/g, ', ');
  s = s.replace(/\^/g, ' ');
  // Convert brackets and parentheses to natural speech pauses
  s = s.replace(/[\[\]{}()]/g, ', ');
  // Ellipses and multiple dots
  s = s.replace(/…/g, '.');
  s = s.replace(/\[\s*…\s*\]/g, '');
  s = s.replace(/\[\s*\.\.\.\s*\]/g, '');
  s = s.replace(/\.{2,}/g, '.');
  // Units & currencies
  s = s.replace(/%/g, ' phần trăm ');
  s = s.replace(/°C/gi, ' độ C ');
  s = s.replace(/([0-9]+)\s*(?:đ|vnd|vnđ)/gi, '$1 đồng');
  s = s.replace(/([0-9]+)\s*-\s*([0-9]+)/g, '$1 đến $2');
  // Remove markdown and formatting symbols
  s = s.replace(/[*#`_~]/g, '');
  // Remove emojis and non-speech symbols
  s = s.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  // Collapse whitespace and punctuation
  s = s.replace(/[\r\n\t]+/g, ' ');
  s = s.replace(/[,;]\s*[,;]+/g, ',');
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/^\s*[,;.]+\s*/, '');
  s = s.replace(/\s*,\s*$/, '.');
  return s.trim() || 'Nội dung video ngắn.';
}

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
    const sanitizedText = sanitizeVietnameseForTTS(text);

    console.log(`🎙️ [EdgeTTS] Đang tạo giọng đọc tiếng Việt (${this.voice}): "${sanitizedText.slice(0, 50)}..."`);
    
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Check cache: if valid audio and matching hash already exist, avoid duplicate remote TTS calls
    const metaFile = outputPath.replace(/\.[^/.]+$/, '_meta.json');
    const textHash = crypto.createHash('md5').update(`${this.voice}:${this.rate}:${sanitizedText}`).digest('hex');
    
    if (fs.existsSync(outputPath) && fs.existsSync(metaFile)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
        if (meta.hash === textHash && fs.statSync(outputPath).size > 1000 && meta.durationInSeconds > 0) {
          console.log(`⚡ [EdgeTTS] Tái sử dụng audio chuẩn (${meta.durationInSeconds.toFixed(2)}s): ${path.basename(outputPath)}`);
          return { audioPath: outputPath, durationInSeconds: meta.durationInSeconds };
        }
      } catch {
        // Ignore cache parse error and regenerate
      }
    }

    // Write text to utf-8 temp file
    const tempTextFile = outputPath.replace(/\.[^/.]+$/, '_text.txt');
    
    const maxTries = 3;
    let lastError: any = null;

    try {
      for (let attempt = 1; attempt <= maxTries; attempt++) {
        // Guarantee tempTextFile exists on every attempt
        fs.writeFileSync(tempTextFile, sanitizedText, 'utf-8');

        try {
          if (fs.existsSync(outputPath)) {
            try { fs.unlinkSync(outputPath); } catch {}
          }

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

          const { stdout, stderr } = await execFileAsync(this.pythonPath, args, {
            env: {
              ...process.env,
              PYTHONIOENCODING: 'utf-8',
              PYTHONUTF8: '1',
            },
            timeout: 120000,
          });

          if (stderr) {
            console.log(`[EdgeTTS Runner Info]: ${stderr.trim()}`);
          }

          if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1000) {
            throw new Error(`File audio tạo ra không hợp lệ hoặc quá nhỏ (${fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0} bytes)`);
          }

          // Read audio duration
          let durationInSeconds = 0;
          try {
            const metadata = await parseFile(outputPath);
            durationInSeconds = metadata.format.duration || 0;
          } catch (metaErr) {
            const wordCount = sanitizedText.trim().split(/\s+/).length;
            durationInSeconds = Math.max(2, Math.round(wordCount / 3.2));
          }

          if (durationInSeconds <= 0) {
            const wordCount = sanitizedText.trim().split(/\s+/).length;
            durationInSeconds = Math.max(2, Math.round(wordCount / 3.2));
          }

          // Save cache metadata
          try {
            fs.writeFileSync(metaFile, JSON.stringify({
              hash: textHash,
              voice: this.voice,
              rate: this.rate,
              durationInSeconds,
              createdAt: new Date().toISOString()
            }, null, 2), 'utf-8');
          } catch {}

          console.log(`✅ [EdgeTTS] Đã tạo audio thành công: ${path.basename(outputPath)} (${durationInSeconds.toFixed(2)}s)`);
          return { audioPath: outputPath, durationInSeconds };
        } catch (err: any) {
          lastError = err;
          console.warn(`⚠️ [EdgeTTS] Lỗi sinh giọng đọc lần ${attempt}/${maxTries} (${err.message})...`);
          if (attempt < maxTries) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      }
    } finally {
      // Only delete tempTextFile after all attempts are completely finished or on success
      if (fs.existsSync(tempTextFile)) {
        try { fs.unlinkSync(tempTextFile); } catch {}
      }
    }

    // NEVER silently generate dead silence in production!
    throw new Error(`❌ [EdgeTTS] Không thể tạo giọng đọc cho phân cảnh: "${sanitizedText.slice(0, 50)}..." sau ${maxTries} lần thử. Lỗi: ${lastError?.message || 'Unknown error'}`);
  }
}

