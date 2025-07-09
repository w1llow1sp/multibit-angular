import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Доступные типы скелетонов
 */
export type SkeletonType = 'task-list' | 'task-detail' | 'form' | 'text' | 'header' | 'sidebar' | 'grid' | 'table' | 'custom';

/**
 * Типы анимации для скелетонов
 */
export type SkeletonAnimation = 'shimmer' | 'pulse' | 'wave' | 'fade' | 'none';

/**
 * Темы для скелетонов
 */
export type SkeletonTheme = 'light' | 'dark' | 'auto';

/**
 * Конфигурация скелетона
 */
export interface SkeletonConfig {
  animation: SkeletonAnimation;
  theme: SkeletonTheme;
  speed: 'slow' | 'normal' | 'fast';
  borderRadius: 'none' | 'small' | 'medium' | 'large';
  showGradient: boolean;
}

/**
 * Кастомные размеры элементов скелетона
 */
export interface SkeletonDimensions {
  width?: string;
  height?: string;
  maxWidth?: string;
  minHeight?: string;
}

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="skeleton-container" 
      [class]="getContainerClasses()"
      [ngSwitch]="type"
      [attr.aria-label]="'Загрузка содержимого'"
      [attr.aria-busy]="true">
      
      <!-- Task List Skeleton -->
      <div *ngSwitchCase="'task-list'" class="task-list-skeleton">
        <div *ngFor="let item of getArray(count)" class="task-card-skeleton">
          <div class="skeleton-header">
            <div class="skeleton-line skeleton-title"></div>
            <div class="skeleton-badge"></div>
          </div>
          <div class="skeleton-line skeleton-description"></div>
          <div class="skeleton-line skeleton-date"></div>
          <div class="skeleton-actions">
            <div class="skeleton-select"></div>
            <div class="skeleton-buttons">
              <div class="skeleton-button"></div>
              <div class="skeleton-button"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Task Detail Skeleton -->
      <div *ngSwitchCase="'task-detail'" class="task-detail-skeleton">
        <div class="skeleton-breadcrumb">
          <div class="skeleton-line skeleton-breadcrumb-item"></div>
        </div>
        <div class="skeleton-header">
          <div class="skeleton-line skeleton-title-large"></div>
          <div class="skeleton-badge"></div>
        </div>
        <div class="skeleton-content">
          <div class="skeleton-line skeleton-full"></div>
          <div class="skeleton-line skeleton-medium"></div>
          <div class="skeleton-line skeleton-small"></div>
        </div>
        <div class="skeleton-dates">
          <div class="skeleton-date-item">
            <div class="skeleton-line skeleton-date-label"></div>
            <div class="skeleton-line skeleton-date-value"></div>
          </div>
          <div class="skeleton-date-item">
            <div class="skeleton-line skeleton-date-label"></div>
            <div class="skeleton-line skeleton-date-value"></div>
          </div>
        </div>
        <div class="skeleton-actions">
          <div class="skeleton-button skeleton-primary"></div>
          <div class="skeleton-button skeleton-secondary"></div>
          <div class="skeleton-button skeleton-danger"></div>
        </div>
      </div>

      <!-- Form Skeleton -->
      <div *ngSwitchCase="'form'" class="form-skeleton">
        <div class="form-header-skeleton">
          <div class="skeleton-line skeleton-form-title"></div>
          <div class="skeleton-line skeleton-form-subtitle"></div>
        </div>
        <div *ngFor="let item of getArray(count)" class="form-field-skeleton">
          <div class="skeleton-label"></div>
          <div class="skeleton-input"></div>
        </div>
        <div class="form-actions-skeleton">
          <div class="skeleton-button skeleton-primary"></div>
          <div class="skeleton-button skeleton-secondary"></div>
        </div>
      </div>

      <!-- Header Skeleton -->
      <div *ngSwitchCase="'header'" class="header-skeleton">
        <div class="header-content">
          <div class="skeleton-line skeleton-logo"></div>
          <div class="header-nav">
            <div *ngFor="let item of getArray(4)" class="skeleton-nav-item"></div>
          </div>
          <div class="header-actions">
            <div class="skeleton-avatar"></div>
            <div class="skeleton-button"></div>
          </div>
        </div>
      </div>

      <!-- Sidebar Skeleton -->
      <div *ngSwitchCase="'sidebar'" class="sidebar-skeleton">
        <div class="sidebar-header">
          <div class="skeleton-line skeleton-sidebar-title"></div>
        </div>
        <div class="sidebar-menu">
          <div *ngFor="let item of getArray(6)" class="skeleton-menu-item">
            <div class="skeleton-icon"></div>
            <div class="skeleton-line skeleton-menu-text"></div>
          </div>
        </div>
      </div>

      <!-- Grid Skeleton -->
      <div *ngSwitchCase="'grid'" class="grid-skeleton">
        <div *ngFor="let item of getArray(count)" class="grid-item-skeleton">
          <div class="skeleton-image"></div>
          <div class="grid-content">
            <div class="skeleton-line skeleton-grid-title"></div>
            <div class="skeleton-line skeleton-grid-subtitle"></div>
            <div class="skeleton-line skeleton-grid-meta"></div>
          </div>
        </div>
      </div>

      <!-- Table Skeleton -->
      <div *ngSwitchCase="'table'" class="table-skeleton">
        <div class="table-header">
          <div *ngFor="let col of getArray(4)" class="skeleton-table-header"></div>
        </div>
        <div *ngFor="let row of getArray(count)" class="table-row">
          <div *ngFor="let col of getArray(4)" class="skeleton-table-cell"></div>
        </div>
      </div>

      <!-- Text Skeleton -->
      <div *ngSwitchCase="'text'" class="text-skeleton">
        <div *ngFor="let item of getArray(count)" 
             class="skeleton-line skeleton-text-line"
             [style.width]="getRandomWidth()"></div>
      </div>

      <!-- Custom Skeleton -->
      <div *ngSwitchDefault class="custom-skeleton">
        <div class="skeleton-line" 
             [style.width]="customDimensions?.width || '100%'"
             [style.height]="customDimensions?.height || '1rem'"
             [style.max-width]="customDimensions?.maxWidth"
             [style.min-height]="customDimensions?.minHeight"></div>
      </div>
    </div>
  `,
  styles: [`
    .skeleton-container {
      width: 100%;
      --skeleton-color-base: #f0f0f0;
      --skeleton-color-highlight: #e0e0e0;
      --skeleton-color-background: #fafafa;
    }

    /* Темы */
    .skeleton-theme-dark {
      --skeleton-color-base: #2a2a2a;
      --skeleton-color-highlight: #3a3a3a;
      --skeleton-color-background: #1a1a1a;
    }

    .skeleton-theme-auto {
      --skeleton-color-base: #f0f0f0;
      --skeleton-color-highlight: #e0e0e0;
      --skeleton-color-background: #fafafa;
    }

    @media (prefers-color-scheme: dark) {
      .skeleton-theme-auto {
        --skeleton-color-base: #2a2a2a;
        --skeleton-color-highlight: #3a3a3a;
        --skeleton-color-background: #1a1a1a;
      }
    }

    /* Базовые элементы скелетона */
    .skeleton-line {
      background: var(--skeleton-color-base);
      border-radius: var(--skeleton-border-radius, var(--radius-sm));
      height: 1rem;
      position: relative;
      overflow: hidden;
    }

    /* Анимации */
    .skeleton-animation-shimmer .skeleton-line {
      background: linear-gradient(
        90deg, 
        var(--skeleton-color-base) 25%, 
        var(--skeleton-color-highlight) 50%, 
        var(--skeleton-color-base) 75%
      );
      background-size: 200% 100%;
      animation: shimmer var(--skeleton-speed, 1.5s) infinite;
    }

    .skeleton-animation-pulse .skeleton-line {
      animation: pulse var(--skeleton-speed, 2s) ease-in-out infinite;
    }

    .skeleton-animation-wave .skeleton-line::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.4),
        transparent
      );
      animation: wave var(--skeleton-speed, 2s) infinite;
    }

    .skeleton-animation-fade .skeleton-line {
      animation: fade var(--skeleton-speed, 1.5s) ease-in-out infinite alternate;
    }

    /* Keyframes для анимаций */
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes wave {
      0% { left: -100%; }
      100% { left: 100%; }
    }

    @keyframes fade {
      0% { opacity: 0.3; }
      100% { opacity: 1; }
    }

    /* Скорости анимации */
    .skeleton-speed-slow {
      --skeleton-speed: 2.5s;
    }

    .skeleton-speed-normal {
      --skeleton-speed: 1.5s;
    }

    .skeleton-speed-fast {
      --skeleton-speed: 0.8s;
    }

    /* Радиусы границ */
    .skeleton-radius-none {
      --skeleton-border-radius: 0;
    }

    .skeleton-radius-small {
      --skeleton-border-radius: var(--radius-sm);
    }

    .skeleton-radius-medium {
      --skeleton-border-radius: var(--radius-md);
    }

    .skeleton-radius-large {
      --skeleton-border-radius: var(--radius-lg);
    }

    /* Градиент для улучшенного вида */
    .skeleton-gradient .skeleton-line {
      background: linear-gradient(
        135deg,
        var(--skeleton-color-base) 0%,
        var(--skeleton-color-highlight) 50%,
        var(--skeleton-color-base) 100%
      );
    }

    /* Размеры элементов */
    .skeleton-title { height: 1.5rem; width: 60%; }
    .skeleton-title-large { height: 2rem; width: 70%; }
    .skeleton-description { height: 1rem; width: 80%; margin-top: 0.5rem; }
    .skeleton-date { height: 0.875rem; width: 40%; }
    .skeleton-full { height: 1rem; width: 100%; margin-bottom: 0.5rem; }
    .skeleton-medium { height: 1rem; width: 75%; margin-bottom: 0.5rem; }
    .skeleton-small { height: 1rem; width: 50%; margin-bottom: 0.5rem; }
    .skeleton-text-line { height: 1rem; width: 90%; margin-bottom: 0.75rem; }

    /* Элементы формы */
    .skeleton-label { height: 1rem; width: 30%; margin-bottom: 0.5rem; }
    .skeleton-input { height: 2.5rem; width: 100%; border-radius: var(--radius-md); }
    .skeleton-select { height: 2.5rem; width: 200px; border-radius: var(--radius-md); }
    .skeleton-form-title { height: 1.8rem; width: 50%; margin-bottom: 0.5rem; }
    .skeleton-form-subtitle { height: 1rem; width: 70%; }

    /* Кнопки */
    .skeleton-button { 
      height: 2.25rem; 
      width: 100px; 
      border-radius: var(--radius-md); 
      margin-right: 0.5rem;
    }
    .skeleton-button.skeleton-primary { width: 120px; }
    .skeleton-button.skeleton-secondary { width: 100px; }
    .skeleton-button.skeleton-danger { width: 80px; }

    /* Бейджи и аватары */
    .skeleton-badge {
      height: 1.5rem;
      width: 80px;
      border-radius: var(--radius-lg);
    }

    .skeleton-avatar {
      height: 40px;
      width: 40px;
      border-radius: 50%;
    }

    /* Иконки и навигация */
    .skeleton-icon {
      height: 1.25rem;
      width: 1.25rem;
      border-radius: var(--radius-sm);
    }

    .skeleton-nav-item {
      height: 1.5rem;
      width: 80px;
      border-radius: var(--radius-md);
      margin-right: 1rem;
    }

    /* Хлебные крошки */
    .skeleton-breadcrumb {
      margin-bottom: 1rem;
    }
    .skeleton-breadcrumb-item {
      height: 1rem;
      width: 200px;
    }

    /* Элементы дат */
    .skeleton-date-label { height: 0.875rem; width: 60px; margin-bottom: 0.25rem; }
    .skeleton-date-value { height: 1rem; width: 120px; }

    /* Сетка и таблицы */
    .skeleton-image { height: 150px; width: 100%; border-radius: var(--radius-md); margin-bottom: 0.75rem; }
    .skeleton-grid-title { height: 1.25rem; width: 80%; margin-bottom: 0.5rem; }
    .skeleton-grid-subtitle { height: 1rem; width: 60%; margin-bottom: 0.25rem; }
    .skeleton-grid-meta { height: 0.875rem; width: 40%; }

    .skeleton-table-header { height: 1.5rem; width: 100%; margin-bottom: 0.5rem; }
    .skeleton-table-cell { height: 1.25rem; width: 100%; margin-bottom: 0.25rem; }

    /* Логотип и боковая панель */
    .skeleton-logo { height: 2rem; width: 120px; }
    .skeleton-sidebar-title { height: 1.5rem; width: 80%; margin-bottom: 1rem; }
    .skeleton-menu-text { height: 1rem; width: 100px; }

    /* Макеты */

    /* Task List Layout */
    .task-list-skeleton {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .task-card-skeleton {
      background: var(--skeleton-color-background);
      border: 1px solid var(--skeleton-color-base);
      border-radius: var(--radius-xl);
      padding: 1.5rem;
    }

    .skeleton-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
      gap: 1rem;
    }

    .skeleton-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--skeleton-color-base);
    }

    .skeleton-buttons {
      display: flex;
      gap: 0.5rem;
    }

    /* Task Detail Layout */
    .task-detail-skeleton {
      max-width: 800px;
      margin: 0 auto;
    }

    .skeleton-content {
      margin: 1.5rem 0;
    }

    .skeleton-dates {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin: 1.5rem 0;
    }

    .skeleton-date-item {
      background: var(--skeleton-color-background);
      padding: 1rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--skeleton-color-base);
    }

    /* Form Layout */
    .form-skeleton {
      max-width: 500px;
    }

    .form-header-skeleton {
      margin-bottom: 2rem;
      text-align: center;
    }

    .form-field-skeleton {
      margin-bottom: 1.5rem;
    }

    .form-actions-skeleton {
      display: flex;
      gap: 1rem;
      margin-top: 2rem;
      justify-content: center;
    }

    /* Header Layout */
    .header-skeleton {
      width: 100%;
      background: var(--skeleton-color-background);
      border-bottom: 1px solid var(--skeleton-color-base);
      padding: 1rem 2rem;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header-nav {
      display: flex;
      align-items: center;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    /* Sidebar Layout */
    .sidebar-skeleton {
      width: 250px;
      height: 100vh;
      background: var(--skeleton-color-background);
      border-right: 1px solid var(--skeleton-color-base);
      padding: 1.5rem;
    }

    .sidebar-menu {
      margin-top: 2rem;
    }

    .skeleton-menu-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
      padding: 0.5rem;
      border-radius: var(--radius-md);
      background: var(--skeleton-color-background);
    }

    /* Grid Layout */
    .grid-skeleton {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .grid-item-skeleton {
      background: var(--skeleton-color-background);
      border: 1px solid var(--skeleton-color-base);
      border-radius: var(--radius-lg);
      padding: 1rem;
    }

    .grid-content {
      margin-top: 0.75rem;
    }

    /* Table Layout */
    .table-skeleton {
      width: 100%;
      background: var(--skeleton-color-background);
      border: 1px solid var(--skeleton-color-base);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .table-header {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      padding: 1rem;
      background: var(--skeleton-color-base);
      border-bottom: 1px solid var(--skeleton-color-highlight);
    }

    .table-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      padding: 1rem;
      border-bottom: 1px solid var(--skeleton-color-base);
    }

    .table-row:last-child {
      border-bottom: none;
    }

    /* Text Layout */
    .text-skeleton {
      max-width: 600px;
    }

    /* Custom Layout */
    .custom-skeleton {
      padding: 1rem;
    }

    /* Адаптивный дизайн */
    @media (max-width: 768px) {
      .skeleton-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .skeleton-actions {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }

      .skeleton-buttons {
        flex-direction: column;
      }

      .skeleton-dates {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }

      .grid-skeleton {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
      }

      .header-content {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
      }

      .header-nav {
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .sidebar-skeleton {
        width: 200px;
        padding: 1rem;
      }

      .table-header,
      .table-row {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
        padding: 0.75rem;
      }
    }

    @media (max-width: 480px) {
      .task-card-skeleton {
        padding: 1rem;
      }

      .form-actions-skeleton {
        flex-direction: column;
        align-items: stretch;
      }

      .grid-skeleton {
        grid-template-columns: 1fr;
      }

      .table-header,
      .table-row {
        grid-template-columns: 1fr;
      }

      .sidebar-skeleton {
        width: 100%;
        height: auto;
        border-right: none;
        border-bottom: 1px solid var(--skeleton-color-base);
      }
    }

    /* Доступность */
    @media (prefers-reduced-motion: reduce) {
      .skeleton-line {
        animation: none !important;
      }
      
      .skeleton-line::before {
        animation: none !important;
      }
    }

    /* Фокус для доступности */
    .skeleton-container:focus {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }
  `]
})
export class LoadingSkeletonComponent {
  // ========== ВХОДНЫЕ ПАРАМЕТРЫ ==========
  @Input() type: SkeletonType = 'custom';
  @Input() count: number = 3;
  @Input() config: SkeletonConfig = {
    animation: 'shimmer',
    theme: 'auto',
    speed: 'normal',
    borderRadius: 'medium',
    showGradient: false
  };
  @Input() customDimensions?: SkeletonDimensions;

  // ========== ПРИВАТНЫЕ ПЕРЕМЕННЫЕ ==========
  private randomWidths = ['85%', '90%', '75%', '95%', '80%', '88%', '92%'];

  /**
   * Создать массив для *ngFor
   * @param count Количество элементов
   * @returns Массив индексов
   */
  getArray(count: number): number[] {
    return Array.from({ length: count }, (_, index) => index);
  }

  /**
   * Получить случайную ширину для более естественного вида текста
   * @returns Случайная ширина в процентах
   */
  getRandomWidth(): string {
    return this.randomWidths[Math.floor(Math.random() * this.randomWidths.length)];
  }

  /**
   * Сгенерировать CSS классы для контейнера
   * @returns Строка с CSS классами
   */
  getContainerClasses(): string {
    const classes = [
      `skeleton-theme-${this.config.theme}`,
      `skeleton-animation-${this.config.animation}`,
      `skeleton-speed-${this.config.speed}`,
      `skeleton-radius-${this.config.borderRadius}`
    ];

    if (this.config.showGradient) {
      classes.push('skeleton-gradient');
    }

    return classes.join(' ');
  }

  /**
   * Получить доступные типы скелетонов для отладки
   * @returns Массив доступных типов
   */
  static getAvailableTypes(): SkeletonType[] {
    return [
      'task-list', 'task-detail', 'form', 'text', 'header', 
      'sidebar', 'grid', 'table', 'custom'
    ];
  }

  /**
   * Получить конфигурацию по умолчанию
   * @returns Конфигурация по умолчанию
   */
  static getDefaultConfig(): SkeletonConfig {
    return {
      animation: 'shimmer',
      theme: 'auto',
      speed: 'normal',
      borderRadius: 'medium',
      showGradient: false
    };
  }

  /**
   * Создать конфигурацию для быстрого использования
   * @param type Тип скелетона
   * @returns Рекомендуемая конфигурация
   */
  static createConfigForType(type: SkeletonType): SkeletonConfig {
    const baseConfig = LoadingSkeletonComponent.getDefaultConfig();
    
    switch (type) {
      case 'task-list':
      case 'grid':
        return { ...baseConfig, animation: 'shimmer', speed: 'normal' };
      
      case 'task-detail':
      case 'form':
        return { ...baseConfig, animation: 'pulse', speed: 'slow' };
      
      case 'header':
      case 'sidebar':
        return { ...baseConfig, animation: 'wave', speed: 'fast' };
      
      case 'table':
        return { ...baseConfig, animation: 'fade', speed: 'normal' };
      
      case 'text':
        return { ...baseConfig, animation: 'shimmer', speed: 'fast', showGradient: true };
      
      default:
        return baseConfig;
    }
  }
} 