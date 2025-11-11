import React from 'react';
import { useTranslations } from '../i18n';

export type RemoteRepoPayload = {
  name: string;
  description: string;
  isPrivate: boolean;
};

type RemoteRepoModalProps = {
  open: boolean;
  defaultName: string;
  defaultDescription?: string;
  defaultPrivate?: boolean;
  isSubmitting?: boolean;
  onSubmit: (payload: RemoteRepoPayload) => void;
  onClose: () => void;
};

const repoNamePattern = /^[a-zA-Z0-9._-]{1,100}$/;

const RemoteRepoModal: React.FC<RemoteRepoModalProps> = ({
  open,
  defaultName,
  defaultDescription = '',
  defaultPrivate = true,
  isSubmitting = false,
  onSubmit,
  onClose,
}) => {
  const { dictionary } = useTranslations();
  const labels = dictionary.remoteModal;

  const [name, setName] = React.useState(defaultName);
  const [description, setDescription] = React.useState(defaultDescription);
  const [isPrivate, setIsPrivate] = React.useState(defaultPrivate);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName(defaultName);
      setDescription(defaultDescription);
      setIsPrivate(defaultPrivate);
      setError(null);
    }
  }, [open, defaultName, defaultDescription, defaultPrivate]);

  if (!open) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(labels.nameRequired);
      return;
    }
    if (!repoNamePattern.test(trimmedName)) {
      setError(labels.nameInvalid);
      return;
    }
    setError(null);
    onSubmit({
      name: trimmedName,
      description: description.trim(),
      isPrivate,
    });
  };

  return (
    <div className="modal__backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-label={labels.title}>
        <div className="modal__header">
          <div>
            <h2>{labels.title}</h2>
            <p className="modal__hint">{labels.description}</p>
          </div>
          <button
            type="button"
            className="modal__close"
            aria-label={labels.cancel}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form className="modal__body" onSubmit={handleSubmit}>
          <label className="modal__field">
            <span>{labels.nameLabel}</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={labels.namePlaceholder}
              autoComplete="off"
              spellCheck={false}
              required
            />
            <small className="modal__hint">{labels.nameHelp}</small>
          </label>

          <div className="modal__field">
            <span>{labels.privacyLabel}</span>
            <div className="modal__options modal__options--inline">
              <label className="modal__remember">
                <input
                  type="radio"
                  name="remote-repo-privacy"
                  checked={!isPrivate}
                  onChange={() => setIsPrivate(false)}
                />
                <span>{labels.publicOption}</span>
              </label>
              <label className="modal__remember">
                <input
                  type="radio"
                  name="remote-repo-privacy"
                  checked={isPrivate}
                  onChange={() => setIsPrivate(true)}
                />
                <span>{labels.privateOption}</span>
              </label>
            </div>
          </div>

          <label className="modal__field">
            <span>{labels.repoDescriptionLabel}</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={labels.repoDescriptionPlaceholder}
              rows={3}
            />
          </label>

          {error && <div className="modal__status modal__status--error">{error}</div>}

          <div className="modal__actions">
            <button
              type="button"
              className="modal__button modal__button--ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {labels.cancel}
            </button>
            <button
              type="submit"
              className="modal__button modal__button--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? labels.confirming : labels.confirm}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RemoteRepoModal;
