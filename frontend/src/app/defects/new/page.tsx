'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DefectForm from '@/app/components/DefectForm';
import { createDefect, fetchProjects, fetchUsers } from '@/app/utils/api';
import { useAuth } from '@/app/context/AuthContext';
import { Project, User, DefectCreate } from '@/app/types';
import styles from './CreateDefectPage.module.scss'; // Предполагается, что файл стилей будет создан

const CreateDefectPage = () => {
  const { token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!token || authLoading) return;

      try {
        const fetchedProjects = await fetchProjects(token);
        setProjects(fetchedProjects);
        const fetchedUsers = await fetchUsers(token);
        setUsers(fetchedUsers);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить данные для формы дефекта.');
      }
    };

    fetchData();
  }, [token, authLoading]);

  const handleSubmit = async (defectData: DefectCreate) => {
    if (!token) {
      setError('Для создания дефекта необходимо войти в систему.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await createDefect(token, defectData);
      router.push('/defects');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось создать дефект.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className={styles.createDefectContainer}>
      <h1>Создать новый дефект</h1>
      {error && <p className={styles.error}>{error}</p>}
      <DefectForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={error}
        projects={projects}
        users={users}
      />
    </div>
  );
};

export default CreateDefectPage;
