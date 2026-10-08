import type { TrialData, VerifierSummary } from './types';

export function isVerifierPassed(verifier: VerifierSummary): boolean {
  return (
    verifier.score === 100 ||
    (verifier.totalTests > 0 &&
      verifier.passedTests === verifier.totalTests &&
      !verifier.requiredGateFailed)
  );
}

export function shortTrialName(trialName: string): string {
  return trialName.includes('__') ? trialName.split('__')[1] : trialName;
}

export function findTrialIndex(trials: TrialData[], trialName: string | null): number {
  if (!trialName) return -1;
  return trials.findIndex((trial) => trial.trialName === trialName);
}
