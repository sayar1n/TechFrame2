'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { User } from '@/app/types';
import { fetchUsers } from '@/app/utils/api';
import { useAuth } from '@/app/context/AuthContext';
import AuthGuard from '@/app/components/AuthGuard';
import styles from './UsersPage.module.scss';
import { updateUserRole } from '@/app/utils/api'; // Импортируем новую функцию

const UsersPage = () => {
  const { token, isLoading: authLoading, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('Все');
  const [sortBy, setSortBy] = useState<keyof User>('username');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isUpdatingRole, setIsUpdatingRole] = useState<boolean>(false); // Новое состояние для отслеживания обновления роли

  useEffect(() => {
    const getUsers = async () => {
      if (!token || authLoading) return;

      try {
        const fetchedUsers = await fetchUsers(token);
        setUsers(fetchedUsers);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить пользователей.');
      }
    };

    getUsers();
  }, [token, authLoading]);

  const handleRoleChange = async (userId: number, newRole: "manager" | "engineer" | "observer" | "admin") => {
    if (!token || !user || (user.role !== 'manager' && user.role !== 'admin') || userId === user.id) {
      alert('У вас нет прав для изменения роли или вы пытаетесь изменить свою собственную роль.');
      return;
    }

    setIsUpdatingRole(true);
    setError(null);
    try {
      // "admin" is not valid for updateUserRole, so restrict to correct roles
      if (newRole === "admin") {
        throw new Error('Роль "admin" не может быть выдана этим способом.');
      }
      const updatedUser = await updateUserRole(token, userId, newRole);
      setUsers(prevUsers => prevUsers.map(u => u.id === userId ? updatedUser : u));
      alert(`Роль пользователя ${updatedUser.username} успешно обновлена на ${updatedUser.role}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить роль пользователя.');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(user =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filterRole !== 'Все') {
      filtered = filtered.filter(user => user.role === filterRole);
    }

    filtered.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return sortOrder === 'asc' ? (aValue === bValue ? 0 : aValue ? -1 : 1) : (aValue === bValue ? 0 : aValue ? 1 : -1);
      }
      return 0;
    });

    return filtered;
  }, [users, searchTerm, filterRole, sortBy, sortOrder]);

  if (authLoading) {
    return <div>Загрузка пользователей...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  const roles = ["Все", "manager", "engineer", "observer", "admin"];
  const canEditRoles = user && (user.role === 'manager' || user.role === 'admin'); // Менеджеры и Админы могут редактировать роли

  return (
    <AuthGuard roles={['manager', 'admin']}>
      <div className={styles.usersContainer}>
        <h1>Страница пользователей</h1>

        <div className={styles.filters}>
          <input
            type="text"
            placeholder="Поиск по имени или email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />

          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className={styles.filterSelect}>
            {roles.map(role => <option key={role} value={role}>{role}</option>)}
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as keyof User)} className={styles.sortSelect}>
            <option value="username">Имя пользователя</option>
            <option value="email">Email</option>
            <option value="role">Роль</option>
            <option value="is_active">Активен</option>
          </select>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')} className={styles.sortSelect}>
            <option value="asc">По возрастанию</option>
            <option value="desc">По убыванию</option>
          </select>
        </div>

        {filteredAndSortedUsers.length === 0 ? (
          <p>Пользователей пока нет.</p>
        ) : (
          <table className={styles.usersTable}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Имя пользователя</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Активен</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedUsers.map((u) => (
                <tr key={u.id} className={styles.userRow}>
                  <td>{u.id}</td>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td>
                    {canEditRoles && u.id !== user?.id ? (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as "manager" | "engineer" | "observer" | "admin")}
                        disabled={isUpdatingRole}
                        className={styles.roleSelect}
                      >
                        <option value="observer">Наблюдатель</option>
                        <option value="engineer">Инженер</option>
                        <option value="manager">Менеджер</option>
                        <option value="admin">Админ</option>
                      </select>
                    ) : (
                      u.role
                    )}
                  </td>
                  <td>{u.is_active ? 'Да' : 'Нет'}</td>
                </tr>
              ))
            }
            </tbody>
          </table>
        )}
      </div>
    </AuthGuard>
  );
};

export default UsersPage;
