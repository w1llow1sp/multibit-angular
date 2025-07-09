import {Component, EventEmitter, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TaskService} from '../../shared/services/task.service';
import {CreateTaskDto} from '../../shared/models/task.model';
import {IconComponent} from '../../shared/components/icon/icon.component';

/**
 * Интерфейс формы добавления задачи
 */
interface AddTaskForm {
  title: string;       // Название задачи
  description: string; // Описание задачи
}

/**
 * Компонент для добавления новой задачи
 * Содержит форму с валидацией и возможностью добавления описания
 */
@Component({
  selector: 'app-add-task',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './add-task.component.html',
  styleUrls: ['./add-task.component.css']
})
export class AddTaskComponent {
  // Событие, генерируемое после добавления задачи или отмены
  @Output() taskAdded = new EventEmitter<void>();

  // ========== ДАННЫЕ ФОРМЫ ==========
  form: AddTaskForm = {
    title: '',
    description: ''
  };

  // ========== UI СОСТОЯНИЕ ==========
  isSubmitting = false;      // Флаг отправки формы
  showDescription = false;   // Флаг отображения поля описания

  constructor(private readonly taskService: TaskService) {}

  // ========== ОБРАБОТЧИКИ ФОРМЫ ==========

  /**
   * Обработка отправки формы
   * Создает новую задачу и сбрасывает форму
   */
  async onSubmit(): Promise<void> {
    const trimmedTitle = this.form.title.trim();
    
    if (!trimmedTitle) {
      alert('Пожалуйста, введите название задачи');
      return;
    }

    if (this.isSubmitting) return;

    this.isSubmitting = true;

    try {
      const taskData: CreateTaskDto = {
        title: trimmedTitle,
        description: this.form.description.trim() || undefined
      };

      const result = await this.taskService.createTask(taskData);
      
      if (result.success) {
        this.resetForm();
        this.taskAdded.emit();
      } else {
        alert(`Ошибка: ${result.message}`);
      }
    } catch (error) {
      console.error('Ошибка при создании задачи:', error);
      alert('Произошла ошибка при создании задачи');
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Переключить отображение поля описания
   */
  toggleDescription(): void {
    this.showDescription = !this.showDescription;
    if (!this.showDescription) {
      this.form.description = '';
    }
  }

  /**
   * Сбросить форму к начальному состоянию
   */
  resetForm(): void {
    this.form = {
      title: '',
      description: ''
    };
    this.showDescription = false;
  }

  /**
   * Отменить создание задачи
   * Сбрасывает форму и закрывает компонент
   */
  onCancel(): void {
    this.resetForm();
    this.taskAdded.emit(); // Генерируем событие для закрытия формы
  }

  // ========== ГОРЯЧИЕ КЛАВИШИ ==========

  /**
   * Обработчик клавиатурных сокращений
   * @param event Событие клавиатуры
   */
  onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'Enter':
          event.preventDefault();
          this.onSubmit();
          break;
        case 'Escape':
          event.preventDefault();
          this.onCancel();
          break;
      }
    }
  }

  // ========== УТИЛИТЫ ДЛЯ UI ==========

  /**
   * Получить количество символов в тексте
   * @param text Текст для подсчета
   * @returns Количество символов
   */
  getCharacterCount(text: string): number {
    return text.length;
  }

  /**
   * Получить CSS класс для счетчика символов в зависимости от заполненности
   * @param count Текущее количество символов
   * @param max Максимальное количество символов
   * @returns CSS класс для цвета текста
   */
  getCharacterCountClass(count: number, max: number): string {
    const percentage = (count / max) * 100;
    if (percentage >= 90) return 'text-danger';
    if (percentage >= 75) return 'text-warning';
    return 'text-muted';
  }
} 