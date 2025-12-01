'use client';

import React, { useEffect, useState, useMemo } from 'react';
// import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Импортируем useRouter
import { Defect } from '@/app/types';
import { fetchDefects, deleteDefect } from '@/app/utils/api'; // Импортируем deleteDefect
import { useAuth } from '@/app/context/AuthContext';
import styles from './DefectsPage.module.scss';

const DefectsPage = () => {
  const { token, isLoading, user } = useAuth(); // Получаем user из useAuth
  const [defects, setDefects] = useState<Defect[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('Все');
  const [filterPriority, setFilterPriority] = useState<string>('Все');
  const [sortBy, setSortBy] = useState<keyof Defect>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const router = useRouter(); // Инициализируем useRouter

  useEffect(() => {
    const getDefects = async () => {
      if (!token || isLoading) return;

      try {
        const fetchedDefects = await fetchDefects(token);
        setDefects(fetchedDefects);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить дефекты.');
      }
    };

    getDefects();
  }, [token, isLoading]);

  const handleCreateDefectClick = () => {
    router.push('/defects/new');
  };

  const handleEditDefect = (defectId: number) => {
    router.push(`/defects/${defectId}`);
  };

  const handleDeleteDefect = async (defectId: number) => {
    if (!token) {
      setError('Для удаления дефекта необходимо войти в систему.');
      return;
    }
    if (confirm(`Вы уверены, что хотите удалить дефект с ID ${defectId}? Это действие необратимо.`)) {
      try {
        await deleteDefect(token, defectId);
        setDefects(prevDefects => prevDefects.filter(d => d.id !== defectId));
        alert('Дефект успешно удален.');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Не удалось удалить дефект.');
      }
    }
  };

  const filteredAndSortedDefects = useMemo(() => {
    let filtered = defects.filter(defect =>
      defect.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (defect.description && defect.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (filterStatus !== 'Все') {
      filtered = filtered.filter(defect => defect.status === filterStatus);
    }

    if (filterPriority !== 'Все') {
      filtered = filtered.filter(defect => defect.priority === filterPriority);
    }

    filtered.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return 0;
    });

    return filtered;
  }, [defects, searchTerm, filterStatus, filterPriority, sortBy, sortOrder]);

  if (isLoading) {
    return <div>Загрузка дефектов...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  const statuses = ["Все", "Новая", "В работе", "На проверке", "Закрыта", "Отменена"];
  const priorities = ["Все", "Низкий", "Средний", "Высокий", "Критический"];
  const canCreateDefect = user && (user.role === 'manager' || user.role === 'engineer' || user.role === 'admin');

  return (
    <div className={styles.defectsContainer}>
      <div className={styles.headerActions}>
        <h1>Страница дефектов</h1>
        {canCreateDefect && (
          <button onClick={handleCreateDefectClick} className={styles.createButton}>
            Создать новый дефект
          </button>
        )}
      </div>

      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Поиск по названию или описанию..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={styles.filterSelect}>
          {statuses.map(status => <option key={status} value={status}>{status}</option>)}
        </select>

        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className={styles.filterSelect}>
          {priorities.map(priority => <option key={priority} value={priority}>{priority}</option>)}
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as keyof Defect)} className={styles.sortSelect}>
          <option value="created_at">Дата создания</option>
          <option value="title">Название</option>
          <option value="status">Статус</option>
          <option value="priority">Приоритет</option>
        </select>
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')} className={styles.sortSelect}>
          <option value="asc">По возрастанию</option>
          <option value="desc">По убыванию</option>
        </select>
      </div>

      {filteredAndSortedDefects.length === 0 ? (
        <p>Дефектов пока нет.</p>
      ) : (
        <table className={styles.defectsTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Название</th>
              <th>Статус</th>
              <th>Приоритет</th>
              <th>Исполнитель ID</th>
              <th>Проект ID</th>
              <th>Дата создания</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedDefects.map((defect) => (
              <tr key={defect.id} className={styles.defectRow}>
                <td>
                  {defect.id}
                </td>
                <td>
                  {defect.title}
                </td>
                <td>{defect.status}</td>
                <td>{defect.priority}</td>
                <td>{defect.assignee_id || 'Не назначен'}</td>
                <td>{defect.project_id}</td>
                <td>{new Date(defect.created_at).toLocaleDateString()}</td>
                <td>
                  {(user?.role === 'manager' || user?.id === defect.reporter_id || user?.id === defect.assignee_id || user?.role === 'admin') && (
                    <>
                      <button onClick={() => handleEditDefect(defect.id)} className={styles.editButton}>Осмотр</button>
                      <button onClick={() => handleDeleteDefect(defect.id)} className={styles.deleteButton}>Удалить</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DefectsPage;
