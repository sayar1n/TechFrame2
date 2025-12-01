'use client';

import AuthGuard from './components/AuthGuard';
import { useAuth } from './context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <AuthGuard>
      <div className="dashboard-container">
        <h1>Добро пожаловать, {user?.username || 'Гость'}!</h1>
        <p>Ваша роль: {user?.role}</p>
        {/* Здесь будет сводная информация и графики по дефектам и проектам */}
        <h2>Сводка по дефектам</h2>
        <p>Общее количество дефектов: <strong>X</strong></p>
        <p>Дефектов в работе: <strong>Y</strong></p>
        <p>Закрытых дефектов: <strong>Z</strong></p>
        {/* ... другие элементы дашборда ... */}
      </div>
    </AuthGuard>
  );
}
