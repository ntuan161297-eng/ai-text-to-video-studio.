/**
 * SECRET STORE ABSTRACTION
 * Secure symmetric AES-256-GCM encryption for at-rest credentials storage.
 * Enforces server-side persistent master encryption key, fail-secure validation, and key masking.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { AppPaths } from '../utils/appPaths.js';

export class SecretStore {
  private static cachedKey: Buffer | null = null;
  private static cachedLegacyKey: Buffer | null = null;

  /**
   * Resolves and validates the persistent 256-bit encryption master key.
   * Stored securely at USER_DATA_DIR/security/master.key
   * Never overwritten on updates, never committed to git, never logged.
   */
  public static getMasterKey(): Buffer {
    if (this.cachedKey) {
      return this.cachedKey;
    }

    const keyPath = AppPaths.MASTER_KEY_PATH;

    try {
      if (fs.existsSync(keyPath)) {
        const keyHex = fs.readFileSync(keyPath, 'utf8').trim();
        if (keyHex.length === 64 && /^[0-9a-fA-F]+$/.test(keyHex)) {
          this.cachedKey = Buffer.from(keyHex, 'hex');
          return this.cachedKey;
        }
      }
    } catch (err: any) {
      console.warn(`[SecretStore] Không thể đọc master.key hiện tại: ${err.message}. Đang tái tạo.`);
    }

    // Ensure security directory exists
    const secDir = path.dirname(keyPath);
    if (!fs.existsSync(secDir)) {
      fs.mkdirSync(secDir, { recursive: true });
    }

    // Generate random 256-bit cryptographic key
    const newKey = crypto.randomBytes(32);
    try {
      fs.writeFileSync(keyPath, newKey.toString('hex'), { encoding: 'utf8', mode: 0o600 });
      console.log(`[SecretStore] 🔒 Đã khởi tạo persistent master encryption key tại: ${keyPath}`);
    } catch (err: any) {
      console.error(`[SecretStore] ❌ Lỗi khi ghi master.key: ${err.message}`);
    }

    this.cachedKey = newKey;
    return this.cachedKey;
  }

  /**
   * Resolves legacy key (derived from SECRET_STORE_KEY or JWT_SECRET)
   * used exclusively for migrating old credentials to the new persistent master key.
   */
  public static getLegacyMasterKey(): Buffer {
    if (this.cachedLegacyKey) {
      return this.cachedLegacyKey;
    }

    const envKey = process.env.SECRET_STORE_KEY;
    if (!envKey || envKey.trim().length === 0) {
      const fallbackSeed = process.env.JWT_SECRET || 'antigravity-secure-video-master-encryption-seed-2026';
      this.cachedLegacyKey = crypto.createHash('sha256').update(fallbackSeed).digest();
      return this.cachedLegacyKey;
    }

    const trimmed = envKey.trim();
    if (trimmed.length === 64 && /^[0-9a-fA-F]+$/.test(trimmed)) {
      this.cachedLegacyKey = Buffer.from(trimmed, 'hex');
    } else if (trimmed.length === 32) {
      this.cachedLegacyKey = Buffer.from(trimmed, 'utf-8');
    } else {
      this.cachedLegacyKey = crypto.createHash('sha256').update(trimmed).digest();
    }

    return this.cachedLegacyKey;
  }

  /**
   * Encrypts plaintext API key with AES-256-GCM using persistent master key
   */
  public static encrypt(plainSecret: string): {
    encryptedKey: string;
    iv: string;
    authTag: string;
  } {
    if (!plainSecret || typeof plainSecret !== 'string') {
      throw new Error('SECRET_STORE_ERROR: plainSecret must be a non-empty string');
    }

    const key = this.getMasterKey();
    const iv = crypto.randomBytes(12); // Recommended 96 bits for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let ciphertext = cipher.update(plainSecret, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      encryptedKey: ciphertext,
      iv: iv.toString('hex'),
      authTag,
    };
  }

  /**
   * Decrypts ciphertext with AES-256-GCM
   * If decryption fails with master key, seamlessly attempts legacy key for zero-downtime migration.
   */
  public static decrypt(payload: {
    encryptedKey: string;
    iv: string;
    authTag: string;
  }): string {
    const { encryptedKey, iv, authTag } = payload;
    if (!encryptedKey || !iv || !authTag) {
      throw new Error('SECRET_STORE_ERROR: Incomplete encrypted credential payload');
    }

    // Attempt 1: Decrypt with persistent master key
    try {
      const key = this.getMasterKey();
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(iv, 'hex')
      );
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err: any) {
      // Attempt 2: Fallback to legacy key for existing installations
      try {
        const legacyKey = this.getLegacyMasterKey();
        const decipher = crypto.createDecipheriv(
          'aes-256-gcm',
          legacyKey,
          Buffer.from(iv, 'hex')
        );
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        console.log('[SecretStore] ℹ️ Đã giải mã thành công credential từ legacy key.');
        return decrypted;
      } catch {
        throw new Error('SECRET_STORE_ERROR: Failed to decrypt credential (authentication tag mismatch)');
      }
    }
  }

  /**
   * Masks secret for safe public metadata display
   * Never leaks raw secret.
   * e.g. "AIzaSy...4xK9" or "sk-proj-...8aZ1"
   */
  public static maskSecret(rawSecret: string): string {
    if (!rawSecret) return '***';
    const clean = rawSecret.trim();
    if (clean.length <= 8) {
      return '****';
    }

    if (clean.startsWith('AIzaSy')) {
      return `AIzaSy...${clean.slice(-4)}`;
    }

    if (clean.startsWith('sk-proj-') || clean.startsWith('sk-')) {
      const prefix = clean.startsWith('sk-proj-') ? 'sk-proj-...' : 'sk-...';
      return `${prefix}${clean.slice(-4)}`;
    }

    return `${clean.slice(0, 4)}...${clean.slice(-4)}`;
  }
}
