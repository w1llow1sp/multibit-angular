import { Routes } from '@angular/router';

/**
 * Конфигурация маршрутов приложения
 * Использует lazy loading для оптимизации загрузки компонентов
 */
export const routes: Routes = [
  {
    // Редирект с корневого маршрута на список задач
    path: '',
    redirectTo: '/tasks',
    pathMatch: 'full'
  },
  {
    // Главная страница со списком задач
    path: 'tasks',
    loadComponent: () => import('./components/task-list/task-list.component').then(m => m.TaskListComponent),
    title: 'Мои задачи'
  },
  {
    // Страница детальной информации о задаче
    path: 'tasks/:id',
    loadComponent: () => import('./components/task-detail/task-detail.component').then(m => m.TaskDetailComponent),
    title: 'Детали задачи'
  },
  {
    // Редирект для всех неизвестных маршрутов
    path: '**',
    redirectTo: '/tasks'
  }
];
