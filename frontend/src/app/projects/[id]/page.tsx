'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Project } from '@/app/types';
import { fetchProjectById, deleteProject } from '@/app/utils/api';
import { useAuth } from '@/app/context/AuthContext';
import styles from './ProjectDetailsPage.module.scss';

const ProjectDetailsPage = () => {
  const params = useParams();
  const projectId = parseInt(String(params?.id), 10);
  const { token, isLoading, user } = useAuth();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getProjectDetails = async () => {
      if (!token || isLoading || isNaN(projectId)) return;

      try {
        const fetchedProject = await fetchProjectById(token, projectId);
        setProject(fetchedProject);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить детали проекта.');
      }
    };

    getProjectDetails();
  }, [token, isLoading, projectId]);

  const handleEditClick = () => {
    router.push(`/projects/${projectId}/edit`);
  };

  const handleDeleteClick = async () => {
    if (!confirm('Вы уверены, что хотите удалить этот проект?')) return;
    if (!token) {
      setError('Для удаления проекта необходимо войти в систему.');
      return;
    }
    try {
      await deleteProject(token!, projectId);
      router.push('/projects');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить проект.');
    }
  };

  if (isLoading || isNaN(projectId)) {
    return <div>Загрузка проекта...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!project) {
    return <div>Проект не найден.</div>;
  }

  const canEditOrDelete = user && (user.role === 'admin' || (user.role === 'engineer' && user.id === project.owner_id));

  return (
    <div className={styles.projectDetailsContainer}>
      <h1>{project.title}</h1>
      <p><strong>ID:</strong> {project.id}</p>
      <p><strong>Описание:</strong> {project.description || 'Нет описания'}</p>
      <p><strong>Владелец:</strong> {project.owner_id}</p>
      <p><strong>Дата создания:</strong> {new Date(project.created_at).toLocaleDateString()}</p>

      <div className={styles.actions}>
        {canEditOrDelete && (
          <button onClick={handleEditClick} className={styles.editButton}>
            Редактировать
          </button>
        )}
        {canEditOrDelete && (
          <button onClick={handleDeleteClick} className={styles.deleteButton}>
            Удалить
          </button>
        )}
      </div>

      <h2>Связанные дефекты</h2>
      <p>Здесь будет список связанных дефектов.</p>
    </div>
  );
};

export default ProjectDetailsPage;
