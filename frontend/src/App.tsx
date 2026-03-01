import React from 'react';
import './App.css';
import ContributionCalendar, { OneDay } from './components/ContributionCalendar';
import GitInstallSidebar from './components/GitInstallSidebar';
import GitPathSettings from './components/GitPathSettings';
import LoginModal from './components/LoginModal';
import { TranslationProvider } from './i18n';
import type { main } from '../wailsjs/go/models';

function App() {
  const generateEmptyYearData = (year: number): OneDay[] => {
    const data: OneDay[] = [];
    const date = new Date(Date.UTC(year, 0, 1));

    while (date.getUTCFullYear() === year) {
      data.push({
        date: date.toISOString().slice(0, 10),
        count: 0,
        level: 0,
      });
      date.setUTCDate(date.getUTCDate() + 1);
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

  return (
    <TranslationProvider>
      <AppLayout contributions={generateMultiYearData()} />
    </TranslationProvider>
  );
}

type AppLayoutProps = {
  contributions: OneDay[];
};

const AppLayout: React.FC<AppLayoutProps> = ({ contributions }) => {
  const hasWailsApp = React.useCallback(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    const w = window as typeof window & { go?: { main?: { App?: unknown } } };
    return Boolean(w?.go?.main?.App);
  }, []);

  const [isGitInstalled, setIsGitInstalled] = React.useState<boolean | null>(null);
  const [isGitPathSettingsOpen, setIsGitPathSettingsOpen] = React.useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = React.useState(false);
  const [githubUser, setGithubUser] = React.useState<main.GithubUserProfile | null>(null);

  const checkGit = React.useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && !hasWailsApp()) {
        console.warn('CheckGitInstalled skipped: wails runtime not available (dev mode)');
        setIsGitInstalled(false);
        return;
      }

      const mod = await import('../wailsjs/go/main/App');
      if (!mod || typeof mod.CheckGitInstalled !== 'function') {
        throw new Error('CheckGitInstalled not available');
      }

      const response = await mod.CheckGitInstalled();
      setIsGitInstalled(response.installed);
    } catch (error) {
      console.error('Failed to check Git installation:', error);
      setIsGitInstalled(false);
    }
  }, [hasWailsApp]);

  React.useEffect(() => {
    checkGit();
  }, [checkGit]);

  React.useEffect(() => {
    (async () => {
      try {
        if (typeof window !== 'undefined' && !hasWailsApp()) {
          console.warn('GetGithubLoginStatus skipped: wails runtime not available (dev mode)');
          return;
        }

        const mod = await import('../wailsjs/go/main/App');
        if (!mod || typeof mod.GetGithubLoginStatus !== 'function') {
          throw new Error('GetGithubLoginStatus not available');
        }

        const status = await mod.GetGithubLoginStatus();
        if (status.authenticated && status.user) {
          setGithubUser(status.user);
        } else {
          setGithubUser(null);
        }
      } catch (error) {
        console.error('Failed to fetch GitHub login status:', error);
      }
    })();
  }, [hasWailsApp]);

  React.useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const { EventsOn } = await import('../wailsjs/runtime/runtime');
        if (typeof EventsOn === 'function') {
          unsubscribe = EventsOn('github:auth-changed', (status: main.GithubLoginStatus) => {
            if (status?.authenticated && status.user) {
              setGithubUser(status.user);
              return;
            }
            setGithubUser(null);
          });
        }
      } catch (error) {
        console.warn('EventsOn not available (dev mode)', error);
      }
    })();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleCheckAgain = React.useCallback(() => {
    checkGit();
  }, [checkGit]);

  const handleLogout = React.useCallback(async () => {
    try {
      const mod = await import('../wailsjs/go/main/App');
      if (typeof mod?.LogoutGithub === 'function') {
        await mod.LogoutGithub();
      }
      setGithubUser(null);
    } catch (error) {
      console.error('Failed to log out from GitHub:', error);
    }
  }, []);

  const handleAuthSuccess = React.useCallback((user: main.GithubUserProfile) => {
    setGithubUser(user);
  }, []);

  return (
    <div className="app-shell">
      <ContributionCalendar
        contributions={contributions}
        githubUser={githubUser}
        isGitInstalled={isGitInstalled}
        onOpenGitSettings={() => setIsGitPathSettingsOpen(true)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
      />

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
