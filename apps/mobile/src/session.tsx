import type { AuthTokens, UserDto } from '@match-insight/contracts';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type SessionStatus = 'loading' | 'authenticated' | 'anonymous';
type RequestOptions = RequestInit & { retryAuth?: boolean };

interface LoginResult {
  user: UserDto;
  tokens: AuthTokens;
}
interface SessionContextValue {
  status: SessionStatus;
  user: UserDto | null;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  request<T>(path: string, options?: RequestOptions): Promise<T>;
}

const ACCESS_TOKEN_KEY = 'matchscope.accessToken';
const REFRESH_TOKEN_KEY = 'matchscope.refreshToken';
const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
const SessionContext = createContext<SessionContextValue | null>(null);

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const body = (await response.json()) as { message?: string } & T;
  if (!response.ok) throw new Error(body.message || '请求失败，请稍后重试');
  return body;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<UserDto | null>(null);
  const tokens = useRef<{ accessToken: string; refreshToken: string } | null>(null);

  const saveTokens = useCallback(
    async (value: { accessToken: string; refreshToken: string } | null) => {
      tokens.current = value;
      if (value) {
        await Promise.all([
          SecureStore.setItemAsync(ACCESS_TOKEN_KEY, value.accessToken),
          SecureStore.setItemAsync(REFRESH_TOKEN_KEY, value.refreshToken),
        ]);
      } else {
        await Promise.all([
          SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
          SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        ]);
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    if (!apiUrl || !tokens.current?.refreshToken) throw new Error('登录状态已失效');
    const response = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.current.refreshToken }),
    });
    const next = await parseResponse<AuthTokens>(response);
    await saveTokens({ accessToken: next.accessToken, refreshToken: next.refreshToken });
    return next.accessToken;
  }, [saveTokens]);

  const request = useCallback(
    async <T,>(path: string, options: RequestOptions = {}): Promise<T> => {
      if (!apiUrl) throw new Error('未配置 EXPO_PUBLIC_API_URL');
      const execute = (accessToken?: string) =>
        fetch(`${apiUrl}${path}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...options.headers,
          },
        });
      let response = await execute(tokens.current?.accessToken);
      if (response.status === 401 && options.retryAuth !== false && tokens.current?.refreshToken) {
        try {
          response = await execute(await refresh());
        } catch {
          await saveTokens(null);
          setUser(null);
          setStatus('anonymous');
          throw new Error('登录状态已失效，请重新登录');
        }
      }
      return parseResponse<T>(response);
    },
    [refresh, saveTokens],
  );

  useEffect(() => {
    void (async () => {
      const [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      ]);
      if (!accessToken || !refreshToken) {
        setStatus('anonymous');
        return;
      }
      tokens.current = { accessToken, refreshToken };
      try {
        setUser(await request<UserDto>('/auth/me'));
        setStatus('authenticated');
      } catch {
        await saveTokens(null);
        setStatus('anonymous');
      }
    })();
  }, [request, saveTokens]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!apiUrl) throw new Error('未配置 EXPO_PUBLIC_API_URL');
      const result = await parseResponse<LoginResult>(
        await fetch(`${apiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, deviceName: 'iPhone' }),
        }),
      );
      await saveTokens(result.tokens);
      setUser(result.user);
      setStatus('authenticated');
    },
    [saveTokens],
  );

  const logout = useCallback(async () => {
    try {
      await request<void>('/auth/logout', { method: 'POST', retryAuth: false });
    } catch {
      /* 本地退出仍需完成 */
    }
    await saveTokens(null);
    setUser(null);
    setStatus('anonymous');
  }, [request, saveTokens]);

  const value = useMemo(
    () => ({ status, user, login, logout, request }),
    [status, user, login, logout, request],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
