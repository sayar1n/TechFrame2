'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProjectForm from '../../components/ProjectForm';
import { createProject } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import styles from './CreateProjectPage.module.scss'; // Предполагается, что файл стилей будет создан

const CreateProjectPage = () => {
  const { token, isLoading: authLoading, user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (projectData: { title: string; description?: string }) => {
    if (!token || !user) {
      setError('Для создания проекта необходимо войти в систему и иметь данные пользователя.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await createProject(token, user.id, projectData);
      router.push('/projects');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось создать проект.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.createProjectContainer}>
      <h1>Создать новый проект</h1>
      <ProjectForm
        onSubmit={handleSubmit}
        isLoading={isLoading || authLoading}
        error={error}
      />
    </div>
  );
};

export default CreateProjectPage;
