import {Component, OnInit, OnDestroy} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Observable, Subject, takeUntil, switchMap, EMPTY, of} from 'rxjs';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Task, TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_CLASSES} from '../../shared/models/task.model';
import {TaskService} from '../../shared/services/task.service';
import {RussianDatePipe, type DateFormat} from '../../shared/pipes/russian-date.pipe';
import {IconComponent, type IconName} from '../../shared/components/icon/icon.component';
import {LoadingSkeletonComponent} from '../../shared/components/loading-skeleton/loading-skeleton.component';

/**
 * Интерфейс состояния компонента детальной информации о задаче
 */
interface TaskDetailState {
  task: Task | null;        // Загруженная задача
  isLoading: boolean;       // Флаг загрузки
  error: string | null;     // Ошибка загрузки
  isEditing: boolean;       // Флаг режима редактирования
}

/**
 * Компонент для отображения детальной информации о задаче
 * Поддерживает просмотр, редактирование, изменение статуса и удаление задачи
 */
@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RussianDatePipe,
    IconComponent,
    LoadingSkeletonComponent
  ],
  templateUrl: './task-detail.component.html',
  styleUrls: ['./task-detail.component.css']
})
export class TaskDetailComponent implements OnInit, OnDestroy {
  // Subject для отписки от всех подписок при уничтожении компонента
  private readonly destroy$ = new Subject<void>();
  
  // ========== СОСТОЯНИЕ КОМПОНЕНТА ==========
  state: TaskDetailState = {
    task: null,
    isLoading: true,
    error: null,
    isEditing: false
  };
  
  // ========== ДАННЫЕ ФОРМЫ РЕДАКТИРОВАНИЯ ==========
  editForm = {
    title: '',      // Редактируемое название
    description: '' // Редактируемое описание
  };
  
  // ========== UI НАСТРОЙКИ ==========
  dateFormat: DateFormat = 'medium';  // Формат отображения даты
  
  // Экспорт enum для использования в шаблоне
  readonly TaskStatus = TaskStatus;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly taskService: TaskService
  ) {}

  ngOnInit(): void {
    this.loadTask();
  }

  ngOnDestroy(): void {
    // Отписываемся от всех подписок
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== ЗАГРУЗКА ДАННЫХ ==========

  /**
   * Загрузить задачу по ID из параметров маршрута
   */
  private loadTask(): void {
    this.state = { ...this.state, isLoading: true, error: null };

    this.route.params.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        const id = params['id'];
        if (!id) {
          this.state = { 
            ...this.state, 
            isLoading: false, 
            error: 'ID задачи не указан' 
          };
          return EMPTY;
        }
        return this.taskService.getTaskById(id);
      })
    ).subscribe({
      next: (task) => {
        if (task) {
          this.state = {
            ...this.state,
            task,
            isLoading: false,
            error: null
          };
          this.initEditForm(task);
        } else {
          this.state = {
            ...this.state,
            task: null,
            isLoading: false,
            error: 'Задача не найдена'
          };
        }
      },
      error: (error) => {
        console.error('Ошибка загрузки задачи:', error);
        this.state = {
          ...this.state,
          isLoading: false,
          error: 'Ошибка загрузки задачи'
        };
      }
    });
  }

  /**
   * Инициализировать форму редактирования данными задачи
   * @param task Задача для инициализации формы
   */
  private initEditForm(task: Task): void {
    this.editForm = {
      title: task.title,
      description: task.description || ''
    };
  }

  // ========== ОПЕРАЦИИ С ЗАДАЧЕЙ ==========

  /**
   * Обновить статус задачи
   * @param status Новый статус
   */
  updateTaskStatus(status: TaskStatus): void {
    if (!this.state.task) return;

    this.taskService.updateTaskStatus(this.state.task.id, status);
    this.state = {
      ...this.state,
      task: {
        ...this.state.task,
        status,
        updatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Удалить задачу с подтверждением
   */
  async deleteTask(): Promise<void> {
    if (!this.state.task) return;

    if (confirm('Вы уверены, что хотите удалить эту задачу? Это действие нельзя отменить.')) {
      try {
        const result = await this.taskService.deleteTask(this.state.task.id);
        if (result.success) {
          this.router.navigate(['/tasks']);
        } else {
          this.state = {
            ...this.state,
            error: `Ошибка при удалении задачи: ${result.message}`
          };
        }
      } catch (error) {
        console.error('Ошибка при удалении задачи:', error);
        this.state = {
          ...this.state,
          error: 'Ошибка при удалении задачи'
        };
      }
    }
  }

  // ========== ОПЕРАЦИИ РЕДАКТИРОВАНИЯ ==========

  /**
   * Начать редактирование задачи
   */
  startEditing(): void {
    if (!this.state.task) return;
    
    this.initEditForm(this.state.task);
    this.state = { ...this.state, isEditing: true };
  }

  /**
   * Отменить редактирование и восстановить исходные данные
   */
  cancelEditing(): void {
    if (!this.state.task) return;
    
    this.initEditForm(this.state.task);
    this.state = { ...this.state, isEditing: false };
  }

  /**
   * Сохранить изменения в задаче
   */
  async saveTask(): Promise<void> {
    if (!this.state.task) return;

    const trimmedTitle = this.editForm.title.trim();
    if (!trimmedTitle) {
      alert('Название задачи не может быть пустым');
      return;
    }

    try {
      const result = await this.taskService.updateTask(this.state.task.id, {
        title: trimmedTitle,
        description: this.editForm.description.trim() || undefined
      });

      if (result.success && result.data) {
        this.state = {
          ...this.state,
          task: result.data,
          isEditing: false,
          error: null
        };
      } else {
        this.state = {
          ...this.state,
          error: `Ошибка при сохранении задачи: ${result.message}`
        };
      }
    } catch (error) {
      console.error('Ошибка при сохранении задачи:', error);
      this.state = {
        ...this.state,
        error: 'Ошибка при сохранении задачи'
      };
    }
  }

  // ========== УТИЛИТЫ ДЛЯ UI ==========

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
   * Получить CSS класс для контейнера страницы в зависимости от статуса
   * @param status Статус задачи
   * @returns CSS класс для фонового цвета контейнера
   */
  getContainerClass(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.TODO: return 'container-todo';
      case TaskStatus.IN_PROGRESS: return 'container-in-progress';
      case TaskStatus.COMPLETED: return 'container-completed';
      default: return '';
    }
  }

  /**
   * Вернуться к списку задач
   */
  goBack(): void {
    this.router.navigate(['/tasks']);
  }

  // ========== ГОРЯЧИЕ КЛАВИШИ ==========

  /**
   * Обработчик клавиатурных сокращений
   * @param event Событие клавиатуры
   */
  onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'e':
          event.preventDefault();
          if (!this.state.isEditing) {
            this.startEditing();
          }
          break;
        case 's':
          event.preventDefault();
          if (this.state.isEditing) {
            this.saveTask();
          }
          break;
        case 'Escape':
          event.preventDefault();
          if (this.state.isEditing) {
            this.cancelEditing();
          } else {
            this.goBack();
          }
          break;
      }
    }
  }
} 