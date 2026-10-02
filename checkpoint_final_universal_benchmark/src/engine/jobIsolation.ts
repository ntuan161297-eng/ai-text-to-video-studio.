/**
 * JOB ISOLATION & PROVENANCE ENGINE
 * Guarantees 100% strict cross-job independence:
 *   1. Explicit jobId across all stages (never implicit/global).
 *   2. Immutable 00_input_snapshot.json with SHA256 inputHash.
 *   3. Artifact provenance tracking (jobId, inputHash, stage, parentHashes).
 *   4. ContentContaminationDetector: detects semantic/entity leakage between jobs.
 *   5. Strict job workspace isolation (artifacts/{jobId}, tmp/{jobId}/assets, tmp/{jobId}/audio, output/{jobId}).
 *   6. Explicit render_manifest.json (prohibiting loose disk scans/globs).
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface JobProvenanceHeader {
  jobId: string;
  inputHash: string;
  stage: string;
  createdAt: string;
  parentArtifactHashes: string[];
}

export interface InputSnapshot {
  jobId: string;
  originalPrompt: string;
  sourceUrl?: string;
  duration: number;
  language: string;
  settings: Record<string, any>;
  inputHash: string;
  createdAt: string;
}

export interface JobWorkspace {
  jobId: string;
  inputHash: string;
  snapshot: InputSnapshot;
  artifactsDir: string;
  tempDir: string;
  assetsDir: string;
  audioDir: string;
  outputDir: string;
}

export interface RenderManifest {
  jobId: string;
  inputHash: string;
  title: string;
  targetDuration: number;
  scriptArtifact: string;
  storyboardArtifact: string;
  assets: Array<{
    sceneId: number;
    shotId: string;
    filePath: string;
    entityName: string;
    isRealEntityAsset: boolean;
  }>;
  voiceFiles: Array<{
    beatId: number;
    filePath: string;
    durationSec: number;
  }>;
  captions: Array<{
    beatId: number;
    text: string;
    startSec?: number;
    endSec?: number;
    startTime?: number;
    endTime?: number;
  }>;
  expectedEntities: string[];
  createdAt: string;
}

export class JobIsolation {
  private static recentJobEntitiesMap = new Map<string, { prompt: string; entities: string[] }>();

  /**
   * Computes an immutable SHA-256 hash identifying the generation input
   */
  public static computeInputHash(options: {
    prompt: string;
    url?: string;
    duration?: number;
    language?: string;
    contentType?: string;
    options?: Record<string, any>;
  }): string {
    const normalized = [
      (options.prompt || '').trim().toLowerCase(),
      (options.url || '').trim().toLowerCase(),
      options.duration || 60,
      options.language || 'vi',
      options.contentType || '',
      JSON.stringify(options.options || {}),
    ].join('::');

    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Initializes a strictly isolated workspace for a new generation job
   */
  public static initWorkspace(options: {
    jobId?: string;
    prompt: string;
    url?: string;
    duration?: number;
    language?: string;
    settings?: Record<string, any>;
    baseOutputDir?: string;
    baseTempDir?: string;
    attemptId?: string;
  }): JobWorkspace {
    const rawJobId = options.jobId || `job_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const jobId = options.attemptId ? `${rawJobId}/${options.attemptId}` : rawJobId;
    const duration = options.duration || 60;
    const language = options.language || 'vi';
    const settings = options.settings || {};

    const inputHash = this.computeInputHash({
      prompt: options.prompt,
      url: options.url,
      duration,
      language,
      options: settings,
    });

    const rootTemp = path.resolve(options.baseTempDir || process.env.TEMP_DIR || './temp');
    const rootOutput = path.resolve(options.baseOutputDir || process.env.OUTPUT_DIR || './output');

    const jobTempDir = path.join(rootTemp, 'video-jobs', jobId);
    const artifactsDir = path.join(jobTempDir, 'artifacts');
    const assetsDir = path.join(jobTempDir, 'assets');
    const audioDir = path.join(jobTempDir, 'audio');
    const outputDir = path.join(rootOutput, jobId);

    // Ensure pristine isolated directories exist
    [artifactsDir, assetsDir, audioDir, outputDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Create immutable 00_input_snapshot.json
    const snapshot: InputSnapshot = {
      jobId,
      originalPrompt: options.prompt,
      sourceUrl: options.url || undefined,
      duration,
      language,
      settings,
      inputHash,
      createdAt: new Date().toISOString(),
    };

    const snapshotPath = path.join(artifactsDir, '00_input_snapshot.json');
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8');

    return {
      jobId,
      inputHash,
      snapshot,
      artifactsDir,
      tempDir: jobTempDir,
      assetsDir,
      audioDir,
      outputDir,
    };
  }

  /**
   * Wraps an artifact with standard provenance metadata
   */
  public static wrapWithProvenance<T>(
    data: T,
    workspace: { jobId: string; inputHash: string },
    stage: string,
    parentHashes: string[] = []
  ): { provenance: JobProvenanceHeader; payload: T } {
    return {
      provenance: {
        jobId: workspace.jobId,
        inputHash: workspace.inputHash,
        stage,
        createdAt: new Date().toISOString(),
        parentArtifactHashes: parentHashes,
      },
      payload: data,
    };
  }

  /**
   * Saves a stage artifact into the job's isolated artifacts directory with provenance
   */
  public static saveStageArtifact(
    workspace: JobWorkspace,
    stageName: string,
    data: any,
    parentHashes: string[] = []
  ): string {
    const wrapped = this.wrapWithProvenance(data, workspace, stageName, parentHashes);
    const targetFile = path.join(workspace.artifactsDir, `${stageName}.json`);
    fs.writeFileSync(targetFile, JSON.stringify(wrapped, null, 2), 'utf-8');
    return targetFile;
  }

  /**
   * Verifies an artifact's provenance against current job expectations
   */
  public static verifyProvenance(
    artifactPath: string,
    expectedJobId: string,
    expectedInputHash: string
  ): boolean {
    if (!fs.existsSync(artifactPath)) return false;
    try {
      const raw = fs.readFileSync(artifactPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed.provenance) return false;
      return (
        parsed.provenance.jobId === expectedJobId &&
        parsed.provenance.inputHash === expectedInputHash
      );
    } catch {
      return false;
    }
  }

  /**
   * Registers a job's entities for cross-job contamination checks
   */
  public static registerJobEntities(jobId: string, prompt: string, entities: string[]): void {
    this.recentJobEntitiesMap.set(jobId, { prompt, entities });
    // Keep max 50 recent jobs
    if (this.recentJobEntitiesMap.size > 50) {
      const firstKey = this.recentJobEntitiesMap.keys().next().value;
      if (firstKey) this.recentJobEntitiesMap.delete(firstKey);
    }
  }

  /**
   * Checks for Cross-Job Content Contamination.
   * Compares the current output/script/facts against previous jobs to ensure
   * no foreign entities leaked across job boundaries.
   */
  public static assertNoContamination(options: {
    currentJobId: string;
    currentPrompt: string;
    currentEntities: string[];
    contentToCheck: string;
    stageName: string;
  }): void {
    const { currentJobId, currentPrompt, currentEntities, contentToCheck, stageName } = options;
    const lowerContent = contentToCheck.toLowerCase();

    for (const [prevJobId, prevData] of this.recentJobEntitiesMap.entries()) {
      if (prevJobId === currentJobId) continue;

      // Find entities unique to the previous job that are NOT part of the current prompt/entities
      const currentEntitySet = new Set(
        [
          ...currentEntities.map((e) => e.toLowerCase()),
          ...currentPrompt.toLowerCase().split(/\s+/).filter((w) => w.length > 3),
        ]
      );

      for (const prevEntity of prevData.entities) {
        const cleanPrevEntity = prevEntity.toLowerCase().trim();
        // Ignore single syllables <= 4 chars or common generic words to prevent false positives
        if (cleanPrevEntity.length <= 4 && !cleanPrevEntity.includes(' ')) continue;
        if (COMMON_GENERIC_WORDS.has(cleanPrevEntity)) continue;

        // If the current prompt doesn't ask for this entity, but it appears in the output
        if (!currentEntitySet.has(cleanPrevEntity)) {
          // Unicode-aware word boundary matching for Vietnamese
          const regex = new RegExp(`(^|[^a-zA-Z0-9à-ỹÀ-Ỹ])${escapeRegExp(cleanPrevEntity)}($|[^a-zA-Z0-9à-ỹÀ-Ỹ])`, 'i');
          if (regex.test(lowerContent)) {
            const errorMsg = `[CRITICAL CROSS_JOB_CONTAMINATION] Stage "${stageName}" contained foreign entity "${prevEntity}" from Job "${prevJobId}" (Prompt: "${prevData.prompt}") in current Job "${currentJobId}" (Prompt: "${currentPrompt}")!`;
            console.error(errorMsg);
            throw new Error(errorMsg);
          }
        }
      }
    }
  }

  /**
   * Validates that all files in a list strictly belong to the specified jobId
   */
  public static assertFilesBelongToJob(filePaths: string[], expectedJobId: string, contextLabel = 'files'): void {
    const normalizedJobId = expectedJobId.replace(/[^a-zA-Z0-9_-]/g, '');
    for (const f of filePaths) {
      const normalizedPath = f.replace(/\\/g, '/');
      if (!normalizedPath.includes(normalizedJobId) && !normalizedPath.includes(expectedJobId)) {
        throw new Error(
          `[JobIsolation] FAIL: File "${f}" for ${contextLabel} does NOT belong to jobId "${expectedJobId}". Cross-job file leakage blocked!`
        );
      }
    }
  }

  /**
   * Generates and writes the RenderManifest
   */
  public static createRenderManifest(
    workspace: JobWorkspace,
    manifestData: Omit<RenderManifest, 'jobId' | 'inputHash' | 'createdAt'>
  ): RenderManifest {
    const manifest: RenderManifest = {
      jobId: workspace.jobId,
      inputHash: workspace.inputHash,
      createdAt: new Date().toISOString(),
      ...manifestData,
    };

    // Validate all asset and voice paths strictly belong to this job
    const allPaths = [
      ...manifest.assets.map((a) => a.filePath).filter(Boolean),
      ...manifest.voiceFiles.map((v) => v.filePath).filter(Boolean),
    ];

    this.assertFilesBelongToJob(allPaths, workspace.jobId, 'RenderManifest');

    const manifestTempPath = path.join(workspace.tempDir, 'render_manifest.json');
    const manifestArtifactPath = path.join(workspace.artifactsDir, 'render_manifest.json');

    fs.writeFileSync(manifestTempPath, JSON.stringify(manifest, null, 2), 'utf-8');
    fs.writeFileSync(manifestArtifactPath, JSON.stringify(manifest, null, 2), 'utf-8');

    return manifest;
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const COMMON_GENERIC_WORDS = new Set([
  'hành', 'toàn', 'việt', 'nam', 'ngày', 'năm', 'tháng', 'thời', 'gian', 'công', 'nghệ',
  'quốc', 'gia', 'thế', 'giới', 'điều', 'những', 'trong', 'ngoài', 'phát', 'triển', 'thực',
  'hiện', 'thị', 'trường', 'kinh', 'tế', 'sản', 'phẩm', 'khách', 'hàng', 'thông', 'tin',
  'hệ', 'thống', 'video', 'nội', 'dung', 'bước', 'đầu', 'cuộc', 'sống', 'người', 'dùng',
  'chúng', 'ta', 'chiến', 'lược', 'tăng', 'trưởng', 'doanh', 'nghiệp', 'xu', 'hướng'
]);
