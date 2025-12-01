'use client';

import React, { useState, useEffect } from 'react';
import { ProjectCreate, Project } from '@/app/types';
import styles from './ProjectForm.module.scss';

interface ProjectFormProps {
  initialData?: Project; // Для режима редактирования
  onSubmit: (data: ProjectCreate) => void;
  isLoading: boolean;
  error: string | null;
}

const ProjectForm = ({ initialData, onSubmit, isLoading, error }: ProjectFormProps) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, description: description || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.projectForm}>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.formGroup}>
        <label htmlFor="title">Название проекта:</label>
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
      <button type="submit" disabled={isLoading} className={styles.submitButton}>
        {isLoading ? 'Сохранение...' : (initialData ? 'Обновить проект' : 'Создать проект')}
      </button>
    </form>
  );
};

export default ProjectForm;
