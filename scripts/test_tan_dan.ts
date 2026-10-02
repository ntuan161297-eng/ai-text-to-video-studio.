import 'dotenv/config';
import { MasterVideoEngine } from '../src/engine/masterVideoEngine.js';

async function test() {
  console.log('Testing Tan Dan prompt with MasterVideoEngine...');
  try {
    const res = await MasterVideoEngine.execute({
      prompt: 'Tôi muốn tạo video giới thiệu về công ty Cổ phần tin học Tân Dân Công ty công nghệ phần mềm',
      targetDuration: 45,
      outputDir: './temp/test_tan_dan',
    });
    console.log('SUCCESS! Video generated at:', res.finalVideoPath);
  } catch (err: any) {
    console.error('FAILED WITH ERROR:', err.message);
    console.error(err.stack);
  }
}

test();
