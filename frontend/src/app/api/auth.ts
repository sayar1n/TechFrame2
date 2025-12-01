import { UserLogin, UserCreate, Token, User } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface FetchOptions extends RequestInit {
  token?: string;
}

async function fetchApi<T>(url: string, options?: FetchOptions): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options?.token && { 'Authorization': `Bearer ${options.token}` }),
    ...(options?.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Что-то пошло не так');
  }

  return response.json();
}

export const loginUser = async (data: UserLogin): Promise<Token> => {
  const form_data = new URLSearchParams();
  form_data.append('username', data.username);
  form_data.append('password', data.password);

  const response = await fetch(`${API_BASE_URL}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form_data,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Ошибка входа');
  }
  return response.json();
};

export const registerUser = async (data: UserCreate): Promise<User> => {
  return fetchApi<User>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getMe = async (token: string): Promise<User> => {
  return fetchApi<User>('/auth/users/me', {
    method: 'GET',
    token: token,
  });
};
