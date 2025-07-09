import {Component, OnInit} from '@angular/core';
import {Observable, combineLatest, map, startWith, BehaviorSubject} from 'rxjs';
import {Task, TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_CLASSES} from '../../shared/models/task.model';
import {TaskService} from '../../shared/services/task.service';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {AddTaskComponent} from '../add-task/add-task.component';
import {RouterLink} from '@angular/router';
import {RussianDatePipe, type DateFormat} from '../../shared/pipes/russian-date.pipe';
import {IconComponent, type IconName} from '../../shared/components/icon/icon.component';

import {LoadingSkeletonComponent} from '../../shared/components/loading-skeleton/loading-skeleton.component';

/**
 * Интерфейс состояния компонента списка задач
 */
interface TaskListState {
  tasks: Task[];           // Массив задач
  isLoading: boolean;      // Флаг загрузки
  error: string | null;    // Ошибка загрузки
}

/**
 * Компонент для отображения списка задач
 * Поддерживает создание, просмотр, удаление и изменение статуса задач
 */
@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    AddTaskComponent, 
    RouterLink, 
    RussianDatePipe,
    IconComponent,
    LoadingSkeletonComponent
  ],
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent implements OnInit {
  // ========== OBSERVABLES ДЛЯ ДАННЫХ ==========
  readonly tasks$: Observable<Task[]>;
  readonly tasksCount$: Observable<number>;
  readonly completedTasksCount$: Observable<number>;
  
  // ========== UI СОСТОЯНИЕ ==========
  showAddForm = false;  // Флаг отображения формы добавления
  dateFormat: Exclude<DateFormat, 'full'> = 'medium';  // Формат даты
  isLoading = true;     // Флаг загрузки данных
  
  // Объединенное состояние компонента
  readonly state$: Observable<TaskListState>;
  
  // Экспорт enum для использования в шаблоне
  readonly TaskStatus = TaskStatus;

  constructor(private readonly taskService: TaskService) {
    // Подписка на данные из сервиса
    this.tasks$ = this.taskService.getTasks();
    this.tasksCount$ = this.taskService.getTasksCount();
    this.completedTasksCount$ = this.taskService.getCompletedTasksCount();
    
    // Создание объединенного состояния для шаблона
    this.state$ = this.tasks$.pipe(
      map((tasks) => ({
        tasks,
        isLoading: false,
        error: null
      })),
      startWith({
        tasks: [],
        isLoading: true,
        error: null
      })
    );
  }

  ngOnInit(): void {
    // Имитация времени загрузки для skeleton экрана
    setTimeout(() => {
      this.isLoading = false;
    }, 800);
  }

  // ========== МЕТОДЫ ДЛЯ UI ==========

  /**
   * Переключить отображение формы добавления задачи
   */
  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
  }

  /**
   * Удалить задачу с подтверждением
   * @param id ID задачи для удаления
   */
  async deleteTask(id: string): Promise<void> {
    if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
      try {
        const result = await this.taskService.deleteTask(id);
        if (!result.success) {
          alert(`Ошибка удаления: ${result.message}`);
        }
      } catch (error) {
        console.error('Ошибка при удалении задачи:', error);
        alert('Произошла ошибка при удалении задачи');
      }
    }
  }

  /**
   * Обновить статус задачи
   * @param id ID задачи
   * @param status Новый статус
   */
  updateTaskStatus(id: string, status: TaskStatus): void {
    this.taskService.updateTaskStatus(id, status);
  }

  /**
   * Получить текстовое представление статуса
   * @param status Статус задачи
   * @returns Текст статуса на русском языке
   */
  getStatusText(status: TaskStatus): string {
    return TASK_STATUS_LABELS[status] || 'Неизвестно';
  }

  /**
   * Получить CSS класс для статуса
   * @param status Статус задачи
   * @returns CSS класс
   */
  getStatusClass(status: TaskStatus): string {
    return TASK_STATUS_CLASSES[status] || '';
  }

  /**
   * Обработчик события добавления задачи
   * Закрывает форму после добавления
   */
  onTaskAdded(): void {
    this.showAddForm = false;
  }

  /**
   * TrackBy функция для ngFor оптимизации
   * @param index Индекс элемента
   * @param task Задача
   * @returns Уникальный ID задачи
   */
  trackByTaskId(index: number, task: Task): string {
    return task.id;
  }

  // ========== УТИЛИТЫ ДЛЯ ШАБЛОНА ==========

  /**
   * Получить иконку для статуса задачи
   * @param status Статус задачи
   * @returns Название иконки
   */
  getTaskStatusIcon(status: TaskStatus): IconName {
    switch (status) {
      case TaskStatus.TODO: return 'x';
      case TaskStatus.IN_PROGRESS: return 'clock';
      case TaskStatus.COMPLETED: return 'check';
      default: return 'info';
    }
  }

  /**
   * Получить цвет для статуса задачи
   * @param status Статус задачи
   * @returns Название цвета для иконки
   */
  getTaskStatusColor(status: TaskStatus): 'primary' | 'secondary' | 'success' | 'danger' | 'warning' {
    switch (status) {
      case TaskStatus.TODO: return 'danger';
      case TaskStatus.IN_PROGRESS: return 'primary';
      case TaskStatus.COMPLETED: return 'success';
      default: return 'secondary';
    }
  }

  /**
   * Получить CSS класс для карточки задачи в зависимости от статуса
   * @param status Статус задачи
   * @returns CSS класс для фонового градиента
   */
  getTaskCardClass(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.TODO: return 'card-todo';
      case TaskStatus.IN_PROGRESS: return 'card-in-progress';
      case TaskStatus.COMPLETED: return 'card-completed';
      default: return '';
    }
  }
} 