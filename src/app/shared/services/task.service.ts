import {Injectable, inject, OnDestroy} from '@angular/core';
import {BehaviorSubject, Observable, map, of, throwError, debounceTime, distinctUntilChanged, 
        shareReplay, filter, combineLatest, merge, timer, Subject, takeUntil, switchMap, 
        catchError, retry, delay} from 'rxjs';
import {Task, TaskStatus, CreateTaskDto, UpdateTaskDto, isValidTask} from '../models/task.model';

/**
 * Интерфейс для статистики задач
 */
export interface TaskStatistics {
  total: number;          // Общее количество задач
  completed: number;      // Количество выполненных задач
  inProgress: number;     // Количество задач в процессе
  todo: number;          // Количество задач к выполнению
  completionRate: number; // Процент выполнения
  averageCompletionTime?: number; // Среднее время выполнения в часах
  tasksCompletedToday: number;    // Задачи, выполненные сегодня
  overdueCount: number;   // Количество просроченных задач
}

/**
 * Интерфейс для фильтрации задач
 */
export interface TaskFilter {
  status?: TaskStatus | TaskStatus[];
  searchText?: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  sortBy?: TaskSortField;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Поля для сортировки задач
 */
export type TaskSortField = 'title' | 'status' | 'createdAt' | 'updatedAt';

/**
 * Интерфейс результата операции
 */
export interface OperationResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * Интерфейс для уведомлений
 */
export interface TaskNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  action?: string;
  taskId?: string;
  timestamp: string;
  autoClose?: boolean;
  duration?: number;
}

/**
 * Конфигурация для импорта/экспорта
 */
export interface ImportExportConfig {
  includeMetadata?: boolean;
  format?: 'json' | 'csv' | 'txt';
  compression?: boolean;
  encryption?: boolean;
  excludeCompleted?: boolean;
  dateFormat?: string;
}

/**
 * Интерфейс для бэкапа данных
 */
export interface TaskBackup {
  id: string;
  timestamp: string;
  tasks: Task[];
  metadata: {
    version: string;
    taskCount: number;
    createdBy: string;
    source: 'manual' | 'auto';
  };
  checksum: string;
}

/**
 * Настройки сервиса
 */
export interface TaskServiceConfig {
  autoSave: boolean;
  autoSaveInterval: number;
  maxBackups: number;
  enableNotifications: boolean;
  enableAnalytics: boolean;
  cacheTimeout: number;
  retryAttempts: number;
  debugMode: boolean;
}

/**
 * Улучшенный сервис для управления задачами
 * Обеспечивает CRUD операции, кеширование, оффлайн поддержку, 
 * уведомления и расширенную аналитику
 */
@Injectable({
  providedIn: 'root'
})
export class TaskService implements OnDestroy {
  // ========== КОНСТАНТЫ ==========
  
  // Ключи для хранения данных в localStorage
  private readonly STORAGE_KEY = 'task-app-tasks';
  private readonly BACKUP_KEY = 'task-app-backups';
  private readonly CONFIG_KEY = 'task-app-config';
  private readonly ANALYTICS_KEY = 'task-app-analytics';

  // ========== НАСТРОЙКИ ПО УМОЛЧАНИЮ ==========
  
  private readonly DEFAULT_CONFIG: TaskServiceConfig = {
    autoSave: true,
    autoSaveInterval: 30000, // 30 секунд
    maxBackups: 5,
    enableNotifications: true,
    enableAnalytics: true,
    cacheTimeout: 300000, // 5 минут
    retryAttempts: 3,
    debugMode: false
  };

  // ========== РЕАКТИВНЫЕ СВОЙСТВА ==========
  
  // Observable для реактивного обновления данных
  private readonly tasksSubject = new BehaviorSubject<Task[]>([]);
  private readonly notificationsSubject = new BehaviorSubject<TaskNotification[]>([]);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly configSubject = new BehaviorSubject<TaskServiceConfig>(this.DEFAULT_CONFIG);

  // Subject для завершения подписок
  private readonly destroy$ = new Subject<void>();

  // ========== КЕШИРОВАНИЕ ==========
  
