import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { MasterVideoEngine } from '../src/engine/masterVideoEngine.js';

async function main() {
  console.log('=== TESTING REAL TAN DAN VIDEO GENERATION WITH FIXES ===');
  const outputDir = './temp/test_tan_dan_fix';

  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }

  try {
    const result = await MasterVideoEngine.execute({
      prompt: 'Tôi muốn tạo video giới thiệu về công ty Cổ phần tin học Tân Dân Công ty công nghệ phần mềm',
      targetDuration: 30,
      outputDir,
      ttsVoice: 'vi-VN-HoaiMyNeural',
      onProgress: (stage, percent, msg) => {
        console.log(`[${percent}%] (${stage}) ${msg || ''}`);
      }
    });

    console.log('\n✅ EXECUTION FINISHED SUCCESSFULLY!');
    console.log('Video Path:', result.videoPath);
    console.log('Video Size (bytes):', result.fileSizeBytes);

    // Verify index.html contains REAL image backgrounds (NOT radial-gradient)
    const indexPath = path.join(outputDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      const html = fs.readFileSync(indexPath, 'utf-8');
      const bgMatches = [...html.matchAll(/scene-bg-img[^>]*style="([^"]*)"/g)].map(m => m[1]);
      console.log('\n--- SCENE BG IN INDEX.HTML ---');
      bgMatches.forEach((bg, idx) => {
        console.log(`Scene ${idx + 1} BG: ${bg}`);
      });

      const hasRealImage = bgMatches.some(bg => bg.includes('background-image: url('));
      console.log('\nHas real visual background images:', hasRealImage ? 'PASS ✅' : 'FAIL ❌');
    }

    // Verify verified facts contain NO gender/sex equality nonsense
    const factsPath = path.join(outputDir, 'artifacts', '07_verified_facts.json');
    if (fs.existsSync(factsPath)) {
      const factsData = JSON.parse(fs.readFileSync(factsPath, 'utf-8'));
      const facts = factsData.payload || factsData;
      console.log('\n--- VERIFIED FACTS EXTRACTED (Total: ' + facts.length + ') ---');
      let foundGenderDrift = false;
      facts.forEach((f: any, idx: number) => {
        console.log(`${idx + 1}. [${f.sourceName || f.sourceUrl}] ${f.claim}`);
        if (/giới tính|nam và nữ|bình đẳng giới|luật bình đẳng/i.test(f.claim)) {
          foundGenderDrift = true;
        }
      });
      console.log('Free of gender homonym drift:', !foundGenderDrift ? 'PASS ✅' : 'FAIL ❌ (Drift detected!)');
    }

  } catch (err: any) {
    console.error('❌ FAILED WITH ERROR:', err.message);
    console.error(err.stack);
  }
}

main();
