export interface JobRegistryEntry {
  jobId: string;
  importedAt: string;
  artifactsIncluded?: boolean;
  totalTrials: number;
  passedTrials: number;
  failedTrials: number;
  manifestUrl: string;
}

export interface TestRun {
  id: string;
  status: 'passed' | 'failed' | string;
  durationMs?: number;
  primaryHand?: string;
  secondaryHand?: string;
  scene?: string;
  realTime?: boolean;
  message?: string;
  recording?: {
    mode?: string;
    videoPath?: string;
    manifestPath?: string;
  };
  diagnostics?: {
    consoleEntries?: unknown[];
    pageErrors?: unknown[];
    networkErrors?: unknown[];
  };
}

export interface TestCase {
  id: string;
  name: string;
  kind?: string;
  required?: boolean;
  status: 'passed' | 'failed' | string;
  runs?: TestRun[];
}

export interface VerifierSummary {
  status: string;
  score: number;
  passedTests: number;
  totalTests: number;
  requiredGateFailed: boolean;
  runnable: boolean;
  tests: TestCase[];
  errors: string[];
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface TrialVideo {
  name: string;
  relativePath: string;
  url: string;
  mediaType: 'video/mp4' | 'video/webm';
}

export interface TrialData {
  trialName: string;
  taskName: string;
  hasApp: boolean;
  hasArtifacts?: boolean;
  appUrl: string | null;
  artifactsUrl?: string | null;
  videos: TrialVideo[];
  instructionMarkdown: string;
  verifier: VerifierSummary;
  agent?: {
    name?: string;
    modelName?: string;
  };
}

export interface JobManifest {
  jobId: string;
  importedAt: string;
  artifactsIncluded?: boolean;
  totalTrials: number;
  passedTrials: number;
  failedTrials: number;
  totalVideos: number;
  trials: TrialData[];
}
