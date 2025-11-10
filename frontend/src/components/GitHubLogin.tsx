import React from 'react';
import { StartOAuthWithAutoCallback, CancelOAuth } from '../../wailsjs/go/main/OAuthService';
import { loadAuthState, clearAuthState, saveAuthState, GitHubUser } from '../utils/auth';
import { useTranslations } from '../i18n';

interface GitHubLoginProps {
  onLoginSuccess?: (user: GitHubUser) => void;
  onLogout?: () => void;
}

export const GitHubLogin: React.FC<GitHubLoginProps> = ({ onLoginSuccess, onLogout }) => {
  const { t } = useTranslations();
  const [user, setUser] = React.useState<GitHubUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string>('');
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // 加载已保存的用户信息
  React.useEffect(() => {
    const authState = loadAuthState();
    if (authState) {
      setUser(authState.user);
      onLoginSuccess?.(authState.user);
    }
  }, [onLoginSuccess]);

  // 开始 OAuth 登录流程 - 自动处理回调
  const handleLogin = async () => {
    setIsLoading(true);
    setError('');

    // 创建 AbortController 用于取消
    abortControllerRef.current = new AbortController();

    try {
      console.log('[OAuth] Starting OAuth flow...');
      
      // 调用后端自动处理 OAuth 流程
      const response = await StartOAuthWithAutoCallback({
        clientId: '',
        redirectUrl: '',
        scopes: [],
      });

      // 检查是否已取消
      if (abortControllerRef.current?.signal.aborted) {
        console.log('[OAuth] Login cancelled by user');
        return;
      }

      console.log('[OAuth] Received response:', response);

      if (response.user) {
        // 保存用户信息
        saveAuthState({
          accessToken: response.accessToken,
          user: response.user,
        });

        setUser(response.user);
        setError('');
        onLoginSuccess?.(response.user);
        console.log('[OAuth] Login successful:', response.user.login);
      } else {
        throw new Error('未能获取用户信息');
      }
    } catch (err) {
      // 检查是否是用户取消
      if (abortControllerRef.current?.signal.aborted) {
        console.log('[OAuth] Login cancelled');
        setError(t('oauth.loginCancelled'));
        return;
      }
      
      console.error('[OAuth] Login failed:', err);
      setError(err instanceof Error ? err.message : t('oauth.loginFailed'));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // 取消登录
  const handleCancelLogin = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      
      // 调用后端取消方法,停止回调服务器
      try {
        await CancelOAuth();
        console.log('[OAuth] Backend callback server stopped');
      } catch (err) {
        console.error('[OAuth] Failed to cancel on backend:', err);
      }
      
      setIsLoading(false);
      setError(t('oauth.loginCancelled'));
      console.log('[OAuth] User cancelled login');
    }
  };

  // 登出
  const handleLogout = () => {
    clearAuthState();
    setUser(null);
    onLogout?.();
  };

  // 如果已登录,显示用户信息
  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-none border border-black bg-white px-3 py-2">
          <img
            src={user.avatar_url}
            alt={user.login}
            className="h-6 w-6 rounded-full"
          />
          <span className="text-sm font-medium text-black">{user.login}</span>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-none border border-black bg-white px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-100"
        >
          {t('oauth.logout')}
        </button>
      </div>
    );
  }

  // 未登录,显示登录按钮
  return (
    <>
      <div className="flex flex-col items-start gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-none border border-black bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-100 disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.257.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.776.42-1.305.763-1.605-2.665-.303-5.466-1.335-5.466-5.935 0-1.312.47-2.382 1.236-3.22-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23A11.5 11.5 0 0 1 12 5.8a11.5 11.5 0 0 1 3.003.404c2.292-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.838 1.236 1.908 1.236 3.22 0 4.61-2.804 5.628-5.475 5.923.431.372.816 1.103.816 2.222 0 1.605-.014 2.897-.014 3.293 0 .322.218.694.825.576C20.565 21.796 24 17.297 24 12 24 5.37 18.63 0 12 0Z" />
            </svg>
            {isLoading ? t('oauth.loggingIn') : t('oauth.loginButton')}
          </button>
          
          {isLoading && (
            <button
              onClick={handleCancelLogin}
              className="rounded-none border border-red-600 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              {t('oauth.cancel')}
            </button>
          )}
        </div>
        
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
      </div>
    </>
  );
};
