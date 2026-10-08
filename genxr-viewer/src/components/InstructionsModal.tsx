import { Modal } from './Modal';

interface InstructionsModalProps {
  taskName: string;
  markdown: string;
  onClose: () => void;
}

export function InstructionsModal({ taskName, markdown, onClose }: InstructionsModalProps) {
  return (
    <Modal title="Instructions" subtitle={taskName} size="large" onClose={onClose}>
      <pre className="instruction-source">{markdown}</pre>
    </Modal>
  );
}
