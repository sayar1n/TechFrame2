export interface User {
  id: number;
  username: string;
  email: string;
  role: "manager" | "engineer" | "observer" | "admin";
  is_active: boolean;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
  role: "manager" | "engineer" | "observer" | "admin";
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface Project {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
  owner_id: number;
}

export interface ProjectCreate {
  title: string;
  description?: string;
}

export interface Defect {
  id: number;
  title: string;
  description: string | null;
  priority: "Низкий" | "Средний" | "Высокий" | "Критический";
  status: "Новая" | "В работе" | "На проверке" | "Закрыта" | "Отменена";
  created_at: string;
  updated_at: string | null;
  due_date: string | null;
  reporter_id: number;
  assignee_id: number | null;
  project_id: number;
}

export interface DefectCreate {
  title: string;
  description?: string;
  priority?: "Низкий" | "Средний" | "Высокий" | "Критический";
  status?: "Новая" | "В работе" | "На проверке" | "Закрыта" | "Отменена";
  due_date?: string;
  project_id: number;
  assignee_id?: number;
}

export interface Comment {
  id: number;
  content: string;
  created_at: string;
  author_id: number;
  defect_id: number;
}

export interface CommentCreate {
  content: string;
  defect_id: number;
}

export interface Attachment {
  id: number;
  filename: string;
  file_path: string;
  uploaded_at: string;
  uploader_id: number;
  defect_id: number;
}

export interface AttachmentCreate {
  filename: string;
  file_path: string;
  defect_id: number;
}

// Analytical Interfaces
export interface AnalyticsSummary {
  total_defects: number;
  overdue_defects: number;
  completion_percentage: number;
  active_projects: number;
}

export interface DefectCountByStatus {
  status: string;
  count: number;
}

export interface DefectCountByPriority {
  priority: string;
  count: number;
}

export interface DefectCreationTrendItem {
  date: string; // ISO string for date
  count: number;
}

export interface ProjectPerformanceItem {
  project_id: number;
  project_title: string;
  completed_defects: number;
  total_defects: number;
  completion_percentage: number;
}
