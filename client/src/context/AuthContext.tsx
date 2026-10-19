import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, apiErrorStatus, authApi } from '../services/api';
import type { User } from '../types/api';

type Credentials = { email: string; password: string };
type Signup = Credentials & { username: string; displayName: string };
type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  authCheckError: string | null;
  authCheckStatus: number | undefined;
  retryAuthCheck: () => Promise<void>;
  login: (values: Credentials) => Promise<User>;
  register: (values: Signup) => Promise<{ user: User; signupBonus: number }>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const userQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    retry: (failureCount, error) => failureCount < 2 && apiErrorStatus(error) !== 401 && apiErrorStatus(error) !== 403,
    retryDelay: 500,
    staleTime: 60_000,
  });
  const loginMutation = useMutation({ mutationFn: authApi.login, onSuccess: (user) => queryClient.setQueryData(['auth', 'me'], user) });
  const registerMutation = useMutation({ mutationFn: authApi.register, onSuccess: ({ user }) => queryClient.setQueryData(['auth', 'me'], user) });
  const logoutMutation = useMutation({ mutationFn: authApi.logout, onSettled: () => queryClient.setQueryData(['auth', 'me'], null) });

  useEffect(() => {
    const expire = () => queryClient.setQueryData(['auth', 'me'], null);
    window.addEventListener('quizsphere:session-expired', expire);
    return () => window.removeEventListener('quizsphere:session-expired', expire);
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => ({
    user: userQuery.data ?? null,
    isLoading: userQuery.isLoading,
    authCheckError: userQuery.isError && !userQuery.data ? apiErrorMessage(userQuery.error) : null,
    authCheckStatus: userQuery.isError ? apiErrorStatus(userQuery.error) : undefined,
    retryAuthCheck: async () => { await userQuery.refetch(); },
    login: (values) => loginMutation.mutateAsync(values),
    register: (values) => registerMutation.mutateAsync(values),
    logout: async () => { await logoutMutation.mutateAsync(); },
  }), [userQuery.data, userQuery.isLoading, userQuery.isError, userQuery.error, userQuery.refetch, loginMutation, registerMutation, logoutMutation]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
