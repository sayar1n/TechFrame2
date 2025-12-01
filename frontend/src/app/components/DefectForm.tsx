'use client';

import React, { useState, useEffect } from 'react';
import { DefectCreate, Defect, Project, User } from '@/app/types';
import styles from './DefectForm.module.scss';

interface DefectFormProps {
  initialData?: Defect; // Для режима редактирования
  onSubmit: (data: DefectCreate) => void;
  isLoading: boolean;
  error: string | null;
  projects: Project[]; // Список проектов для выбора
  users: User[]; // Список пользователей для выбора исполнителя
}

const DefectForm = ({ initialData, onSubmit, isLoading, error, projects, users }: DefectFormProps) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [priority, setPriority] = useState<Defect['priority']>(initialData?.priority || 'Средний');
  const [status, setStatus] = useState<Defect['status']>(initialData?.status || 'Новая');
  const [assigneeId, setAssigneeId] = useState<number | undefined>(initialData?.assignee_id || undefined);
  const [projectId, setProjectId] = useState<number | undefined>(initialData?.project_id || undefined);
  const [dueDate, setDueDate] = useState<string | undefined>(initialData?.due_date || undefined);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
      setPriority(initialData.priority);
      setStatus(initialData.status);
      setAssigneeId(initialData.assignee_id || undefined);
      setProjectId(initialData.project_id);
      setDueDate(initialData.due_date ? initialData.due_date.split('T')[0] : undefined);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId) {
      // Дополнительная проверка, если projectId обязателен
      alert('Пожалуйста, выберите проект.');
      return;
    }

    onSubmit({
      title,
      description: description || undefined,
      priority,
      status,
      assignee_id: assigneeId,
      project_id: projectId,
      due_date: dueDate || undefined,
    });
  };

  const availablePriorities: Defect['priority'][] = ['Низкий', 'Средний', 'Высокий', 'Критический'];
  const availableStatuses: Defect['status'][] = ['Новая', 'В работе', 'На проверке', 'Закрыта', 'Отменена'];

  return (
    <form onSubmit={handleSubmit} className={styles.defectForm}>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.formGroup}>
        <label htmlFor="title">Название дефекта:</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="description">Описание:</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
        ></textarea>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="priority">Приоритет:</label>
        <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value as Defect['priority'])}>
          {availablePriorities.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="status">Статус:</label>
        <select id="status" value={status} onChange={(e) => setStatus(e.target.value as Defect['status'])}>
          {availableStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="projectId">Проект:</label>
        <select
          id="projectId"
          value={projectId || ''}
          onChange={(e) => setProjectId(parseInt(e.target.value, 10))}
          required
        >
          <option value="">Выберите проект</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="assigneeId">Исполнитель:</label>
        <select
          id="assigneeId"
          value={assigneeId || ''}
          onChange={(e) => setAssigneeId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
        >
          <option value="">Не назначен</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
          ))}
        </select>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="dueDate">Срок выполнения:</label>
        <input
          type="date"
          id="dueDate"
          value={dueDate || ''}
          onChange={(e) => setDueDate(e.target.value || undefined)}
        />
      </div>

      <button type="submit" disabled={isLoading} className={styles.submitButton}>
        {isLoading ? 'Сохранение...' : (initialData ? 'Обновить дефект' : 'Создать дефект')}
      </button>
    </form>
  );
};

export default DefectForm;
