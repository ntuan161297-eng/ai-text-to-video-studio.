import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import fs from 'fs';
import { JobIsolation } from '../src/engine/jobIsolation.js';
import { UniversalIntentEngine } from '../src/brain/universalIntentEngine.js';

test('JobIsolation path normalization', async (t) => {
  await t.test('JobIsolation.initWorkspace should never nest video-jobs multiple times', () => {
    const jobId = 'job_test123';
    const workspace1 = JobIsolation.initWorkspace({
      jobId,
      prompt: 'Test video',
    });

    // Calling initWorkspace again with workspace1.tempDir should NOT nest
    const workspace2 = JobIsolation.initWorkspace({
      jobId,
      prompt: 'Test video',
      baseTempDir: workspace1.tempDir,
      baseOutputDir: workspace1.outputDir,
    });

    assert.equal(workspace1.tempDir, workspace2.tempDir);
    assert.equal(workspace1.outputDir, workspace2.outputDir);

    // Should not contain duplicate video-jobs or jobId
    const occurrences = (workspace2.tempDir.match(new RegExp(jobId, 'g')) || []).length;
    assert.equal(occurrences, 1, `jobId appeared ${occurrences} times in tempDir`);

    // Clean up test directories
    if (fs.existsSync(workspace1.tempDir)) {
      fs.rmSync(workspace1.tempDir, { recursive: true, force: true });
    }
    if (fs.existsSync(workspace1.outputDir)) {
      fs.rmSync(workspace1.outputDir, { recursive: true, force: true });
    }
  });
});

test('UniversalIntentEngine multi-line prompt extraction', async (t) => {
  await t.test('should extract clean topic from multi-line prompt with instructions', () => {
    const multiLinePrompt = `Tạo video giới thiệu về Đặc sản Nem nắm - Giao Thủy
Có hình ảnh nem nắm 
Bỏ tiêu đề cảnh trong video
Có câu kết kêu gọi Lưu video vẫn comment ấn theo dõi kênh kết thúc video`;

    const { intentSpec, topicContract } = UniversalIntentEngine.resolve(multiLinePrompt, {
      duration: 60,
    });

    assert.equal(topicContract.coreTopic.includes('\n'), false, 'coreTopic must not contain newlines');
    assert.equal(topicContract.coreTopic.toLowerCase().includes('tiêu đề'), false, 'coreTopic must not include instructions');
    assert.equal(topicContract.coreTopic.toLowerCase().includes('theo dõi'), false, 'coreTopic must not include channel CTA');
    assert.ok(topicContract.coreTopic.includes('Nem nắm') || topicContract.coreTopic.includes('Giao Thủy'), `coreTopic should contain the food name: ${topicContract.coreTopic}`);
  });
});
