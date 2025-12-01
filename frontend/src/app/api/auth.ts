import { UserLogin, UserCreate, Token, User } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || '/v1'; // Версионирование API

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
  const responseData = await response.json();

  if (!response.ok) {
    // Обрабатываем ошибки в новом формате {success: false, error: {...}}
    if (responseData.error) {
      throw new Error(responseData.error.message || 'Что-то пошло не так');
    }
    throw new Error(responseData.detail || 'Что-то пошло не так');
  }

  // Если ответ в новом формате {success: true, data: {...}}, извлекаем data
  if (responseData.success === true && responseData.data) {
    return responseData.data;
  }

  return responseData;
}

export const loginUser = async (data: UserLogin): Promise<Token> => {
  const form_data = new URLSearchParams();
  form_data.append('username', data.username);
  form_data.append('password', data.password);

  const response = await fetch(`${API_BASE_URL}${API_VERSION}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form_data,
  });

  const responseData = await response.json();

  if (!response.ok) {
    // Обрабатываем ошибки в новом формате
    if (responseData.error) {
      throw new Error(responseData.error.message || 'Ошибка входа');
    }
    throw new Error(responseData.detail || 'Ошибка входа');
  }

  // Если ответ в новом формате {success: true, data: {...}}, извлекаем data
  if (responseData.success === true && responseData.data) {
    return responseData.data;
  }

  return responseData;
};

export const registerUser = async (data: UserCreate): Promise<User> => {
  return fetchApi<User>(`${API_VERSION}/auth/register`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getMe = async (token: string): Promise<User> => {
  return fetchApi<User>(`${API_VERSION}/auth/users/me`, {
    method: 'GET',
    token: token,
  });
};
