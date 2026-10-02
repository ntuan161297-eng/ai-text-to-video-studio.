/**
 * JOB CONTEXT & REVISION ARCHITECTURE TYPES (Section 1, 10, 11)
 * Explicitly separates:
 *   1. Video: Logical user video entity.
 *   2. Version: Immutable versioned snapshot of the video (v1, v2, ...).
 *   3. Job: A single processing/rendering execution pass.
 */

export type VideoOperation = 'CREATE_NEW' | 'REVISE_EXISTING';

export type RevisionScope = 'AUTO' | 'SCRIPT' | 'VISUAL' | 'VOICE' | 'CAPTION' | 'FULL';

export interface JobContext {
  operation: VideoOperation;
  videoId: string;
  versionId: string;
  versionNumber: number;
  jobId: string;
  inputHash: string;
  originalInput: string;
  baseVideoId?: string;
  baseVersionId?: string;
  feedback?: string;
  revisionScope?: RevisionScope;
  settings: Record<string, any>;
  createdAt: string;
}

export interface VideoVersionRecord {
  id: string;
  videoId: string;
  versionNumber: number;
  parentVersionId: string | null;
  originalPrompt: string;
  feedback?: string | null;
  revisionScope?: RevisionScope | null;
  approvedScript?: any;
  storyboard?: any;
  assets?: any;
  audioReport?: any;
  renderManifest?: any;
  outputUrl?: string | null;
  status: 'completed' | 'failed' | 'processing';
  createdAt: string;
}

export interface FeedbackAnalysisResult {
  intent: 'FEEDBACK_ONLY' | 'REVISION_REQUEST' | 'NEW_VIDEO_REQUEST';
  detectedScope: RevisionScope;
  issuesIdentified: string[];
  affectedStages: string[];
  unaffectedStages: string[];
  explanation: string;
}
