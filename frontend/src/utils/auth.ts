// GitHub 用户信息存储
import { main } from '../../wailsjs/go/models';

const STORAGE_KEYS = {
  accessToken: 'github-oauth.accessToken',
  user: 'github-oauth.user',
} as const;

export type GitHubUser = main.GitHubUser;

export interface AuthState {
  accessToken: string;
  user: GitHubUser;
}

/**
 * 保存用户认证信息到 localStorage
 */
export function saveAuthState(state: AuthState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.accessToken, state.accessToken);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(state.user));
  } catch (error) {
    console.error('Failed to save auth state:', error);
  }
}

/**
 * 从 localStorage 读取用户认证信息
 */
export function loadAuthState(): AuthState | null {
  try {
    const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
    const userStr = localStorage.getItem(STORAGE_KEYS.user);

    if (!accessToken || !userStr) {
      return null;
    }

    const user = JSON.parse(userStr) as GitHubUser;
    return { accessToken, user };
  } catch (error) {
    console.error('Failed to load auth state:', error);
    return null;
  }
}

/**
 * 清除用户认证信息
 */
export function clearAuthState(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.user);
  } catch (error) {
    console.error('Failed to clear auth state:', error);
  }
}

/**
 * 检查用户是否已登录
 */
export function isAuthenticated(): boolean {
  return loadAuthState() !== null;
}
