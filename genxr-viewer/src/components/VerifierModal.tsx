import type { VerifierSummary } from '../types';
import { isVerifierPassed, shortTrialName } from '../trials';
import { Modal } from './Modal';

interface VerifierModalProps {
  trialName: string;
  taskName: string;
  verifier: VerifierSummary;
  onClose: () => void;
}

export function VerifierModal({ trialName, taskName, verifier, onClose }: VerifierModalProps) {
  const passed = isVerifierPassed(verifier);

  return (
    <Modal title="Test results" subtitle={`${taskName} · ${shortTrialName(trialName)}`} size="large" onClose={onClose}>
      <dl className="verifier-summary">
        <div><dt>Outcome</dt><dd className={passed ? 'text-pass' : 'text-fail'}>{passed ? 'Passed' : 'Failed'}</dd></div>
        <div><dt>Score</dt><dd>{verifier.score}%</dd></div>
        <div><dt>Tests</dt><dd>{verifier.passedTests} of {verifier.totalTests}</dd></div>
        <div><dt>Required gate</dt><dd>{verifier.requiredGateFailed ? 'Failed' : 'Passed'}</dd></div>
      </dl>

      {verifier.errors.length > 0 && (
        <section className="error-list">
          <h3>Errors</h3>
          <ul>{verifier.errors.map((error, index) => <li key={index}>{String(error)}</li>)}</ul>
        </section>
      )}

      <section className="test-results">
        <h3>Test cases</h3>
        {verifier.tests.length === 0 && <p>No individual test cases were recorded.</p>}
        {verifier.tests.map((test, index) => (
          <details key={test.id || index}>
            <summary>
              <span>{test.name || test.id}</span>
              <span className={test.status === 'passed' ? 'text-pass' : 'text-fail'}>{test.status}</span>
            </summary>
            {test.required && <p className="test-note">Required test</p>}
            {test.runs?.map((run, runIndex) => (
              <div className="test-run" key={run.id || runIndex}>
                <p>
                  <strong>{run.id || `Run ${runIndex + 1}`}</strong>
                  <span>{run.status}</span>
                  {run.durationMs != null && <span>{(run.durationMs / 1000).toFixed(1)} s</span>}
                </p>
                {(run.scene || run.primaryHand || run.secondaryHand) && (
                  <p className="run-meta">
                    {[run.scene, run.primaryHand, run.secondaryHand].filter(Boolean).join(' · ')}
                  </p>
                )}
                {run.message && <pre>{run.message}</pre>}
                {Boolean(run.diagnostics?.pageErrors?.length) && (
                  <pre>{JSON.stringify(run.diagnostics?.pageErrors, null, 2)}</pre>
                )}
              </div>
            ))}
          </details>
        ))}
      </section>

      <details className="raw-data">
        <summary>Raw verifier data</summary>
        <pre>{JSON.stringify(verifier, null, 2)}</pre>
      </details>
    </Modal>
  );
}
