import React from 'react';
import type { main } from '../../wailsjs/go/models';
import { AuthenticateWithToken } from '../../wailsjs/go/main/App';
import { useTranslations } from '../i18n';

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: main.GithubUserProfile) => void;
};

const LoginModal: React.FC<LoginModalProps> = ({ open, onClose, onSuccess }) => {
  const [token, setToken] = React.useState('');
  const [remember, setRemember] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<main.GithubUserProfile | null>(null);
  const [successMessage, setSuccessMessage] = React.useState('');

  const { t } = useTranslations();
  const labels = React.useMemo(
    () => ({
      title: t('loginModal.title'),
      tokenLabel: t('loginModal.tokenLabel'),
      tokenPlaceholder: t('loginModal.tokenPlaceholder'),
      remember: t('loginModal.remember'),
      submit: t('loginModal.submit'),
      submitting: t('loginModal.submitting'),
      close: t('loginModal.close'),
      hint: t('loginModal.hint'),
      success: t('loginModal.success'),
      emailFallback: t('loginModal.emailFallback'),
      missingUser: t('loginModal.missingUser'),
    }),
    [t]
  );

  React.useEffect(() => {
    if (!open) {
      setToken('');
      setRemember(false);
      setIsSubmitting(false);
      setError(null);
      setProfile(null);
      setSuccessMessage('');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage('');
    try {
      const response = await AuthenticateWithToken({ token, remember });
      if (!response.user) {
        throw new Error(labels.missingUser);
      }
      setProfile(response.user);
      setSuccessMessage(labels.success);
      onSuccess(response.user);
    } catch (err) {
      setProfile(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = profile?.name?.trim() || profile?.login || '';

  return (
    <div className="modal__backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-label={labels.title}>
        <div className="modal__header">
          <h2>{labels.title}</h2>
          <button
            type="button"
            className="modal__close"
            aria-label={labels.close}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <form className="modal__body" onSubmit={handleSubmit}>
          <label className="modal__field">
            <span>{labels.tokenLabel}</span>
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder={labels.tokenPlaceholder}
              autoComplete="off"
              spellCheck={false}
              autoFocus
              required
            />
          </label>
          <div className="modal__options">
            <label className="modal__remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              <span>{labels.remember}</span>
            </label>
            <p className="modal__hint">{labels.hint}</p>
          </div>
          {error && <div className="modal__status modal__status--error">{error}</div>}
          {profile && successMessage && (
            <div className="modal__profile">
              <div className="modal__status modal__status--success">{successMessage}</div>
              <div className="modal__profile-info">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={displayName}
                    className="modal__profile-avatar"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="modal__profile-avatar modal__profile-avatar--fallback">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="modal__profile-name">{displayName}</p>
                  <p className="modal__profile-login">@{profile.login}</p>
                  <p className="modal__profile-email">{profile.email || labels.emailFallback}</p>
                </div>
              </div>
            </div>
          )}
          <div className="modal__actions">
            <button type="button" className="modal__button modal__button--ghost" onClick={onClose}>
              {labels.close}
            </button>
            <button
              type="submit"
              className="modal__button modal__button--primary"
              disabled={isSubmitting || !token.trim()}
            >
              {isSubmitting ? labels.submitting : labels.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
