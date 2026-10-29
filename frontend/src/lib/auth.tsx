import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { config } from '../config';
import { getRepo, getUser, type GitHubUser } from './github';

const STORAGE_KEY = 'record_blog_gh_token';

interface AuthState {
  token: string | null;
  user: GitHubUser | null;
  checking: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** 驗證 token：必須是站長帳號，而且對 repo 有寫入權限 */
async function verify(token: string): Promise<GitHubUser> {
  const user = await getUser(token);
  if (user.login.toLowerCase() !== config.adminUser.toLowerCase()) {
    throw new Error(`帳號 ${user.login} 不是這個部落格的站長（${config.adminUser}）`);
  }
  const repo = await getRepo(token);
  if (repo.permissions && !repo.permissions.push) {
    throw new Error(`這個 token 對 ${config.owner}/${config.repo} 沒有寫入權限`);
  }
  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = readStored();
    if (!stored) {
      setChecking(false);
      return;
    }
    verify(stored)
      .then((u) => {
        setToken(stored);
        setUser(u);
      })
      .catch(() => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
      })
      .finally(() => setChecking(false));
  }, []);

  const login = useCallback(async (t: string) => {
    const u = await verify(t.trim());
    setToken(t.trim());
    setUser(u);
    try {
      localStorage.setItem(STORAGE_KEY, t.trim());
    } catch {
      /* ignore */
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, checking, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
