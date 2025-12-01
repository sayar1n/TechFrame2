import axios from 'axios';
import { UserCreate, UserLogin, User, Token, Project, ProjectCreate, Defect, DefectCreate, Comment, CommentCreate, Attachment, AnalyticsSummary, DefectCountByStatus, DefectCountByPriority, DefectCreationTrendItem, ProjectPerformanceItem } from '@/app/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || '/v1'; // Версионирование API

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const loginUser = async (userData: UserLogin): Promise<Token> => {
  const response = await apiClient.post(
    `${API_VERSION}/auth/token`,
    new URLSearchParams({
      username: userData.username,
      password: userData.password,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  return response.data;
};

export const registerUser = async (userData: UserCreate): Promise<User> => {
  const response = await apiClient.post(`${API_VERSION}/auth/register`, userData);
  return response.data;
};

export const fetchCurrentUser = async (token: string): Promise<User> => {
  const response = await apiClient.get(`${API_VERSION}/auth/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const createProject = async (token: string, userId: number, projectData: ProjectCreate): Promise<Project> => {
  const response = await apiClient.post(`${API_VERSION}/projects/`, projectData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const updateProject = async (token: string, projectId: number, projectData: ProjectCreate): Promise<Project> => {
  const response = await apiClient.put(`${API_VERSION}/projects/${projectId}`, projectData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const deleteProject = async (token: string, projectId: number): Promise<void> => {
  await apiClient.delete(`${API_VERSION}/projects/${projectId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const fetchProjectById = async (token: string, projectId: number): Promise<Project> => {
  const response = await apiClient.get(`${API_VERSION}/projects/${projectId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const fetchDefectById = async (token: string, defectId: number): Promise<Defect> => {
  const response = await apiClient.get(`${API_VERSION}/defects/${defectId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const fetchProjects = async (token: string): Promise<Project[]> => {
  const response = await apiClient.get(`${API_VERSION}/projects/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const fetchDefects = async (token: string): Promise<Defect[]> => {
  const response = await apiClient.get(`${API_VERSION}/defects/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const createDefect = async (token: string, defectData: DefectCreate): Promise<Defect> => {
  const response = await apiClient.post(`${API_VERSION}/defects/`, defectData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const updateDefect = async (token: string, defectId: number, defectData: Omit<DefectCreate, 'project_id'>): Promise<Defect> => {
  const response = await apiClient.put(`${API_VERSION}/defects/${defectId}`, defectData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const deleteDefect = async (token: string, defectId: number): Promise<void> => {
  await apiClient.delete(`${API_VERSION}/defects/${defectId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const fetchCommentsForDefect = async (token: string, defectId: number): Promise<Comment[]> => {
  const response = await apiClient.get(`${API_VERSION}/defects/${defectId}/comments/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const createComment = async (token: string, defectId: number, commentData: CommentCreate): Promise<Comment> => {
  const response = await apiClient.post(`${API_VERSION}/defects/${defectId}/comments/`, commentData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const fetchAttachmentsForDefect = async (token: string, defectId: number): Promise<Attachment[]> => {
  const response = await apiClient.get(`${API_VERSION}/defects/${defectId}/attachments/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const uploadAttachment = async (token: string, defectId: number, file: File): Promise<Attachment> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post(`${API_VERSION}/defects/${defectId}/attachments/`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteAttachment = async (token: string, defectId: number, attachmentId: number): Promise<void> => {
  await apiClient.delete(`${API_VERSION}/defects/${defectId}/attachments/${attachmentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const fetchUsers = async (token: string): Promise<User[]> => {
  const response = await apiClient.get(`${API_VERSION}/auth/users`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const updateUserRole = async (token: string, userId: number, newRole: "manager" | "engineer" | "observer"): Promise<User> => {
  const response = await apiClient.put(
    `${API_VERSION}/auth/users/${userId}/role?new_role=${newRole}`,
    undefined,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const exportDefectsToCsvExcel = async (
  token: string,
  format: "csv" | "xlsx",
  filters?: Record<string, string | number | boolean | null | undefined>
): Promise<Blob> => {
  const response = await apiClient.get(`${API_VERSION}/reports/defects/export`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: { format, ...filters },
    responseType: 'blob', // Важно для получения бинарных данных файла
  });
  return response.data;
};

// Analytics API functions
export const fetchAnalyticsSummary = async (token: string, startDate?: string, endDate?: string): Promise<AnalyticsSummary> => {
  const params = { start_date: startDate, end_date: endDate };
  const response = await apiClient.get(`${API_VERSION}/reports/analytics/summary`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: params,
  });
  return response.data;
};

export const fetchStatusDistribution = async (token: string, startDate?: string, endDate?: string): Promise<DefectCountByStatus[]> => {
  const params = { start_date: startDate, end_date: endDate };
  const response = await apiClient.get(`${API_VERSION}/reports/analytics/status-distribution`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: params,
  });
  return response.data;
};

export const fetchPriorityDistribution = async (token: string, startDate?: string, endDate?: string): Promise<DefectCountByPriority[]> => {
  const params = { start_date: startDate, end_date: endDate };
  const response = await apiClient.get(`${API_VERSION}/reports/analytics/priority-distribution`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: params,
  });
  return response.data;
};

export const fetchCreationTrend = async (token: string, days: number = 30): Promise<DefectCreationTrendItem[]> => {
  const params = { days: days };
  const response = await apiClient.get(`${API_VERSION}/reports/analytics/creation-trend`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: params,
  });
  return response.data;
};

export const fetchProjectPerformance = async (token: string, startDate?: string, endDate?: string): Promise<ProjectPerformanceItem[]> => {
  const params = { start_date: startDate, end_date: endDate };
  const response = await apiClient.get(`${API_VERSION}/reports/analytics/project-performance`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: params,
  });
  return response.data;
};

// Добавляем интерцептор для автоматического добавления токена к запросам
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерцептор для обработки единого формата ответов {success, data, error}
apiClient.interceptors.response.use(
  (response) => {
    // Если ответ в новом формате {success: true, data: {...}}, извлекаем data
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      if (response.data.success === true && 'data' in response.data) {
        response.data = response.data.data; // Извлекаем данные из обёртки
      } else if (response.data.success === false && 'error' in response.data) {
        // Преобразуем ошибку в формат, который ожидает frontend
        const error = response.data.error;
        throw new Error(error.message || 'Unknown error');
      }
    }
    return response;
  },
  (error) => {
    if (error.response) {
      // Обрабатываем ошибки в новом формате
      if (error.response.data && error.response.data.error) {
        const apiError = error.response.data.error;
        console.error('API Error:', apiError.code, '-', apiError.message);
        error.message = apiError.message;
      } else {
        console.error('API Error Response Data:', JSON.stringify(error.response.data, null, 2));
        console.error('API Error Status:', error.response.status);
      }
    } else if (error.request) {
      console.error('API Error Request:', error.request);
    } else {
      console.error('Error Message:', error.message);
    }
    return Promise.reject(error);
  }
);
