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
    <div className="login-modal__backdrop" role="presentation">
      <div className="login-modal" role="dialog" aria-modal="true" aria-label={labels.title}>
        <div className="login-modal__header">
          <h2>{labels.title}</h2>
          <button
            type="button"
            className="login-modal__close"
            aria-label={labels.close}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <form className="login-modal__body" onSubmit={handleSubmit}>
          <label className="login-modal__field">
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
          <div className="login-modal__options">
            <label className="login-modal__remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              <span>{labels.remember}</span>
            </label>
            <p className="login-modal__hint">{labels.hint}</p>
          </div>
          {error && <div className="login-modal__status login-modal__status--error">{error}</div>}
          {profile && successMessage && (
            <div className="login-modal__profile">
              <div className="login-modal__status login-modal__status--success">
                {successMessage}
              </div>
              <div className="login-modal__profile-info">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={displayName}
                    className="login-modal__profile-avatar"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="login-modal__profile-avatar login-modal__profile-avatar--fallback">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="login-modal__profile-name">{displayName}</p>
                  <p className="login-modal__profile-login">@{profile.login}</p>
                  <p className="login-modal__profile-email">
                    {profile.email || labels.emailFallback}
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="login-modal__actions">
            <button
              type="button"
              className="login-modal__button login-modal__button--ghost"
              onClick={onClose}
            >
              {labels.close}
            </button>
            <button
              type="submit"
              className="login-modal__button login-modal__button--primary"
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
