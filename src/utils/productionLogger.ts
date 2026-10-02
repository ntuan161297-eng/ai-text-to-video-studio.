import fs from 'fs';
import path from 'path';
import { AppPaths, sanitizePath } from './appPaths.js';

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  appVersion: string;
  buildNumber: string;
  gitCommit: string;
  stage?: string;
  jobId?: string;
  errorCode?: string;
  message: string;
  data?: any;
}

class ProductionLogger {
  private logDir: string;
  private buildInfo: { appVersion: string; buildNumber: string; gitCommit: string };

  constructor() {
    this.logDir = AppPaths.USER_LOG_DIR;
    AppPaths.ensureUserDirectories();
    this.buildInfo = this.loadBuildInfo();
  }

  private loadBuildInfo() {
    try {
      if (fs.existsSync(AppPaths.BUILD_INFO_PATH)) {
        const info = JSON.parse(fs.readFileSync(AppPaths.BUILD_INFO_PATH, 'utf8'));
        return {
          appVersion: info.appVersion || '1.0.0',
          buildNumber: info.buildNumber || 'dev',
          gitCommit: info.gitCommit || 'unknown',
        };
      }
    } catch {}
    return {
      appVersion: '1.0.0',
      buildNumber: 'dev',
      gitCommit: 'unknown',
    };
  }

  private sanitize(obj: any): any {
    if (!obj) return obj;
    if (typeof obj === 'string') {
      let s = sanitizePath(obj);
      // Mask keys, tokens, secrets
      s = s.replace(/(?:key|secret|password|token|bearer|authorization)=["']?([^"'\s&]+)["']?/gi, '$1=***REDACTED***');
      s = s.replace(/AIza[0-9A-Za-z-_]{35}/g, 'AIza***REDACTED***');
      s = s.replace(/sk-[a-zA-Z0-9]{20,}/g, 'sk-***REDACTED***');
      return s;
    }
    if (typeof obj === 'object') {
      if (Array.isArray(obj)) {
        return obj.map(item => this.sanitize(item));
      }
      const res: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        const lowerK = k.toLowerCase();
        if (
          lowerK.includes('key') ||
          lowerK.includes('secret') ||
          lowerK.includes('password') ||
          lowerK.includes('token') ||
          lowerK.includes('credential') ||
          lowerK.includes('auth')
        ) {
          res[k] = '***REDACTED***';
        } else {
          res[k] = this.sanitize(v);
        }
      }
      return res;
    }
    return obj;
  }

  private writeLog(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, opts?: { stage?: string; jobId?: string; errorCode?: string; data?: any }) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      appVersion: this.buildInfo.appVersion,
      buildNumber: this.buildInfo.buildNumber,
      gitCommit: this.buildInfo.gitCommit,
      stage: opts?.stage,
      jobId: opts?.jobId,
      errorCode: opts?.errorCode,
      message: this.sanitize(message),
      data: opts?.data ? this.sanitize(opts.data) : undefined,
    };

    const dateStr = entry.timestamp.split('T')[0];
    const logFilePath = path.join(this.logDir, `studio_${dateStr}.log`);

    try {
      fs.appendFileSync(logFilePath, JSON.stringify(entry) + '\n', 'utf8');
    } catch {}

    const consolePrefix = `[${entry.timestamp}] [${level}]${entry.stage ? ` [${entry.stage}]` : ''}${entry.jobId ? ` (Job: ${entry.jobId})` : ''}:`;
    if (level === 'ERROR') {
      console.error(consolePrefix, entry.message, entry.errorCode || '');
    } else if (level === 'WARN') {
      console.warn(consolePrefix, entry.message);
    } else {
      console.log(consolePrefix, entry.message);
    }
  }

  public info(message: string, opts?: { stage?: string; jobId?: string; data?: any }) {
    this.writeLog('INFO', message, opts);
  }

  public warn(message: string, opts?: { stage?: string; jobId?: string; errorCode?: string; data?: any }) {
    this.writeLog('WARN', message, opts);
  }

  public error(message: string, opts?: { stage?: string; jobId?: string; errorCode?: string; data?: any }) {
    this.writeLog('ERROR', message, opts);
  }

  public stage(jobId: string, stage: string, message: string, data?: any) {
    this.writeLog('INFO', message, { jobId, stage, data });
  }
}

export const logger = new ProductionLogger();
