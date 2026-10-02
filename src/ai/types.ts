/**
 * AI CONFIGURATION & EXECUTION ROUTING CONTRACTS
 * Core types for AI / NO-AI execution modes, provider management,
 * credentials security, and job isolation.
 */

export type AIExecutionMode = 'FULL_AI' | 'ASSISTED_AI' | 'NO_AI';

export type AIProviderType = 'GEMINI' | 'OPENAI';

export type AIProviderStrategy = 'GEMINI' | 'OPENAI' | 'AUTO';

export type CredentialState =
  | 'READY'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'QUOTA_EXHAUSTED'
  | 'AUTH_INVALID'
  | 'BILLING_DISABLED'
  | 'DISABLED';

export type CredentialOwnerType = 'SYSTEM' | 'USER';

export type UserFactResearchPolicy =
  | 'USE_AS_PROVIDED'
  | 'VERIFY_USER_FACTS'
  | 'RESEARCH_MISSING_ONLY';

export interface UserInputData {
  prompt?: string;
  topic?: string;
  objective?: string;
  duration?: number;
  script?: string;
  scriptBeats?: Array<{
    beatIndex?: number;
    narration: string;
    visualDescription?: string;
    onScreenText?: string;
    estimatedSeconds?: number;
  }>;
  facts?: string[];
  outline?: string[];
  sourceUrls?: string[];
  mustInclude?: string[];
  mustAvoid?: string[];
  tone?: string;
  cta?: string;
  uploadedVisuals?: string[]; // paths or URLs
  uploadedVoiceUrl?: string;  // path to user-uploaded voice audio
  userVoiceTranscript?: string; // transcript for uploaded voice
  researchPolicy?: UserFactResearchPolicy;
}

export interface InputSufficiencyCheck {
  isSufficient: boolean;
  missingRequirements: string[];
  suggestedMode?: AIExecutionMode;
  message: string;
}

export interface AICredentialMetadata {
  id: string;
  provider: AIProviderType;
  ownerType: CredentialOwnerType;
  userId?: string;
  source: 'ENV' | 'DB';
  status: CredentialState;
  priority: number;
  maskedIdentifier: string; // e.g. "AIzaSy...4xK9"
  createdAt: string;
  updatedAt: string;
}

export interface EncryptedCredentialRecord {
  id: string;
  provider: AIProviderType;
  ownerType: CredentialOwnerType;
  userId?: string;
  encryptedKey: string;     // ciphertext (hex)
  iv: string;               // initialization vector (hex)
  authTag: string;          // GCM auth tag (hex)
  maskedIdentifier: string;
  status: CredentialState;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAIConfig {
  aiEnabled: boolean;
  allowedModes: AIExecutionMode[];
  allowedProviders: AIProviderType[];
  defaultStrategy: AIProviderStrategy;
  allowUserBYOK: boolean;
  providerFailover: boolean;
  maxAIRequestsPerJob: number;
  maxEstimatedCostPerJob?: number;
}

export interface UserAICapabilities {
  systemAIAvailable: boolean;
  allowedProviders: AIProviderType[];
  allowedModes: AIExecutionMode[];
  allowUserBYOK: boolean;
}

export interface ExecutionPlan {
  jobId: string;
  aiEnabled: boolean;
  mode: AIExecutionMode;
  stagesToRun: string[];
  stagesToSkip: string[];
  stagesUsingAI: string[];
  stagesUsingUserInput: string[];
  stagesUsingDeterministicProcessing: string[];
  pinnedProvider: AIProviderType | 'NONE';
  providerStrategy: AIProviderStrategy;
  reasons: Record<string, string>;
  researchPolicy?: UserFactResearchPolicy;
  userScriptProvided: boolean;
  userVoiceProvided: boolean;
  userVisualsProvided: boolean;
}

export interface AIExecutionTrace {
  jobId: string;
  aiEnabled: boolean;
  mode: AIExecutionMode;
  providerStrategy: AIProviderStrategy;
  primaryProvider: AIProviderType | 'NONE';
  actualProvidersUsed: AIProviderType[];
  keySource: 'SYSTEM' | 'USER' | 'ENV' | 'NONE';
  llmCalls: number;
  stagesUsingAI: string[];
  stagesSkipped: string[];
  retryCount: number;
  failoverCount: number;
  failoverReasons: string[];
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCost: number | null;
  budgetStatus: 'OK' | 'AI_JOB_BUDGET_REACHED';
}
