/**
 * COPY-ON-WRITE REVISION ENGINE (Sections 3, 4, 6, 11, 16)
 * Strictly guarantees that revisions NEVER overwrite earlier versions.
 * Employs Copy-On-Write semantics:
 *   - Base version (v1) remains completely immutable.
 *   - New version (v2) is stored in its own versioned directory: output/{videoId}/v2/
 *   - Downstream dependencies are re-evaluated based on the RevisionScope.
 *   - Unaffected stages are referenced/copied from the base version without wasteful re-computation.
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { JobContext, RevisionScope, VideoVersionRecord } from '../types/jobContext.js';
import { JobIsolation } from './jobIsolation.js';
import { RevisionIntentClassifier } from './revisionIntentClassifier.js';

export interface RevisionExecutionOptions {
  baseVersion: VideoVersionRecord;
  feedback: string;
  scope?: RevisionScope;
  outputBaseDir?: string;
  onProgress?: (stage: string, percent: number, message: string) => Promise<void> | void;
}

export interface RevisionExecutionResult {
  newVersionId: string;
  newVersionNumber: number;
  newJobId: string;
  jobContext: JobContext;
  outputDir: string;
  artifactsDir: string;
  scopeUsed: RevisionScope;
  reusedArtifacts: string[];
  regeneratedArtifacts: string[];
}

export class RevisionEngine {
  /**
   * Initializes a Copy-on-Write workspace for the new revision version
   */
  public static initRevisionWorkspace(options: {
    baseVersion: VideoVersionRecord;
    feedback: string;
    scope?: RevisionScope;
    outputBaseDir?: string;
    tempBaseDir?: string;
  }): {
    jobContext: JobContext;
    versionOutputDir: string;
    versionArtifactsDir: string;
    versionAssetsDir: string;
    versionAudioDir: string;
    scope: RevisionScope;
  } {
    const { baseVersion, feedback, outputBaseDir, tempBaseDir } = options;
    const scope = options.scope && options.scope !== 'AUTO'
      ? options.scope
      : RevisionIntentClassifier.analyzeFeedback(feedback).detectedScope;

    const newVersionNumber = (baseVersion.versionNumber || 1) + 1;
    const newVersionId = `ver_${baseVersion.videoId}_v${newVersionNumber}_${uuidv4().slice(0, 8)}`;
    const newJobId = `job_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

    const rootOutput = path.resolve(outputBaseDir || process.env.OUTPUT_DIR || './output');
    const rootTemp = path.resolve(tempBaseDir || process.env.TEMP_DIR || './temp');

    // Section 16: Versioned output structure: output/{videoId}/v{newVersionNumber}/
    const versionOutputDir = path.join(rootOutput, baseVersion.videoId, `v${newVersionNumber}`);
    const versionTempDir = path.join(rootTemp, 'video-jobs', newJobId);
    const versionArtifactsDir = path.join(versionTempDir, 'artifacts');
    const versionAssetsDir = path.join(versionTempDir, 'assets');
    const versionAudioDir = path.join(versionTempDir, 'audio');

    [versionOutputDir, versionArtifactsDir, versionAssetsDir, versionAudioDir].forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    const inputHash = JobIsolation.computeInputHash({
      prompt: `${baseVersion.originalPrompt}::revision::${feedback}`,
      duration: baseVersion.storyboard?.totalDuration || 60,
      options: { baseVersionId: baseVersion.id, scope },
    });

    const jobContext: JobContext = {
      operation: 'REVISE_EXISTING',
      videoId: baseVersion.videoId,
      versionId: newVersionId,
      versionNumber: newVersionNumber,
      jobId: newJobId,
      inputHash,
      originalInput: baseVersion.originalPrompt,
      baseVideoId: baseVersion.videoId,
      baseVersionId: baseVersion.id,
      feedback,
      revisionScope: scope,
      settings: { scope, parentVersionNumber: baseVersion.versionNumber },
      createdAt: new Date().toISOString(),
    };

    // Save 00_input_snapshot.json for this revision
    const snapshotPath = path.join(versionArtifactsDir, '00_input_snapshot.json');
    fs.writeFileSync(snapshotPath, JSON.stringify(jobContext, null, 2), 'utf-8');

    return {
      jobContext,
      versionOutputDir,
      versionArtifactsDir,
      versionAssetsDir,
      versionAudioDir,
      scope,
    };
  }

  /**
   * Applies Copy-On-Write logic based on the dependency graph.
   * If scope = VISUAL, retains script, voice, timeline, captions from base version.
   * If scope = VOICE, retains script and visual assets from base version.
   * If scope = CAPTION, retains script, visual assets, and voice from base version.
   */
  public static prepareRevisionData(
    baseVersion: VideoVersionRecord,
    scope: RevisionScope
  ): {
    reusedScript: any | null;
    reusedAudioReport: any | null;
    reusedAssets: any | null;
    reusedCaptions: any | null;
    reusedTimeline: any | null;
    mustRegenerate: {
      script: boolean;
      visuals: boolean;
      voice: boolean;
      captions: boolean;
      timeline: boolean;
    };
  } {
    const dependencies = RevisionIntentClassifier.getDependenciesForScope(scope);

    switch (scope) {
      case 'VISUAL':
        return {
          reusedScript: baseVersion.approvedScript || null,
          reusedAudioReport: baseVersion.audioReport || null,
          reusedAssets: null, // Regenerate visuals
          reusedCaptions: baseVersion.storyboard?.captions || null,
          reusedTimeline: baseVersion.storyboard || null,
          mustRegenerate: {
            script: false,
            visuals: true,
            voice: false,
            captions: false,
            timeline: false,
          },
        };

      case 'VOICE':
        return {
          reusedScript: baseVersion.approvedScript || null,
          reusedAudioReport: null, // Regenerate audio
          reusedAssets: baseVersion.assets || null,
          reusedCaptions: null, // Recalculate subtitle timestamps
          reusedTimeline: null, // Recalculate timeline with new audio duration
          mustRegenerate: {
            script: false,
            visuals: false,
            voice: true,
            captions: true,
            timeline: true,
          },
        };

      case 'CAPTION':
        return {
          reusedScript: baseVersion.approvedScript || null,
          reusedAudioReport: baseVersion.audioReport || null,
          reusedAssets: baseVersion.assets || null,
          reusedCaptions: null, // Regenerate/re-format captions
          reusedTimeline: baseVersion.storyboard || null,
          mustRegenerate: {
            script: false,
            visuals: false,
            voice: false,
            captions: true,
            timeline: false,
          },
        };

      case 'SCRIPT':
        return {
          reusedScript: null,
          reusedAudioReport: null,
          reusedAssets: null,
          reusedCaptions: null,
          reusedTimeline: null,
          mustRegenerate: {
            script: true,
            visuals: true,
            voice: true,
            captions: true,
            timeline: true,
          },
        };

      case 'FULL':
      case 'AUTO':
      default:
        return {
          reusedScript: null,
          reusedAudioReport: null,
          reusedAssets: null,
          reusedCaptions: null,
          reusedTimeline: null,
          mustRegenerate: {
            script: true,
            visuals: true,
            voice: true,
            captions: true,
            timeline: true,
          },
        };
    }
  }
}
