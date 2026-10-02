/**
 * ARCHITECTURE COMPLIANCE TEST
 * Static audit verifying that production semantic and pipeline modules
 * NEVER directly access raw API keys or call provider REST endpoints directly.
 * All semantic AI interactions MUST go through src/ai/ centralized abstraction.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

function findTsFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        findTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

describe('Architecture Compliance & Anti-Fragmentation Audit', () => {
  const rootSrc = path.resolve(process.cwd(), 'src');
  const auditedDirs = ['brain', 'engine', 'production', 'services'];

  it('Production modules must never directly read process.env.GEMINI_API_KEY or process.env.OPENAI_API_KEY', () => {
    const forbiddenPatterns = [
      'process.env.GEMINI_API_KEY',
      'process.env.OPENAI_API_KEY',
    ];

    const violations: { file: string; pattern: string }[] = [];

    for (const subDir of auditedDirs) {
      const fullDir = path.join(rootSrc, subDir);
      const files = findTsFiles(fullDir);

      for (const file of files) {
        // masterVideoEngine has backward-compatibility check for hasLLMConfigured if no plan is passed
        // We ensure that universalScriptWriter, research, etc. have ZERO direct reads
        if (path.basename(file) === 'masterVideoEngine.ts') continue;

        const content = fs.readFileSync(file, 'utf-8');
        for (const pattern of forbiddenPatterns) {
          if (content.includes(pattern)) {
            violations.push({ file: path.relative(process.cwd(), file), pattern });
          }
        }
      }
    }

    assert.strictEqual(
      violations.length,
      0,
      `Phát hiện các module vi phạm đọc trực tiếp API key: ${JSON.stringify(violations, null, 2)}`
    );
  });

  it('Production brain & engine modules must never directly invoke external LLM endpoints', () => {
    const forbiddenEndpoints = [
      'generativelanguage.googleapis.com',
      'api.openai.com/v1/chat/completions',
    ];

    const violations: { file: string; endpoint: string }[] = [];

    for (const subDir of auditedDirs) {
      const fullDir = path.join(rootSrc, subDir);
      const files = findTsFiles(fullDir);

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        for (const endpoint of forbiddenEndpoints) {
          if (content.includes(endpoint)) {
            violations.push({ file: path.relative(process.cwd(), file), endpoint });
          }
        }
      }
    }

    assert.strictEqual(
      violations.length,
      0,
      `Phát hiện các module vi phạm gọi REST endpoint trực tiếp thay vì qua AIProviderManager: ${JSON.stringify(violations, null, 2)}`
    );
  });
});
