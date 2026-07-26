import { useEffect } from 'react';
import { Check, Download, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  CONFIRMATION_BUTTON_CLASSES,
  CONFIRMATION_ICON_CONTAINER_CLASSES,
} from '../../constants/constants';
import type { ConfirmationRequest } from '../../types/types';

type ConfirmActionModalProps = {
  action: ConfirmationRequest | null;
  onCancel: () => void;
  onConfirm: () => void;
};

function renderConfirmActionIcon(actionType: ConfirmationRequest['type']) {
  if (actionType === 'discard' || actionType === 'delete') {
    return <Trash2 className="h-4 w-4" />;
  }

  if (actionType === 'commit') {
    return <Check className="h-4 w-4" />;
  }

  if (actionType === 'pull') {
    return <Download className="h-4 w-4" />;
  }

  if (actionType === 'revertLocalCommit') {
    return <RotateCcw className="h-4 w-4" />;
  }

  return <Upload className="h-4 w-4" />;
}

// Map action types to their git i18n title key
const TITLE_KEYS: Record<string, string> = {
  discard: 'git:confirmModal.titles.discard',
  delete: 'git:confirmModal.titles.delete',
  commit: 'git:confirmModal.titles.commit',
  pull: 'git:confirmModal.titles.pull',
  push: 'git:confirmModal.titles.push',
  publish: 'git:confirmModal.titles.publish',
  revertLocalCommit: 'git:confirmModal.titles.revertLocalCommit',
  deleteBranch: 'git:confirmModal.titles.deleteBranch',
};

const ACTION_LABEL_KEYS: Record<string, string> = {
  discard: 'git:confirmModal.actionLabels.discard',
  delete: 'git:confirmModal.actionLabels.delete',
  commit: 'git:confirmModal.actionLabels.commit',
  pull: 'git:confirmModal.actionLabels.pull',
  push: 'git:confirmModal.actionLabels.push',
  publish: 'git:confirmModal.actionLabels.publish',
  revertLocalCommit: 'git:confirmModal.actionLabels.revertLocalCommit',
  deleteBranch: 'git:confirmModal.actionLabels.deleteBranch',
};

export default function ConfirmActionModal({ action, onCancel, onConfirm }: ConfirmActionModalProps) {
  const { t } = useTranslation();
  const titleId = action ? `confirmation-title-${action.type}` : undefined;

  useEffect(() => {
    if (!action) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [action, onCancel]);

  if (!action) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="p-6">
          <div className="mb-4 flex items-center">
            <div className={`mr-3 rounded-full p-2 ${CONFIRMATION_ICON_CONTAINER_CLASSES[action.type]}`}>
              {renderConfirmActionIcon(action.type)}
            </div>
            <h3 id={titleId} className="text-lg font-semibold text-foreground">
              {t(TITLE_KEYS[action.type] || 'git:confirmModal.titles.commit')}
            </h3>
          </div>

          <p className="mb-6 text-sm text-muted-foreground">{action.message}</p>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {t('git:confirmModal.cancel')}
            </button>
            <button
              onClick={onConfirm}
              className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm text-white transition-colors ${CONFIRMATION_BUTTON_CLASSES[action.type]}`}
            >
              {renderConfirmActionIcon(action.type)}
              <span>{t(ACTION_LABEL_KEYS[action.type] || 'git:confirmModal.actionLabels.commit')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
