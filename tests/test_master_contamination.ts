import { MasterVideoEngine } from '../src/engine/masterVideoEngine.js';
import path from 'path';
import fs from 'fs';

async function testMasterContamination() {
  const dirA = path.resolve('./temp/test_job_a');
  const dirB = path.resolve('./temp/test_job_b');
  if (!fs.existsSync(dirA)) fs.mkdirSync(dirA, { recursive: true });
  if (!fs.existsSync(dirB)) fs.mkdirSync(dirB, { recursive: true });

  const promptA = 'Tạo video 60 giây về xe máy điện.';
  const promptB = 'Tạo video 60 giây về các hành tinh trong hệ Mặt Trời.';

  console.log('--- STARTING SEQUENTIAL MASTER ENGINE RUN ---');
  
  // We can mock render or run up to step 12
  console.log('\n>>> RUNNING JOB A: ' + promptA);
  // Let's inspect the artifacts generated for Job A vs Job B
}

testMasterContamination().catch(console.error);
