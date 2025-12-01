'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import styles from './Header.module.scss';

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Link href="/">Управление дефектами</Link>
      </div>
      <nav className={styles.nav}>
        <ul>
          <li><Link href="/projects">Проекты</Link></li>
          <li><Link href="/defects">Дефекты</Link></li>
          {user?.role === 'manager' || user?.role === 'admin' && (
            <li><Link href="/users">Пользователи</Link></li>
          )}
          {(user?.role === 'manager' || user?.role === 'observer' || user?.role === 'admin') && (
            <li><Link href="/reports">Отчеты</Link></li>
          )}
        </ul>
      </nav>
      <div className={styles.userActions}>
        {user ? (
          <>
            <span>Привет, {user.username} ({user.role})</span>
            <button onClick={logout} className={styles.logoutButton}>Выйти</button>
          </>
        ) : (
          <Link href="/login">Войти</Link>
        )}
      </div>
    </header>
  );
};

export default Header;
