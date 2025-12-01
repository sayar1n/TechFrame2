'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser, registerUser, fetchCurrentUser } from '@/app/utils/api';
import { User, UserCreate, Token } from '@/app/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: UserCreate) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('access_token');
    router.push('/login');
  }, [router]);

  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        const storedToken = localStorage.getItem('access_token');

        if (storedToken) {
          setToken(storedToken);
          const fetchedUser = await fetchCurrentUser(storedToken);
          setUser(fetchedUser);
        }
      } catch (error) {
        console.error('Failed to load user from storage:', error);
        logout(); // Выходим, если токен недействителен или ошибка
      } finally {
        setIsLoading(false);
      }
    };
    loadUserFromStorage();
  }, [logout]);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const response: Token = await loginUser({ username, password });
      setToken(response.access_token);
      localStorage.setItem('access_token', response.access_token);

      const fetchedUser = await fetchCurrentUser(response.access_token);
      setUser(fetchedUser);
      router.push('/');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: UserCreate) => {
    setIsLoading(true);
    try {
      // На бэкенде роль принудительно устанавливается в "observer"
      await registerUser({ ...userData, role: "observer" });
      router.push('/login');
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
