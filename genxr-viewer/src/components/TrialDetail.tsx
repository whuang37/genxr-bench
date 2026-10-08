import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw
} from 'lucide-react';
import type { TrialData } from '../types';
import { publicUrl } from '../publicUrl';
import { isVerifierPassed, shortTrialName } from '../trials';
import { InstructionsModal } from './InstructionsModal';
import { VerifierModal } from './VerifierModal';

type DetailModal = 'instructions' | 'verifier' | null;

interface TrialDetailProps {
  trial: TrialData;
  onNext: () => void;
  onPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function TrialDetail({
  trial,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  sidebarOpen,
  onToggleSidebar
}: TrialDetailProps) {
  const [modal, setModal] = useState<DetailModal>(null);
  const [frameKey, setFrameKey] = useState(0);
  const passed = isVerifierPassed(trial.verifier);
  const appUrl = trial.appUrl ? publicUrl(trial.appUrl) : null;

  return (
    <main className="trial-detail">
      <header className="trial-toolbar">
        <div className="trial-toolbar-start">
          <button className="icon-button" type="button" onClick={onToggleSidebar} aria-label="Toggle trial list">
            {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
          </button>
          <span className="toolbar-divider" />
          <button className="icon-button" type="button" onClick={onPrevious} disabled={!hasPrevious} aria-label="Previous trial">
            <ChevronLeft size={18} />
          </button>
          <button className="icon-button" type="button" onClick={onNext} disabled={!hasNext} aria-label="Next trial">
            <ChevronRight size={18} />
          </button>

          <div className="trial-title">
            <h1>{trial.taskName}</h1>
            <p>
              {shortTrialName(trial.trialName)}
              <span aria-hidden="true"> · </span>
              <span className={passed ? 'text-pass' : 'text-fail'}>{passed ? 'Passed' : 'Failed'} {trial.verifier.score}%</span>
              {trial.agent?.modelName && <><span aria-hidden="true"> · </span>{trial.agent.modelName.replace('gemini/', '')}</>}
            </p>
          </div>
        </div>

        <div className="trial-toolbar-actions">
          <button className="text-button" type="button" onClick={() => setModal('instructions')}>Instructions</button>
          <button className="text-button" type="button" onClick={() => setModal('verifier')}>Tests ({trial.verifier.tests.length})</button>
          {trial.hasApp && appUrl && (
            <>
              <button className="icon-button" type="button" onClick={() => setFrameKey((key) => key + 1)} aria-label="Reload preview">
                <RefreshCw size={16} />
              </button>
              <a className="icon-button" href={appUrl} target="_blank" rel="noreferrer" aria-label="Open preview in a new tab">
                <ExternalLink size={16} />
              </a>
            </>
          )}
        </div>
      </header>

      <div className="preview">
        {trial.hasApp && appUrl ? (
          <iframe
            key={frameKey}
            src={appUrl}
            title={`Preview of ${trial.taskName}`}
            allow="camera; microphone; xr-spatial-tracking; fullscreen"
          />
        ) : (
          <div className="empty-state">This trial has no app artifact.</div>
        )}
      </div>

      {modal === 'instructions' && (
        <InstructionsModal taskName={trial.taskName} markdown={trial.instructionMarkdown} onClose={() => setModal(null)} />
      )}
      {modal === 'verifier' && (
        <VerifierModal trialName={trial.trialName} taskName={trial.taskName} verifier={trial.verifier} onClose={() => setModal(null)} />
      )}
    </main>
  );
}
