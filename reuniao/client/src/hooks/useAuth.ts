import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi, setAuthToken, getAuthToken } from "@/lib/api";
import { useLocation } from "wouter";
import { useEffect } from "react";

type User = {
  id: string;
  username: string;
  nome?: string;
  email?: string;
  role?: string;
};

type Tenant = {
  id: string;
  nome: string;
  slug: string;
};

type AuthData = {
  user: User;
  tenant: Tenant | null;
};

export function useAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data, isLoading, error, refetch } = useQuery<AuthData | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const token = getAuthToken();
      
      if (!token) {
        try {
          const autoLoginResponse = await authApi.autoLogin();
          setAuthToken(autoLoginResponse.data.token);
          return {
            user: autoLoginResponse.data.user,
            tenant: autoLoginResponse.data.tenant,
          };
        } catch (err) {
          console.error("Auto login failed:", err);
          return null;
        }
      }
      
      try {
        const response = await authApi.me();
        return response.data;
      } catch (err: any) {
        if (err.response?.status === 401) {
          setAuthToken(null);
          try {
            const autoLoginResponse = await authApi.autoLogin();
            setAuthToken(autoLoginResponse.data.token);
            return {
              user: autoLoginResponse.data.user,
              tenant: autoLoginResponse.data.tenant,
            };
          } catch (autoErr) {
            return null;
          }
        }
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await authApi.login(email, password);
      return response.data;
    },
    onSuccess: (data) => {
      setAuthToken(data.token);
      queryClient.setQueryData(["/api/auth/me"], { user: data.user, tenant: data.tenant });
      setLocation("/dashboard");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await authApi.logout();
    },
    onSuccess: () => {
      setAuthToken(null);
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
      setLocation("/dashboard");
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await authApi.register(data);
      return response.data;
    },
    onSuccess: (data) => {
      setAuthToken(data.token);
      queryClient.setQueryData(["/api/auth/me"], { user: data.user, tenant: data.tenant });
      setLocation("/dashboard");
    },
  });

  return {
    user: data?.user || null,
    tenant: data?.tenant || null,
    isAuthenticated: !!data?.user,
    isLoading,
    error,
    login: (email: string, password: string) => loginMutation.mutateAsync({ email, password }),
    logout: () => logoutMutation.mutateAsync(),
    register: (data: any) => registerMutation.mutateAsync(data),
    loginError: loginMutation.error,
    isLoginLoading: loginMutation.isPending,
    refetch,
  };
}
