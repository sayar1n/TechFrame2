'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import AuthGuard from '@/app/components/AuthGuard';
import {
  exportDefectsToCsvExcel,
  fetchAnalyticsSummary,
  fetchStatusDistribution,
  fetchPriorityDistribution,
  fetchCreationTrend,
  fetchProjectPerformance
} from '@/app/utils/api';
import {
  AnalyticsSummary,
  DefectCountByStatus,
  DefectCountByPriority,
  DefectCreationTrendItem,
  ProjectPerformanceItem
} from '@/app/types';
import styles from './ReportsPage.module.scss';
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const ReportsPage = () => {
  const { token, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Для экспорта
  const [loadingAnalytics, setLoadingAnalytics] = useState(true); // Для аналитики

  const [summaryData, setSummaryData] = useState<AnalyticsSummary | null>(null);
  const [statusDistribution, setStatusDistribution] = useState<DefectCountByStatus[]>([]);
  const [priorityDistribution, setPriorityDistribution] = useState<DefectCountByPriority[]>([]);
  const [creationTrend, setCreationTrend] = useState<DefectCreationTrendItem[]>([]);
  const [projectPerformance, setProjectPerformance] = useState<ProjectPerformanceItem[]>([]);
  const [timeRange, setTimeRange] = useState<'all' | '7d' | '30d' | '90d' | 'currentYear'>('all');

  useEffect(() => {
    const getAnalyticsData = async () => {
      if (!token) return;
      setLoadingAnalytics(true);
      setError(null);

      let startDate: string | undefined;
      const endDate: string | undefined = new Date().toISOString();
      let daysForTrend: number = 30;

      switch (timeRange) {
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          daysForTrend = 7;
          break;
        case '30d':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          daysForTrend = 30;
          break;
        case '90d':
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
          daysForTrend = 90;
          break;
        case 'currentYear':
          startDate = new Date(new Date().getFullYear(), 0, 1).toISOString();
          daysForTrend = Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24));
          break;
        case 'all':
        default:
          startDate = undefined; // Получить все данные
          daysForTrend = 365; // Или другое большое число для тренда
          break;
      }

      try {
        const [summary, statusDist, priorityDist, trend, performance] = await Promise.all([
          fetchAnalyticsSummary(token, startDate, endDate),
          fetchStatusDistribution(token, startDate, endDate),
          fetchPriorityDistribution(token, startDate, endDate),
          fetchCreationTrend(token, daysForTrend),
          fetchProjectPerformance(token, startDate, endDate)
        ]);
        setSummaryData(summary);
        setStatusDistribution(statusDist);
        setPriorityDistribution(priorityDist);
        setCreationTrend(trend);
        setProjectPerformance(performance);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить аналитические данные.');
      } finally {
        setLoadingAnalytics(false);
      }
    };

    if (token) {
      getAnalyticsData();
    }
  }, [token, timeRange]);

  const handleExport = async (format: "csv" | "xlsx") => {
    if (!token) {
      setError('Для экспорта отчетов необходимо войти в систему.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const blob = await exportDefectsToCsvExcel(token, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `defects_report.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      alert(`Отчет успешно экспортирован в формат ${format.toUpperCase()}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Не удалось экспортировать отчет в формат ${format.toUpperCase()}.`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || loadingAnalytics) {
    return <div className={styles.loadingMessage}>Загрузка аналитики...</div>;
  }

  if (error) {
    return <div className={styles.errorMessage}>{error}</div>;
  }

  const canViewReports = user?.role === 'manager' || user?.role === 'observer' || user?.role === 'admin' || user?.role === 'engineer';

  if (!canViewReports) {
    return <div className={styles.accessDenied}>У вас нет прав для просмотра этой страницы.</div>;
  }

  return (
    <AuthGuard roles={['manager', 'observer', 'admin', 'engineer']}>
      <div className={styles.reportsContainer}>
        <div className={styles.header}>
          <h1>Аналитика и отчеты</h1>
          <div className={styles.headerActions}>
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as typeof timeRange)} className={styles.timeRangeSelect}>
              <option value="all">Все время</option>
              <option value="7d">Последние 7 дней</option>
              <option value="30d">Последние 30 дней</option>
              <option value="90d">Последние 90 дней</option>
              <option value="currentYear">Текущий год</option>
            </select>
            <button onClick={() => handleExport('csv')} disabled={isLoading} className={styles.exportButton}>
              Экспорт в CSV
            </button>
            <button onClick={() => handleExport('xlsx')} disabled={isLoading} className={styles.exportButton}>
              Экспорт в Excel
            </button>
          </div>
        </div>

        <div className={styles.summaryCards}>
          <div className={styles.card}>
            <p className={styles.cardTitle}>Всего дефектов</p>
            <p className={styles.cardValue}>{summaryData?.total_defects ?? 0}</p>
            <p className={styles.cardSubtitle}>За выбранный период</p>
          </div>
          <div className={styles.card}>
            <p className={styles.cardTitle}>Просроченные</p>
            <p className={`${styles.cardValue} ${styles.overdue}`}>{summaryData?.overdue_defects ?? 0}</p>
            <p className={styles.cardSubtitle}>Требуют внимания</p>
          </div>
          <div className={styles.card}>
            <p className={styles.cardTitle}>Процент выполнения</p>
            <p className={`${styles.cardValue} ${styles.completed}`}>{summaryData?.completion_percentage ?? 0}%</p>
            <p className={styles.cardSubtitle}>Завершенных дефектов</p>
          </div>
          <div className={styles.card}>
            <p className={styles.cardTitle}>Активные проекты</p>
            <p className={styles.cardValue}>{summaryData?.active_projects ?? 0}</p>
            <p className={styles.cardSubtitle}>В работе</p>
          </div>
        </div>

        <div className={styles.chartsGrid}>
          <div className={styles.chartCard}>
            <h2>Распределение по статусам</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartCard}>
            <h2>Распределение по приоритетам</h2>
            <ResponsiveContainer width="100%" height={300}>
          <PieChart>
                {(() => {
                  const pieData: { [key: string]: string | number }[] = priorityDistribution.map(d => ({ priority: d.priority, count: d.count }));
                  return (
                    <Pie
                      data={pieData}
                      dataKey="count"
                      nameKey="priority"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#82ca9d"
                      label
                    >
                      {priorityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  );
                })()}
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartCard}>
            <h2>Динамика создания дефектов</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={creationTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(dateStr: string) => new Date(dateStr).toLocaleDateString()} />
                <YAxis />
                <Tooltip labelFormatter={(label: string) => new Date(label).toLocaleDateString()} />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartCard}>
            <h2>Производительность проектов</h2>
            {
              projectPerformance.length > 0 ? (
                projectPerformance.map(project => (
                  <div key={project.project_id} className={styles.projectProgressItem}>
                    <p>{project.project_title}</p>
                    <div className={styles.progressBarContainer}>
                      <div
                        className={styles.progressBarFill}
                        style={{ width: `${project.completion_percentage}%` }}
                      ></div>
                      <span className={styles.progressBarText}>{project.completed_defects}/{project.total_defects} ({project.completion_percentage}%)</span>
                    </div>
                  </div>
                ))
              ) : (
                <p>Нет данных по производительности проектов.</p>
              )
            }
          </div>
        </div>
      </div>
    </AuthGuard>
  );
};

export default ReportsPage;
