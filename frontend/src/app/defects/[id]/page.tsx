'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Defect, Project, User } from '@/app/types';
import { fetchDefectById, deleteDefect, updateDefect, fetchProjects, fetchUsers } from '@/app/utils/api';
import { useAuth } from '@/app/context/AuthContext';
import CommentSection from '@/app/components/CommentSection'; // Импортируем CommentSection
import styles from './DefectDetailsPage.module.scss';
import Link from 'next/link'; // Импортируем Link
import AttachmentSection from '@/app/components/AttachmentSection'; // Импортируем AttachmentSection

const DefectDetailsPage = () => {
  const params = useParams();
  const defectId = parseInt(String(params?.id), 10);
  const { token, isLoading: authLoading, user } = useAuth();
  const router = useRouter();
  const [defect, setDefect] = useState<Defect | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableStatuses: Defect['status'][] = ['Новая', 'В работе', 'На проверке', 'Закрыта', 'Отменена'];

  useEffect(() => {
    const fetchData = async () => {
      if (!token || authLoading || isNaN(defectId)) return;

      try {
        const fetchedDefect = await fetchDefectById(token, defectId);
        setDefect(fetchedDefect);

        const fetchedProjects = await fetchProjects(token);
        setProjects(fetchedProjects);

        const fetchedUsers = await fetchUsers(token);
        setUsers(fetchedUsers);

      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить детали дефекта.');
      }
    };

    fetchData();
  }, [token, authLoading, defectId]);

  const handleEditClick = () => {
    router.push(`/defects/${defectId}/edit`);
  };

  const handleDeleteClick = async () => {
    if (!confirm('Вы уверены, что хотите удалить этот дефект?')) return;
    setIsLoading(true);
    setError(null);
    try {
      await deleteDefect(token!, defectId);
      router.push('/defects');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить дефект.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!defect || !token) return;

    const newStatus = e.target.value as Defect['status'];

    setIsLoading(true);
    setError(null);
    try {
      const updatedDefect = await updateDefect(token!, defectId, {
        title: defect.title,
        description: defect.description ?? undefined,
        priority: defect.priority,
        status: newStatus,
        project_id: defect.project_id,
        due_date: defect.due_date ?? undefined,
        assignee_id: defect.assignee_id ?? undefined,
      });
      setDefect(updatedDefect);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить статус дефекта.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading || isNaN(defectId)) {
    return <div>Загрузка дефекта...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!defect) {
    return <div>Дефект не найден.</div>;
  }

  const canEdit = user && (
    user.role === 'admin' ||
    user.role === 'manager' ||
    (user.role === 'engineer' && (user.id === defect.reporter_id || user.id === defect.assignee_id))
  );
  const canDelete = user && (
    user.role === 'admin' ||
    user.role === 'manager' ||
    (user.role === 'engineer' && user.id === defect.reporter_id)
  );

  const assignedProject = projects.find(p => p.id === defect.project_id);
  const assignedAssignee = users.find(u => u.id === defect.assignee_id);
  const assignedReporter = users.find(u => u.id === defect.reporter_id);

  return (
    <div className={styles.defectDetailsContainer}>
      <h1>{defect.title}</h1>
      <p><strong>ID:</strong> {defect.id}</p>
      <p><strong>Описание:</strong> {defect.description || 'Нет описания'}</p>
      <p>
        <strong>Статус:</strong>
        {canEdit ? (
          <select
            value={defect.status}
            onChange={handleStatusChange}
            className={styles.statusSelect}
            disabled={isLoading}
          >
            {availableStatuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        ) : (
          <span> {defect.status}</span>
        )}
      </p>
      <p><strong>Приоритет:</strong> {defect.priority}</p>
      <p><strong>Дата создания:</strong> {new Date(defect.created_at).toLocaleDateString()}</p>
      <p><strong>Последнее обновление:</strong> {defect.updated_at ? new Date(defect.updated_at).toLocaleDateString() : 'Нет данных'}</p>
      <p><strong>Срок выполнения:</strong> {defect.due_date ? new Date(defect.due_date).toLocaleDateString() : 'Не установлен'}</p>
      <p><strong>Репортер:</strong> {assignedReporter?.username || 'Неизвестен'}</p>
      <p><strong>Исполнитель:</strong> {assignedAssignee?.username || 'Не назначен'}</p>
      <p><strong>Проект:</strong> {assignedProject ? <Link href={`/projects/${assignedProject.id}`}>{assignedProject.title}</Link> : 'Неизвестен'}</p>

      <div className={styles.actions}>
        {canEdit && (
          <button onClick={handleEditClick} className={styles.editButton}>
            Редактировать
          </button>
        )}
        {canDelete && (
          <button onClick={handleDeleteClick} className={styles.deleteButton}>
            Удалить
          </button>
        )}
      </div>

      <CommentSection defectId={defect.id} users={users} />

      {/* Заменяем заглушку на компонент AttachmentSection */}
      <AttachmentSection defectId={defect.id} />
    </div>
  );
};

export default DefectDetailsPage;