  private readonly cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly statisticsCache$ = this.tasksSubject.pipe(
    debounceTime(100),
    map(tasks => this.calculateStatistics(tasks)),
    shareReplay(1)
  );

  // ========== ТАЙМЕРЫ И ИНТЕРВАЛЫ ==========
  
  private autoSaveInterval?: number;
  private backupInterval?: number;
  private cacheCleanupInterval?: number;

  constructor() {
    this.initializeService();
  }

     ngOnDestroy(): void {
     this.destroy$.next();
     this.destroy$.complete();
     this.clearIntervals();
     this.clearCache();
   }

   /**
    * Очистка всех интервалов
    */
   private clearIntervals(): void {
     if (this.autoSaveInterval) {
       clearInterval(this.autoSaveInterval);
     }
     if (this.backupInterval) {
       clearInterval(this.backupInterval);
     }
     if (this.cacheCleanupInterval) {
       clearInterval(this.cacheCleanupInterval);
     }
   }

  // ========== ИНИЦИАЛИЗАЦИЯ ==========

  /**
   * Инициализация сервиса
   */
  private initializeService(): void {
    this.loadConfiguration();
    this.loadTasksFromStorage();
    this.setupAutoSave();
    this.setupPeriodicBackup();
    this.setupCacheCleanup();
    this.setupErrorHandling();
    
         if (this.config.debugMode) {
       this.enableDebugMode();
     }
   }

   /**
    * Настройка обработки ошибок
    */
   private setupErrorHandling(): void {
     // Глобальная обработка ошибок
     window.addEventListener('error', (event) => {
       this.handleError('Глобальная ошибка', event.error);
     });

     window.addEventListener('unhandledrejection', (event) => {
       this.handleError('Необработанное отклонение промиса', event.reason);
     });
   }

  /**
   * Загрузить конфигурацию из localStorage
   */
  private loadConfiguration(): void {
    try {
      const stored = localStorage.getItem(this.CONFIG_KEY);
      if (stored) {
        const config = JSON.parse(stored);
        this.configSubject.next({ ...this.DEFAULT_CONFIG, ...config });
      }
    } catch (error) {
      this.handleError('Ошибка загрузки конфигурации', error);
    }
  }

  /**
   * Получить текущую конфигурацию
   */
  private get config(): TaskServiceConfig {
    return this.configSubject.value;
  }

  // ========== ГЕТТЕРЫ ДЛЯ ПОЛУЧЕНИЯ ДАННЫХ ==========

  /**
   * Получить все задачи как Observable
   */
  getTasks(): Observable<Task[]> {
    return this.tasksSubject.asObservable();
  }

  /**
   * Получить задачи с фильтрацией и сортировкой
   */
  getFilteredTasks(filter: TaskFilter = {}): Observable<Task[]> {
    return this.tasksSubject.pipe(
      map(tasks => this.applyFilters(tasks, filter)),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
    );
  }

  /**
   * Получить общее количество задач
   */
  getTasksCount(): Observable<number> {
    return this.tasksSubject.pipe(
      map(tasks => tasks.length)
    );
  }

  /**
   * Получить количество выполненных задач
   */
  getCompletedTasksCount(): Observable<number> {
    return this.tasksSubject.pipe(
      map(tasks => tasks.filter(task => task.status === TaskStatus.COMPLETED).length)
    );
  }

  /**
   * Получить улучшенную статистику по всем задачам
   */
  getTaskStatistics(): Observable<TaskStatistics> {
    return this.statisticsCache$;
  }

