/**
 * PART 39 — OBSERVABILITY & 25-STAGE ARTIFACT LOGGER
 * Saves 25 discrete pipeline stage artifacts for every job under:
 * temp/video-jobs/{jobId}/artifacts/
 * Enables instant root-cause tracing for any production anomaly.
 */

import fs from 'fs';
import path from 'path';

export interface StageArtifactsPayload {
  '01_input'?: any;
  '02_content_brief'?: any;
  '03_queries'?: any;
  '04_search_results'?: any;
  '05_sources'?: any;
  '06_clean_content'?: any;
  '07_verified_facts'?: any;
  '08_knowledge_brief'?: any;
  '09_angles'?: any;
  '10_hooks'?: any;
  '11_strategy'?: any;
  '12_script_draft'?: any;
  '13_script_review'?: any;
  '14_approved_script'?: any;
  '15_storyboard'?: any;
  '16_shotlist'?: any;
  '17_asset_candidates'?: any;
  '18_verified_assets'?: any;
  '19_voice'?: any;
  '20_timeline'?: any;
  '21_caption'?: any;
  '22_composition'?: any;
  '23_quality'?: any;
  '24_render_report'?: any;
  '25_post_render_qa'?: any;
}

export class ObservabilityLogger {
  /**
   * Saves all 25 discrete artifacts to disk with provenance
   */
  public static saveArtifacts(
    jobId: string,
    artifacts: StageArtifactsPayload,
    baseDir?: string,
    inputHash?: string
  ): string {
    const targetDir = baseDir
      ? path.join(baseDir, 'artifacts')
      : path.resolve('./temp', 'video-jobs', jobId, 'artifacts');

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const stages: (keyof StageArtifactsPayload)[] = [
      '01_input',
      '02_content_brief',
      '03_queries',
      '04_search_results',
      '05_sources',
      '06_clean_content',
      '07_verified_facts',
      '08_knowledge_brief',
      '09_angles',
      '10_hooks',
      '11_strategy',
      '12_script_draft',
      '13_script_review',
      '14_approved_script',
      '15_storyboard',
      '16_shotlist',
      '17_asset_candidates',
      '18_verified_assets',
      '19_voice',
      '20_timeline',
      '21_caption',
      '22_composition',
      '23_quality',
      '24_render_report',
      '25_post_render_qa',
    ];

    let prevStageHash = inputHash || '';

    for (const stage of stages) {
      const data = artifacts[stage];
      const filePath = path.join(targetDir, `${stage}.json`);
      const artifactWrapper = {
        provenance: {
          jobId,
          inputHash: inputHash || 'unhashed',
          stage,
          createdAt: new Date().toISOString(),
          parentArtifactHashes: prevStageHash ? [prevStageHash] : [],
        },
        payload: data ?? null,
      };

      fs.writeFileSync(filePath, JSON.stringify(artifactWrapper, null, 2), 'utf-8');
      prevStageHash = `${stage}_hash`;
    }

    return targetDir;
  }
}
