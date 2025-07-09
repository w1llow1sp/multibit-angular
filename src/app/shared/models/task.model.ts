/**
 * Enum для статусов задач
 */
export enum TaskStatus {
  TODO = 'todo',           // К выполнению
  IN_PROGRESS = 'in-progress',  // В процессе
  COMPLETED = 'completed'  // Выполнено
}

/**
 * Основная модель задачи
 */
export interface Task {
  id: string;              // Уникальный идентификатор
  title: string;           // Название задачи (обязательное)
  description?: string;    // Описание задачи (необязательное)
  status: TaskStatus;      // Статус выполнения
  createdAt: string;       // Дата создания (ISO строка)
  updatedAt?: string;      // Дата последнего обновления (ISO строка)
}

/**
 * DTO для создания новой задачи
 */
export interface CreateTaskDto {
  title: string;           // Название задачи (обязательное)
  description?: string;    // Описание задачи (необязательное)
}

/**
 * DTO для обновления существующей задачи
 */
export interface UpdateTaskDto {
  title?: string;          // Новое название
  description?: string;    // Новое описание
  status?: TaskStatus;     // Новый статус
}

// ========== КОНСТАНТЫ ДЛЯ UI ==========

/**
 * Человекочитаемые названия статусов для отображения в UI
 */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'К выполнению',
  [TaskStatus.IN_PROGRESS]: 'В процессе',
  [TaskStatus.COMPLETED]: 'Выполнено'
};

/**
 * CSS классы для стилизации статусов задач
 */
export const TASK_STATUS_CLASSES: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'status-todo',
  [TaskStatus.IN_PROGRESS]: 'status-in-progress', 
  [TaskStatus.COMPLETED]: 'status-completed'
};

// ========== TYPE GUARDS ==========

/**
 * Проверяет, является ли строка валидным статусом задачи
 * @param status Строка для проверки
 * @returns true если статус валидный
 */
export function isValidTaskStatus(status: string): status is TaskStatus {
  return Object.values(TaskStatus).includes(status as TaskStatus);
}

/**
 * Проверяет, является ли объект валидной задачей
 * @param obj Объект для проверки
 * @returns true если объект является валидной задачей
 */
export function isValidTask(obj: any): obj is Task {
  return obj &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    isValidTaskStatus(obj.status) &&
    typeof obj.createdAt === 'string' &&
    (obj.description === undefined || typeof obj.description === 'string') &&
    (obj.updatedAt === undefined || typeof obj.updatedAt === 'string');
} 