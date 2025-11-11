import React from 'react';
import './App.css';
import ContributionCalendar, { OneDay } from './components/ContributionCalendar';
import GitInstallSidebar from './components/GitInstallSidebar';
import GitPathSettings from './components/GitPathSettings';
import LoginModal from './components/LoginModal';
import { TranslationProvider, useTranslations, Language } from './i18n';
import { BrowserOpenURL, EventsOn } from '../wailsjs/runtime/runtime';
import type { main } from '../wailsjs/go/models';

function App() {
  const generateEmptyYearData = (year: number): OneDay[] => {
    const data: OneDay[] = [];
    const d = new Date(Date.UTC(year, 0, 1));

    while (d.getUTCFullYear() === year) {
      data.push({
        date: d.toISOString().slice(0, 10),
        count: 0,
        level: 0,
      });
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return data;
  };

  const generateMultiYearData = (): OneDay[] => {
    const data: OneDay[] = [];
    const currentYear = new Date().getFullYear();

    for (let year = 2008; year <= currentYear; year++) {
      data.push(...generateEmptyYearData(year));
    }
    return data;
  };

  const multiYearData: OneDay[] = generateMultiYearData();

  return (
    <TranslationProvider>
      <AppLayout contributions={multiYearData} />
    </TranslationProvider>
  );
}

type AppLayoutProps = {
  contributions: OneDay[];
};

const AppLayout: React.FC<AppLayoutProps> = ({ contributions }) => {
  const { language, setLanguage, t } = useTranslations();
  const [isGitInstalled, setIsGitInstalled] = React.useState<boolean | null>(null);
  const [isGitPathSettingsOpen, setIsGitPathSettingsOpen] = React.useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = React.useState(false);
  const [githubUser, setGithubUser] = React.useState<main.GithubUserProfile | null>(null);

  const checkGit = React.useCallback(async () => {
    try {
      const { CheckGitInstalled } = await import('../wailsjs/go/main/App');
      const response = await CheckGitInstalled();
      setIsGitInstalled(response.installed);
    } catch (error) {
      console.error('Failed to check Git installation:', error);
      setIsGitInstalled(false);
    }
  }, []);

  React.useEffect(() => {
    checkGit();
  }, [checkGit]);

  React.useEffect(() => {
    (async () => {
      try {
        const { GetGithubLoginStatus } = await import('../wailsjs/go/main/App');
        const status = await GetGithubLoginStatus();
        if (status.authenticated && status.user) {
          setGithubUser(status.user);
        } else {
          setGithubUser(null);
        }
      } catch (error) {
        console.error('Failed to fetch GitHub login status:', error);
      }
    })();
  }, []);

  React.useEffect(() => {
    const unsubscribe = EventsOn('github:auth-changed', (status: main.GithubLoginStatus) => {
      if (status && status.authenticated && status.user) {
        setGithubUser(status.user);
        return;
      }
      setGithubUser(null);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleCheckAgain = React.useCallback(() => {
    checkGit();
  }, [checkGit]);

  const languageOptions = React.useMemo(
    () => [
      { value: 'en' as Language, label: t('languageSwitcher.english') },
      { value: 'zh' as Language, label: t('languageSwitcher.chinese') },
    ],
    [t]
  );

  const loginLabel = language === 'zh' ? '登录' : 'Log in';
  const logoutLabel = language === 'zh' ? '退出' : 'Log out';
  const handleLogout = React.useCallback(async () => {
    try {
      const { LogoutGithub } = await import('../wailsjs/go/main/App');
      await LogoutGithub();
      setGithubUser(null);
    } catch (error) {
      console.error('Failed to log out from GitHub:', error);
    }
  }, []);
  const handleAuthSuccess = React.useCallback((user: main.GithubUserProfile) => {
    setGithubUser(user);
  }, []);
  const displayName = githubUser?.name?.trim() || githubUser?.login || '';

  const openRepository = React.useCallback(() => {
    BrowserOpenURL('https://github.com/zmrlft/GreenWall');
  }, []);

  return (
    <div className="app-shell">
      <div className="app-shell__surface">
        <header className="app-shell__topbar">
          <div className="app-shell__identity">
            {githubUser ? (
              <>
                <button
                  type="button"
                  className="app-shell__user"
                  onClick={() => setIsLoginModalOpen(true)}
                >
                  {githubUser.avatarUrl ? (
                    <img
                      src={githubUser.avatarUrl}
                      alt={displayName}
                      className="app-shell__avatar"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="app-shell__avatar app-shell__avatar--fallback">
                      {displayName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="app-shell__user-name">{displayName}</span>
                </button>
                <button type="button" className="app-shell__logout" onClick={handleLogout}>
                  {logoutLabel}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="app-shell__login"
                onClick={() => setIsLoginModalOpen(true)}
              >
                {loginLabel}
              </button>
            )}
          </div>
          <div className="app-shell__actions">
            <button
              type="button"
              onClick={() => setIsGitPathSettingsOpen(true)}
              className="app-shell__action"
            >
              {t('gitPathSettings.title')}
            </button>
            <div className="app-shell__language" role="group" aria-label={t('labels.language')}>
              {languageOptions.map((option) => {
                const isActive = language === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setLanguage(option.value)}
                    className={`app-shell__language-btn ${isActive ? 'is-active' : ''}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={openRepository}
              aria-label="Open GreenWall repository on GitHub"
              className="app-shell__icon-button"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.257.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.776.42-1.305.763-1.605-2.665-.303-5.466-1.335-5.466-5.935 0-1.312.47-2.382 1.236-3.22-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23A11.5 11.5 0 0 1 12 5.8a11.5 11.5 0 0 1 3.003.404c2.292-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.838 1.236 1.908 1.236 3.22 0 4.61-2.804 5.628-5.475 5.923.431.372.816 1.103.816 2.222 0 1.605-.014 2.897-.014 3.293 0 .322.218.694.825.576C20.565 21.796 24 17.297 24 12 24 5.37 18.63 0 12 0Z"
                />
              </svg>
            </button>
          </div>
        </header>

        <ContributionCalendar contributions={contributions} githubUser={githubUser} />
      </div>

      {isGitInstalled === false && <GitInstallSidebar onCheckAgain={handleCheckAgain} />}

      {isGitPathSettingsOpen && (
        <GitPathSettings
          onClose={() => setIsGitPathSettingsOpen(false)}
          onCheckAgain={handleCheckAgain}
        />
      )}
      {isLoginModalOpen && (
        <LoginModal
          open={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
};

export default App;
