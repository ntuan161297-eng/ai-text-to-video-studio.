/**
 * PHASE 2: REAL END-TO-END VALIDATION RUNNER
 * Executes the 6 real video categories through the Master Engine pipeline.
 * Captures all runtime logs, duration measurements, gate results, and review dossiers.
 */

import { generateVideo } from '../src/services/videoGenerator.js';
import fs from 'fs';
import path from 'path';

interface VideoTestCase {
  id: number;
  category: string;
  prompt: string;
  duration: number;
  outputFile: string;
}

const testCases: VideoTestCase[] = [
  {
    id: 1,
    category: 'REAL_PRODUCT',
    prompt: 'Đánh giá chi tiết xe máy điện VinFast Evo 200 Lite với khả năng di chuyển 205km một lần sạc',
    duration: 60,
    outputFile: '01_real_product_vinfast.mp4',
  },
  {
    id: 2,
    category: 'REAL_LOCATION',
    prompt: 'Khám phá vẻ đẹp kỳ vĩ và những nét văn hoá đặc sắc của cao nguyên đá Đồng Văn Hà Giang',
    duration: 60,
    outputFile: '02_real_location_dongvan.mp4',
  },
  {
    id: 3,
    category: 'NEWS',
    prompt: 'Việt Nam đẩy mạnh chuyển đổi số quốc gia và dịch vụ công trực tuyến năm 2024',
    duration: 60,
    outputFile: '03_news_digital_trans.mp4',
  },
  {
    id: 4,
    category: 'TECHNOLOGY',
    prompt: 'Giải thích nguyên lý hoạt động của mô hình ngôn ngữ lớn Large Language Model và Attention',
    duration: 60,
    outputFile: '04_tech_llm_attention.mp4',
  },
  {
    id: 5,
    category: 'DATA_FINANCE',
    prompt: 'Phân tích số liệu tăng trưởng kinh tế và xuất khẩu nông sản Việt Nam cán mốc kỷ lục',
    duration: 60,
    outputFile: '05_finance_export_gdp.mp4',
  },
  {
    id: 6,
    category: 'EXTENDED',
    prompt: 'Toàn cảnh chuỗi cung ứng ngành bán dẫn thế giới và cơ hội chiến lược của Việt Nam',
    duration: 120,
    outputFile: '06_extended_semiconductor.mp4',
  },
];

async function main() {
  console.log('================================================================');
  console.log('🚀 BẮT ĐẦU KIỂM CHỨNG THỰC TẾ 6 VIDEO END-TO-END (PHASE 2)');
  console.log('================================================================\n');

  const results: any[] = [];

  for (const tc of testCases) {
    console.log(`\n----------------------------------------------------------------`);
    console.log(`🎬 TEST VIDEO #${tc.id}: [${tc.category}] - ${tc.prompt}`);
    console.log(`⏱️ Thời lượng mục tiêu: ${tc.duration}s`);
    console.log(`----------------------------------------------------------------`);

    const start = Date.now();
    try {
      const res = await generateVideo(
        {
          prompt: tc.prompt,
          duration: tc.duration,
          outputFile: tc.outputFile,
          engine: 'hyperframes',
          aspectRatio: '9:16',
        },
        (stage, percent, msg) => {
          console.log(`  [${percent}%] (${stage}) ${msg || ''}`);
        }
      );

      const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`✅ Hoàn thành Test #${tc.id} trong ${elapsedSec}s: ${res.videoPath}`);

      results.push({
        id: tc.id,
        category: tc.category,
        prompt: tc.prompt,
        status: 'SUCCESS',
        videoPath: res.videoPath,
        fileSizeBytes: res.fileSizeBytes,
        actualDuration: res.duration,
        targetDuration: tc.duration,
        elapsedSec,
      });
    } catch (err: any) {
      const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
      console.error(`❌ Thất bại Test #${tc.id} (${tc.category}):`, err.message);

      results.push({
        id: tc.id,
        category: tc.category,
        prompt: tc.prompt,
        status: 'FAILED',
        error: err.message,
        elapsedSec,
      });
    }
  }

  console.log('\n================================================================');
  console.log('📊 TỔNG KẾT KẾT QUẢ KIỂM CHỨNG 6 VIDEO THỰC TẾ:');
  console.log('================================================================');
  console.table(
    results.map((r) => ({
      ID: r.id,
      Category: r.category,
      Status: r.status,
      TargetDur: `${r.targetDuration || '-'}s`,
      ActualDur: `${r.actualDuration || '-'}s`,
      SizeMB: r.fileSizeBytes ? (r.fileSizeBytes / (1024 * 1024)).toFixed(2) + ' MB' : '-',
      Elapsed: `${r.elapsedSec}s`,
      Error: r.error ? r.error.slice(0, 40) + '...' : 'None',
    }))
  );

  const reportPath = path.resolve('output/validation_summary.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n📄 Hồ sơ tổng hợp lưu tại: ${reportPath}`);
}

main().catch(console.error);