  /**
   * Найти задачу по ID с кешированием
   */
  getTaskById(id: string): Observable<Task | null> {
    const cacheKey = `task-${id}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return of(cached);
    }

    return this.tasksSubject.pipe(
      map(tasks => {
        const task = tasks.find(task => task.id === id) || null;
        if (task) {
          this.setCachedData(cacheKey, task, this.config.cacheTimeout);
        }
        return task;
      })
    );
  }

  /**
   * Получить уведомления
   */
  getNotifications(): Observable<TaskNotification[]> {
    return this.notificationsSubject.asObservable();
  }

  /**
   * Получить состояние загрузки
   */
  getLoadingState(): Observable<boolean> {
    return this.loadingSubject.asObservable();
  }

  /**
   * Получить ошибки
   */
  getErrors(): Observable<string | null> {
    return this.errorSubject.asObservable();
  }

  // ========== CRUD ОПЕРАЦИИ С УЛУЧШЕНИЯМИ ==========
  
  /**
   * Создать новую задачу с валидацией и уведомлениями
   * @param taskData Данные для создания задачи
   * @returns Promise с результатом операции
   */
  async createTask(taskData: CreateTaskDto): Promise<OperationResult<Task>> {
    try {
      this.setLoading(true);
      
      // Валидация входных данных
      const validation = this.validateCreateTaskData(taskData);
      if (!validation.isValid) {
        return this.createErrorResult(`Ошибка валидации: ${validation.errors.join(', ')}`);
      }

      const newTask: Task = {
        id: this.generateId(),
        title: taskData.title.trim(),
        description: taskData.description?.trim(),
        status: TaskStatus.TODO,
        createdAt: new Date().toISOString()
      };

      const currentTasks = this.tasksSubject.value;
      const updatedTasks = [newTask, ...currentTasks];
      
      await this.updateTasks(updatedTasks);
      
      // Отправляем уведомление
      this.addNotification({
        type: 'success',
        title: 'Задача создана',
        message: `Задача "${newTask.title}" успешно создана`,
        taskId: newTask.id
      });

      // Аналитика
      if (this.config.enableAnalytics) {
        this.trackEvent('task_created', { taskId: newTask.id });
      }

      return this.createSuccessResult('Задача успешно создана', newTask);
      
    } catch (error) {
      return this.handleOperationError('Ошибка создания задачи', error);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Обновить существующую задачу
   * @param id ID задачи для обновления
   * @param updates Данные для обновления
   * @returns Promise с обновленной задачей
   */
  updateTask(id: string, updates: UpdateTaskDto): Promise<OperationResult<Task>> {
    return new Promise((resolve, reject) => {
      const currentTasks = this.tasksSubject.value;
      const taskIndex = currentTasks.findIndex(task => task.id === id);

      if (taskIndex === -1) {
        reject(this.createErrorResult(`Задача с ID ${id} не найдена`));
        return;
      }

      const updatedTask: Task = {
        ...currentTasks[taskIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Валидируем обновленную задачу
      if (!isValidTask(updatedTask)) {
        reject(this.createErrorResult('Неверные данные задачи'));
        return;
      }

      this.updateTasks(currentTasks)
        .then(() => {
          this.addNotification({
            type: 'success',
            title: 'Задача обновлена',
            message: `Задача "${updatedTask.title}" успешно обновлена`,
            taskId: updatedTask.id
          });
          if (this.config.enableAnalytics) {
            this.trackEvent('task_updated', { taskId: updatedTask.id });
          }
          resolve(this.createSuccessResult('Задача успешно обновлена', updatedTask));
        })
        .catch(error => {
          reject(this.handleOperationError('Ошибка обновления задачи', error));
        });
    });
  }

  /**
   * Обновить статус задачи
   * @param id ID задачи
   * @param status Новый статус
   */
  updateTaskStatus(id: string, status: TaskStatus): void {
    const currentTasks = this.tasksSubject.value;
    const taskIndex = currentTasks.findIndex(task => task.id === id);

    if (taskIndex === -1) {
      console.error(`Задача с ID ${id} не найдена`);
      return;
    }

    const updatedTask: Task = {
      ...currentTasks[taskIndex],
      status,
      updatedAt: new Date().toISOString()
    };

    const updatedTasks = [...currentTasks];
    updatedTasks[taskIndex] = updatedTask;

    this.updateTasks(updatedTasks)
      .then(() => {
        this.addNotification({
          type: 'success',
          title: 'Статус задачи обновлен',
          message: `Статус задачи "${updatedTask.title}" обновлен на "${updatedTask.status}"`,
          taskId: updatedTask.id
        });
        if (this.config.enableAnalytics) {
          this.trackEvent('task_status_updated', { taskId: updatedTask.id, status: updatedTask.status });
        }
      })
      .catch(error => {
        this.handleError('Ошибка обновления статуса задачи', error);
      });
  }

  /**
   * Удалить задачу по ID
   * @param id ID задачи для удаления
   * @returns Promise, выполняющийся после удаления
   */
  deleteTask(id: string): Promise<OperationResult<void>> {
    return new Promise((resolve, reject) => {
      const currentTasks = this.tasksSubject.value;
      const taskExists = currentTasks.some(task => task.id === id);

      if (!taskExists) {
        reject(this.createErrorResult(`Задача с ID ${id} не найдена`));
        return;
      }

      this.updateTasks(currentTasks.filter(task => task.id !== id))
        .then(() => {
          this.addNotification({
            type: 'success',
            title: 'Задача удалена',
            message: `Задача с ID ${id} успешно удалена`,
            taskId: id
          });
          if (this.config.enableAnalytics) {
            this.trackEvent('task_deleted', { taskId: id });
          }
          resolve(this.createSuccessResult('Задача успешно удалена'));
        })
        .catch(error => {
          reject(this.handleOperationError('Ошибка удаления задачи', error));
        });
    });
  }

  // ========== МАССОВЫЕ ОПЕРАЦИИ ==========

  /**
   * Удалить все задачи
   */
  deleteAllTasks(): void {
    this.updateTasks([]);
    this.addNotification({
      type: 'info',
      title: 'Все задачи удалены',
      message: 'Все задачи успешно удалены из списка.'
    });
    if (this.config.enableAnalytics) {
      this.trackEvent('tasks_deleted_all');
    }
  }

  /**
   * Сбросить к демо-данным
   * Очищает localStorage и загружает тестовые задачи
   */
  resetToMockData(): void {
    // Очищаем localStorage и загружаем демо-данные
    localStorage.removeItem(this.STORAGE_KEY);
    this.initializeMockData();
    this.addNotification({
      type: 'info',
      title: 'Данные сброшены',
      message: 'Все задачи успешно сброшены к демонстрационным данным.'
    });
    if (this.config.enableAnalytics) {
      this.trackEvent('data_reset_to_mock');
    }
  }

  /**
   * Удалить все выполненные задачи
   */
  deleteCompletedTasks(): void {
    const currentTasks = this.tasksSubject.value;
    const activeTasks = currentTasks.filter(task => task.status !== TaskStatus.COMPLETED);
    this.updateTasks(activeTasks)
      .then(() => {
        this.addNotification({
          type: 'success',
          title: 'Выполненные задачи удалены',
          message: `Все выполненные задачи успешно удалены.`
        });
        if (this.config.enableAnalytics) {
          this.trackEvent('tasks_deleted_completed');
        }
      })
      .catch(error => {
        this.handleError('Ошибка удаления выполненных задач', error);
      });
  }

  /**
   * Отметить все задачи как выполненные
   */
  markAllAsCompleted(): void {
    const currentTasks = this.tasksSubject.value;
    const updatedTasks = currentTasks.map(task => ({
      ...task,
      status: TaskStatus.COMPLETED,
      updatedAt: new Date().toISOString()
    }));
    this.updateTasks(updatedTasks)
      .then(() => {
        this.addNotification({
          type: 'success',
          title: 'Все задачи отмечены как выполненные',
          message: 'Все задачи успешно отмечены как выполненные.'
        });
        if (this.config.enableAnalytics) {
          this.trackEvent('tasks_marked_completed');
        }
      })
      .catch(error => {
        this.handleError('Ошибка отметки всех задач как выполненных', error);
      });
  }

  // ========== ИМПОРТ/ЭКСПОРТ ==========

  /**
   * Экспортировать все задачи в JSON формат
   * @returns Строка JSON с данными задач
   */
  exportTasks(): string {
    const tasks = this.tasksSubject.value;
    return JSON.stringify(tasks, null, 2);
  }

  /**
   * Импортировать задачи из JSON данных
   * @param jsonData JSON строка с данными задач
   * @returns Observable с результатом импорта
   */
  importTasks(jsonData: string): Observable<{success: boolean, message: string, tasksImported?: number}> {
    try {
      const importedData = JSON.parse(jsonData);
      
      if (!Array.isArray(importedData)) {
        return of({success: false, message: 'Данные должны быть массивом задач'});
      }

      const validTasks = importedData.filter((item: any) => {
        if (!isValidTask(item)) {
          console.warn('Найдена неверная задача при импорте:', item);
          return false;
        }
        return true;
      });

      if (validTasks.length === 0) {
        return of({success: false, message: 'Не найдено валидных задач для импорта'});
      }

      // Присваиваем новые ID чтобы избежать конфликтов
      const tasksWithNewIds = validTasks.map(task => ({
        ...task,
        id: this.generateId()
      }));

      const currentTasks = this.tasksSubject.value;
      const allTasks = [...tasksWithNewIds, ...currentTasks];
      
      this.updateTasks(allTasks)
        .then(() => {
          this.addNotification({
            type: 'success',
            title: 'Задачи импортированы',
            message: `Успешно импортировано ${validTasks.length} задач.`
          });
          if (this.config.enableAnalytics) {
            this.trackEvent('tasks_imported', { count: validTasks.length });
          }
        })
        .catch(error => {
          this.handleOperationError('Ошибка импорта задач', error);
        });

      return of({
        success: true, 
        message: `Успешно импортировано ${validTasks.length} задач`,
        tasksImported: validTasks.length
      });

    } catch (error) {
      return of({success: false, message: 'Ошибка при разборе JSON данных'});
    }
  }

  // ========== ПРИВАТНЫЕ МЕТОДЫ ==========
  /**
   * Обновить задачи в Subject и сохранить в localStorage
   * @param tasks Массив задач для обновления
   */
  private updateTasks(tasks: Task[]): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.tasksSubject.next(tasks);
        this.saveTasksToStorage(tasks);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Загрузить задачи из localStorage
   * Если данных нет или они повреждены, загружает демо-данные
   */
  private loadTasksFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsedTasks = JSON.parse(stored);
        if (Array.isArray(parsedTasks)) {
          // Валидируем все задачи
          const validTasks = parsedTasks.filter(isValidTask);
          this.tasksSubject.next(validTasks);
          
          // Если отфильтровали неверные задачи, сохраняем очищенные данные
          if (validTasks.length !== parsedTasks.length) {
            this.saveTasksToStorage(validTasks);
          }
        }
      } else {
        // Инициализируем демо-данными если нет сохраненных задач
        this.initializeMockData();
      }
    } catch (error) {
      console.error('Ошибка при загрузке задач из localStorage:', error);
      // Очищаем поврежденные данные и инициализируем демо-данными
      localStorage.removeItem(this.STORAGE_KEY);
      this.initializeMockData();
    }
  }

  /**
   * Инициализация демонстрационных данных
   * Создает набор тестовых задач с разными статусами
   */
  private initializeMockData(): void {
    const mockTasks: Task[] = [
      {
        id: this.generateId(),
        title: 'Изучить Angular',
        description: 'Познакомиться с основами фреймворка Angular и создать первое приложение',
        status: TaskStatus.IN_PROGRESS,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 дня назад
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()  // 1 день назад
      },
      {
        id: this.generateId(),
        title: 'Написать README',
        description: 'Создать подробную документацию для проекта',
        status: TaskStatus.TODO,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: this.generateId(),
        title: 'Настроить сборку проекта',
        description: 'Конфигурировать webpack и настроить оптимизацию',
        status: TaskStatus.COMPLETED,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: this.generateId(),
        title: 'Добавить тесты',
        description: 'Покрыть основную функциональность unit-тестами',
        status: TaskStatus.TODO,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() // 4 часа назад
      },
      {
        id: this.generateId(),
        title: 'Создать дизайн-систему',
        description: 'Разработать единый стиль для всех компонентов приложения',
        status: TaskStatus.IN_PROGRESS,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ];

    this.updateTasks(mockTasks);
  }

  /**
   * Сохранить задачи в localStorage
   * @param tasks Массив задач для сохранения
   */
  private saveTasksToStorage(tasks: Task[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Ошибка при сохранении задач в localStorage:', error);
    }
  }

  /**
   * Генерировать уникальный ID для задачи
   * @returns Строка с уникальным ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Применить фильтры к задачам
   * @param tasks Массив задач
   * @param filter Объект фильтра
   * @returns Отфильтрованные задачи
   */
  private applyFilters(tasks: Task[], filter: TaskFilter): Task[] {
    let filteredTasks = [...tasks];

    if (filter.status) {
      filteredTasks = filteredTasks.filter(task => {
        if (Array.isArray(filter.status)) {
          return filter.status.includes(task.status);
        }
        return task.status === filter.status;
      });
    }

    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      filteredTasks = filteredTasks.filter(task => 
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower)
      );
    }

              if (filter.dateRange?.from) {
       filteredTasks = filteredTasks.filter(task => new Date(task.createdAt) >= filter.dateRange!.from!);
     }
     if (filter.dateRange?.to) {
       filteredTasks = filteredTasks.filter(task => new Date(task.createdAt) <= filter.dateRange!.to!);
     }

     if (filter.sortBy) {
       filteredTasks.sort((a, b) => {
         const sortField = filter.sortBy!;
         const aValue = a[sortField] as string | undefined;
         const bValue = b[sortField] as string | undefined;

         if (!aValue && !bValue) return 0;
         if (!aValue) return 1;
         if (!bValue) return -1;

         if (aValue < bValue) {
           return filter.sortOrder === 'asc' ? -1 : 1;
         }
         if (aValue > bValue) {
           return filter.sortOrder === 'asc' ? 1 : -1;
         }
         return 0;
       });
     }

    if (filter.limit) {
      filteredTasks = filteredTasks.slice(0, filter.limit);
    }

    if (filter.offset) {
      filteredTasks = filteredTasks.slice(filter.offset);
    }

    return filteredTasks;
  }

  /**
   * Рассчитать статистику по задачам
   * @param tasks Массив задач
   * @returns Объект статистики
   */
  private calculateStatistics(tasks: Task[]): TaskStatistics {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const inProgress = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
    const todo = tasks.filter(t => t.status === TaskStatus.TODO).length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    const tasksCompletedToday = tasks.filter(task => {
      const taskDate = new Date(task.createdAt);
      return taskDate.toDateString() === new Date().toDateString();
    }).length;

    const overdueCount = tasks.filter(task => {
      const taskDate = new Date(task.createdAt);
      return taskDate < new Date() && task.status !== TaskStatus.COMPLETED;
    }).length;

    return {
      total,
      completed,
      inProgress,
      todo,
      completionRate: Math.round(completionRate * 100) / 100,
      tasksCompletedToday,
      overdueCount
    };
  }

  /**
   * Валидация данных для создания задачи
   * @param taskData Данные для создания задачи
   * @returns Объект с результатом валидации
   */
  private validateCreateTaskData(taskData: CreateTaskDto): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!taskData.title) {
      errors.push('Заголовок задачи не может быть пустым.');
    }
    if (taskData.title.length > 100) {
      errors.push('Заголовок задачи не может быть длиннее 100 символов.');
    }
    if (taskData.description && taskData.description.length > 500) {
      errors.push('Описание задачи не может быть длиннее 500 символов.');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Создание результата операции
   * @param message Сообщение
   * @param data Данные
   * @returns Объект результата
   */
  private createSuccessResult<T>(message: string, data?: T): OperationResult<T> {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Создание результата операции с ошибкой
   * @param message Сообщение
   * @param error Ошибка
   * @returns Объект результата
   */
  private createErrorResult<T>(message: string, error?: string): OperationResult<T> {
    return {
      success: false,
      message,
      error,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Обработка ошибок операций
   * @param message Сообщение
   * @param error Ошибка
   * @returns Объект результата
   */
  private handleOperationError<T>(message: string, error: any): OperationResult<T> {
    console.error(message, error);
    this.addNotification({
      type: 'error',
      title: 'Ошибка операции',
      message: `${message}: ${error.message || error}`,
      autoClose: true,
      duration: 5000
    });
    this.errorSubject.next(message);
    if (this.config.enableAnalytics) {
      this.trackEvent('operation_error', { message, error: error.message || error });
    }
    return this.createErrorResult(message, error.message || error);
  }

  /**
   * Установка состояния загрузки
   * @param loading Состояние загрузки
   */
  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

     /**
    * Добавление уведомления
    * @param notification Уведомление
    */
   private addNotification(notification: Partial<TaskNotification>): void {
     const fullNotification: TaskNotification = {
       id: this.generateId(),
       timestamp: new Date().toISOString(),
       autoClose: true,
       duration: 3000,
       ...notification
     } as TaskNotification;
     
     const currentNotifications = this.notificationsSubject.value;
     const newNotifications = [...currentNotifications, fullNotification];
     this.notificationsSubject.next(newNotifications);
   }

  /**
   * Очистка уведомлений
   */
  private clearNotifications(): void {
    this.notificationsSubject.next([]);
  }

  /**
   * Установка конфигурации
   * @param config Новая конфигурация
   */
  private setConfig(config: Partial<TaskServiceConfig>): void {
    const currentConfig = this.configSubject.value;
    this.configSubject.next({ ...currentConfig, ...config });
    this.saveConfigToStorage();
  }

  /**
   * Загрузка конфигурации из localStorage
   */
  private loadConfigFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.CONFIG_KEY);
      if (stored) {
        const config = JSON.parse(stored);
        this.configSubject.next({ ...this.DEFAULT_CONFIG, ...config });
      }
    } catch (error) {
      this.handleError('Ошибка загрузки конфигурации', error);
    }
  }

  /**
   * Сохранение конфигурации в localStorage
   */
  private saveConfigToStorage(): void {
    try {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.configSubject.value));
    } catch (error) {
      this.handleError('Ошибка сохранения конфигурации', error);
    }
  }

  /**
   * Установка автоматического сохранения
   */
  private setupAutoSave(): void {
    if (this.config.autoSave) {
      this.autoSaveInterval = window.setInterval(() => {
        this.saveTasksToStorage(this.tasksSubject.value);
        this.saveConfigToStorage();
        if (this.config.enableAnalytics) {
          this.trackEvent('auto_save');
        }
      }, this.config.autoSaveInterval);
    }
  }

  /**
   * Установка периодического бэкапа
   */
  private setupPeriodicBackup(): void {
    if (this.config.autoSave) {
      this.backupInterval = window.setInterval(() => {
        this.saveTasksToStorage(this.tasksSubject.value);
        this.saveConfigToStorage();
        if (this.config.enableAnalytics) {
          this.trackEvent('auto_backup');
        }
      }, this.config.autoSaveInterval * 2); // Бэкап каждые 2 автосохранения
    }
  }

  /**
   * Установка очистки кеша
   */
  private setupCacheCleanup(): void {
    this.cacheCleanupInterval = window.setInterval(() => {
      this.clearCache();
    }, this.config.cacheTimeout);
  }

  /**
   * Очистка кеша
   */
  private clearCache(): void {
    this.cache.clear();
  }

  /**
   * Получение данных из кеша
   * @param key Ключ
   * @returns Данные из кеша или null
   */
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.timestamp + cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Сохранение данных в кеш
   * @param key Ключ
   * @param data Данные
   * @param ttl Время жизни в миллисекундах
   */
  private setCachedData(key: string, data: any, ttl: number): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  /**
   * Установка режима отладки
   */
  private enableDebugMode(): void {
    console.log('Debug mode enabled. TaskService is in debug mode.');
    // Здесь можно добавить логику для отладки, например, перехватывание запросов
    // или переопределение методов для отслеживания изменений
  }

  /**
   * Обработка ошибок
   * @param message Сообщение
   * @param error Ошибка
   */
  private handleError(message: string, error: any): void {
    console.error(message, error);
    this.addNotification({
      type: 'error',
      title: 'Ошибка сервиса',
      message: `${message}: ${error.message || error}`,
      autoClose: true,
      duration: 10000
    });
    this.errorSubject.next(message);
    if (this.config.enableAnalytics) {
      this.trackEvent('service_error', { message, error: error.message || error });
    }
  }

  /**
   * Отправка события аналитики
   * @param eventName Название события
   * @param properties Свойства события
   */
  private trackEvent(eventName: string, properties?: { [key: string]: any }): void {
    if (this.config.enableAnalytics) {
      const eventData = {
        event: eventName,
        properties: properties || {}
      };
      // Здесь можно добавить отправку события на сервер аналитики
      console.log('Tracking event:', eventData);
    }
  }
} 