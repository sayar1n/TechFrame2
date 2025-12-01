'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  roles?: (string)[]; // Опциональный массив ролей, которым разрешен доступ
}

const AuthGuard = ({ children, roles }: AuthGuardProps) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Если пользователь не аутентифицирован, перенаправляем на страницу входа
        router.push('/login');
      } else if (roles && !roles.includes(user.role)) {
        // Если у пользователя нет нужной роли, перенаправляем на дашборд или страницу ошибки
        router.push('/'); // Или другая страница для отказа в доступе
      }
    }
  }, [isLoading, user, roles, router]);

  if (isLoading || !user || (roles && !roles.includes(user.role))) {
    // Можно отобразить лоадер или пустой экран пока идет проверка
    return <div>Загрузка...</div>;
  }

  return <>{children}</>;
};

export default AuthGuard;
