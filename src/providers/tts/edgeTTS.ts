import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import WebSocket from 'ws';
import { parseFile } from 'music-metadata';
import { ITTSProvider } from '../../types/index.js';

const execFileAsync = promisify(execFile);

/**
 * Làm sạch và chuẩn hóa văn bản tiếng Việt để phát âm tự nhiên nhất qua TTS
 */
export function sanitizeVietnameseForTTS(text: string): string {
  if (!text) return 'Nội dung video ngắn.';
  let s = text.replace(/\u00a0/g, ' ');
  // Bỏ URLs
  s = s.replace(/https?:\/\/\S+/g, '');
  // Ký tự toán học & liên kết
  s = s.replace(/&/g, ' và ');
  s = s.replace(/\+/g, ' và ');
  s = s.replace(/=/g, ' bằng ');
  s = s.replace(/>/g, ' lớn hơn ');
  s = s.replace(/</g, ' nhỏ hơn ');
  s = s.replace(/~/g, ' khoảng ');
  s = s.replace(/\|/g, ', ');
  s = s.replace(/\^/g, ' ');
  // Dấu ngoặc chuyển thành nhịp nghỉ
  s = s.replace(/[\[\]{}()]/g, ', ');
  // Dấu chấm lửng
  s = s.replace(/…/g, '.');
  s = s.replace(/\[\s*…\s*\]/g, '');
  s = s.replace(/\[\s*\.\.\.\s*\]/g, '');
  s = s.replace(/\.{2,}/g, '.');
  // Đơn vị & tiền tệ
  s = s.replace(/%/g, ' phần trăm ');
  s = s.replace(/°C/gi, ' độ C ');
  s = s.replace(/([0-9]+)\s*(?:đ|vnd|vnđ)/gi, '$1 đồng');
  s = s.replace(/([0-9]+)\s*-\s*([0-9]+)/g, '$1 đến $2');
  // Bỏ markdown
  s = s.replace(/[*#`_]/g, '');
  // Bỏ emojis
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
  private pitch: string;
  private scriptPath: string;

  constructor(
    voice: string = process.env.TTS_VOICE || 'vi-VN-HoaiMyNeural',
    rate: string = process.env.TTS_RATE || '+5%',
    pitch: string = process.env.TTS_PITCH || '+0Hz'
  ) {
    this.voice = voice;
    this.rate = rate;
    this.pitch = pitch;
    this.scriptPath = path.resolve('scripts/tts_runner.py');
  }

  /**
   * Sinh giọng đọc tiếng Việt bằng WebSocket trực tiếp trong Node.js (Zero Python Dependency)
   */
  private async synthesizeNativeNode(text: string, outputPath: string): Promise<void> {
    const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
    const SEC_MS_GEC_VERSION = '1-143.0.3650.75';

    let ticks = Math.floor(Date.now() / 1000) + 11644473600;
    ticks -= (ticks % 300);
    ticks *= 10000000;
    const secMsGec = crypto.createHash('sha256').update(ticks.toString() + TRUSTED_CLIENT_TOKEN).digest('hex').toUpperCase();
    const connId = crypto.randomUUID().replace(/-/g, '');
    const muid = crypto.randomBytes(16).toString('hex').toUpperCase();

    const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&ConnectionId=${connId}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;

    const ws = new WebSocket(url, {
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': `muid=${muid};`
      },
      handshakeTimeout: 15000,
    });

    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        try { ws.close(); } catch {}
        reject(new Error('EdgeTTS WebSocket timeout sau 45 giây'));
      }, 45000);

      ws.on('open', () => {
        const timestamp = new Date().toString();
        const configMsg = `X-Timestamp:${timestamp}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`;
        ws.send(configMsg);

        // Escape XML in SSML
        const escapedText = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');

        const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='vi-VN'><voice name='${this.voice}'><prosody rate='${this.rate}' pitch='${this.pitch}'>${escapedText}</prosody></voice></speak>`;
        const reqId = crypto.randomUUID().replace(/-/g, '');
        const ssmlMsg = `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp}Z\r\nPath:ssml\r\n\r\n${ssml}`;
        ws.send(ssmlMsg);
      });

      ws.on('message', (data: Buffer, isBinary: boolean) => {
        if (isBinary) {
          const headerLen = data.readUInt16BE(0);
          const headerStr = data.slice(2, 2 + headerLen).toString('utf-8');
          if (headerStr.includes('Path:audio')) {
            chunks.push(data.slice(2 + headerLen));
          }
        } else {
          const msg = data.toString('utf-8');
          if (msg.includes('Path:turn.end')) {
            clearTimeout(timeout);
            try { ws.close(); } catch {}
            resolve();
          }
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      ws.on('close', (code, reason) => {
        clearTimeout(timeout);
        if (chunks.length > 0) resolve();
        else reject(new Error(`WebSocket closed early with code ${code}: ${reason}`));
      });
    });

    const finalAudio = Buffer.concat(chunks);
    if (finalAudio.length < 500) {
      throw new Error(`Dữ liệu audio nhận về quá nhỏ (${finalAudio.length} bytes)`);
    }

    fs.writeFileSync(outputPath, finalAudio);
  }

  /**
   * Fallback sinh giọng đọc qua Python script nếu máy có sẵn Python
   */
  private async synthesizePythonFallback(text: string, outputPath: string): Promise<void> {
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

      await execFileAsync('python', args, {
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          PYTHONUTF8: '1',
        },
        timeout: 60000,
      });
    } finally {
      if (fs.existsSync(tempTextFile)) {
        try { fs.unlinkSync(tempTextFile); } catch {}
      }
    }
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

    const maxTries = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxTries; attempt++) {
      try {
        if (fs.existsSync(outputPath)) {
          try { fs.unlinkSync(outputPath); } catch {}
        }

        // Ưu tiên 1: Chạy trực tiếp qua WebSocket thuần Node.js (Zero Python Dependency)
        try {
          await this.synthesizeNativeNode(sanitizedText, outputPath);
        } catch (nativeErr: any) {
          console.warn(`[EdgeTTS] Thử lại native Node TTS (${nativeErr.message}), thử phương án fallback...`);
          // Ưu tiên 2: Fallback qua Python nếu máy có sẵn Python
          await this.synthesizePythonFallback(sanitizedText, outputPath);
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

    throw new Error(`❌ [EdgeTTS] Không thể tạo giọng đọc cho phân cảnh: "${sanitizedText.slice(0, 50)}..." sau ${maxTries} lần thử. Lỗi: ${lastError?.message || 'Unknown error'}`);
  }
}
