'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DefectForm from '@/app/components/DefectForm';
import { fetchDefectById, updateDefect, fetchProjects, fetchUsers } from '@/app/utils/api';
import { useAuth } from '@/app/context/AuthContext';
import { Defect, DefectCreate, Project, User } from '@/app/types';
import styles from './EditDefectPage.module.scss'; // Предполагается, что файл стилей будет создан

const EditDefectPage = () => {
  const [defectId, setDefectId] = useState<number | null>(null);
  const { token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [defect, setDefect] = useState<Defect | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(false); // Изменяем имя стейта
  const [error, setError] = useState<string | null>(null);

  const params = useParams();
  useEffect(() => {
    const idFromParams = parseInt(String(params?.id), 10);
    if (!isNaN(idFromParams)) {
      setDefectId(idFromParams);
    }
  }, [params]);

  useEffect(() => {
    const fetchData = async () => {
      if (!token || authLoading || defectId === null || isNaN(defectId)) return;

      setLoadingData(true); // Устанавливаем загрузку данных
      try {
        const fetchedDefect = await fetchDefectById(token, defectId);
        setDefect(fetchedDefect);
        const fetchedProjects = await fetchProjects(token);
        setProjects(fetchedProjects);
        const fetchedUsers = await fetchUsers(token);
        setUsers(fetchedUsers);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить данные дефекта.');
      } finally {
        setLoadingData(false); // Снимаем загрузку данных
      }
    };

    fetchData();
  }, [token, authLoading, defectId]);

  const handleSubmit = async (defectData: DefectCreate) => {
    if (!token || defectId === null || isNaN(defectId)) {
      setError('Для обновления дефекта необходимо войти в систему или указать корректный ID.');
      return;
    }

    setLoadingData(true); // Устанавливаем загрузку данных
    setError(null);
    try {
      const payload: DefectCreate = {
        title: defectData.title,
        description: defectData.description,
        priority: defectData.priority,
        status: defectData.status,
        project_id: defectData.project_id,
        due_date: defectData.due_date,
        assignee_id: defectData.assignee_id,
      };
      await updateDefect(token, defectId, payload);
      router.push(`/defects/${defectId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить дефект.');
    } finally {
      setLoadingData(false); // Снимаем загрузку данных
    }
  };

  if (authLoading || loadingData || defectId === null || isNaN(defectId)) { // Используем loadingData
    return <div>Загрузка...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!defect) {
    return <div>Дефект не найден.</div>;
  }

  return (
    <div className={styles.editDefectContainer}>
      <h1>Редактировать дефект: {defect.title}</h1>
      <DefectForm
        initialData={defect}
        onSubmit={handleSubmit}
        isLoading={loadingData} 
        error={error}
        projects={projects}
        users={users}
      />
    </div>
  );
};

export default EditDefectPage;
