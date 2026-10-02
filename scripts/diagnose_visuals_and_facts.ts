import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';

async function diagnose() {
  console.log('=== DIAGNOSING RECENT JOBS & VISUALS ===');

  // 1. Check local_db.json
  const dbData = JSON.parse(fs.readFileSync('./data/local_db.json', 'utf-8'));
  console.log('Total videos in DB:', dbData.videos.length);
  const tanDanVideos = dbData.videos.filter((v: any) => v.prompt.includes('Tân Dân'));
  console.log('Tan Dan videos:', tanDanVideos.length);
  for (const v of tanDanVideos) {
    console.log(`- Video ID: ${v.id}, Status: ${v.status}, Step: ${v.current_step}, Error: ${v.error_message || 'none'}`);
  }

  // 2. Check artifacts in temp/test_tan_dan
  const testTanDanDir = './temp/test_tan_dan';
  if (fs.existsSync(testTanDanDir)) {
    const artifactsDir = path.join(testTanDanDir, 'artifacts');
    if (fs.existsSync(artifactsDir)) {
      const artFiles = fs.readdirSync(artifactsDir);
      console.log('\nArtifacts in temp/test_tan_dan/artifacts:', artFiles);
      
      const scriptFile = artFiles.find(f => f.includes('script') || f.includes('approved'));
      if (scriptFile) {
        const scriptData = JSON.parse(fs.readFileSync(path.join(artifactsDir, scriptFile), 'utf-8'));
        console.log('\n--- SCRIPT BEATS ---');
        const beats = scriptData.beats || scriptData.allBeats || [];
        beats.forEach((b: any, i: number) => {
          console.log(`Beat ${i + 1}: [${b.displayHeadline || b.purpose}] -> Narration: "${b.narration}"`);
        });
      }

      const verifiedAssetsFile = artFiles.find(f => f.includes('18_verified_assets') || f.includes('asset'));
      if (verifiedAssetsFile) {
        const assetData = JSON.parse(fs.readFileSync(path.join(artifactsDir, verifiedAssetsFile), 'utf-8'));
        console.log('\n--- ASSET DATA ---');
        console.log(JSON.stringify(assetData, null, 2));
      }

      const researchBriefFile = artFiles.find(f => f.includes('brief') || f.includes('08_knowledge_brief'));
      if (researchBriefFile) {
        const briefData = JSON.parse(fs.readFileSync(path.join(artifactsDir, researchBriefFile), 'utf-8'));
        console.log('\n--- KNOWLEDGE BRIEF ---');
        console.log('Topic summary:', briefData.topicSummary);
        console.log('Facts:', briefData.importantFacts || briefData.strongestFacts);
      }
    }

    // Check index.html for image references
    const indexPath = path.join(testTanDanDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      const html = fs.readFileSync(indexPath, 'utf-8');
      const bgMatches = [...html.matchAll(/scene-bg-img[^>]*style="([^"]*)"/g)].map(m => m[1]);
      console.log('\n--- SCENE BG IN INDEX.HTML ---');
      console.log(bgMatches);
    }
  }
}

diagnose();
