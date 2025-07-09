import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Доступные названия иконок
 */
export type IconName = 
  | 'plus' | 'x' | 'check' | 'edit' | 'trash' | 'arrow-right' | 'arrow-left' 
  | 'clock' | 'calendar' | 'info' | 'settings' | 'search' | 'filter'
  | 'sort-asc' | 'sort-desc' | 'menu' | 'home' | 'user' | 'star' | 'heart'
  | 'download' | 'upload' | 'refresh' | 'copy' | 'share' | 'bookmark'
  | 'bell' | 'mail' | 'phone' | 'lock' | 'unlock' | 'eye' | 'eye-off'
  | 'file' | 'folder' | 'image' | 'video' | 'music' | 'link'
  | 'globe' | 'wifi' | 'battery' | 'power' | 'volume' | 'microphone';

/**
 * Доступные цвета иконок
 */
export type IconColor = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'muted' | 'white';

/**
 * Типы анимации для иконок
 */
export type IconAnimation = 'none' | 'spin' | 'pulse' | 'bounce' | 'shake';

/**
 * Универсальный компонент иконок
 * Отображает иконки используя Unicode символы с настраиваемым размером, цветом и анимацией
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span 
      class="icon"
      [class]="getIconClasses()"
      [style.fontSize.px]="size"
      [style.width.px]="size"
      [style.height.px]="size"
      [attr.aria-hidden]="ariaHidden"
      [attr.aria-label]="ariaLabel"
      [attr.role]="ariaLabel ? 'img' : null"
      [attr.title]="title">
      {{ getIconChar() }}
    </span>
  `,
  styles: [`
    .icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      user-select: none;
      font-family: system-ui, -apple-system, sans-serif;
      font-weight: bold;
      line-height: 1;
      transition: all var(--transition-fast);
      vertical-align: middle;
      flex-shrink: 0;
    }

    /* Цвета иконок */
    .icon-color-primary { color: var(--primary); }
    .icon-color-secondary { color: var(--text-secondary); }
    .icon-color-success { color: var(--success); }
    .icon-color-danger { color: var(--danger); }
    .icon-color-warning { color: var(--warning); }
    .icon-color-muted { color: var(--text-muted); }
    .icon-color-white { color: #ffffff; }

    /* Интерактивные состояния */
    .icon-interactive {
      cursor: pointer;
      border-radius: var(--radius-sm);
      padding: 2px;
    }

    .icon-interactive:hover {
      background: var(--gray-100);
      transform: scale(1.1);
    }

    .icon-interactive:active {
      transform: scale(0.95);
    }

    /* Анимации */
    .icon-animation-spin {
      animation: icon-spin 1s linear infinite;
    }

    .icon-animation-pulse {
      animation: icon-pulse 2s ease-in-out infinite;
    }

    .icon-animation-bounce {
      animation: icon-bounce 1s ease-in-out infinite;
    }

    .icon-animation-shake {
      animation: icon-shake 0.82s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite;
    }

    /* Keyframes для анимаций */
    @keyframes icon-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes icon-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes icon-bounce {
      0%, 20%, 53%, 80%, 100% {
        animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
        transform: translate3d(0, 0, 0);
      }
      40%, 43% {
        animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
        transform: translate3d(0, -30%, 0);
      }
      70% {
        animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
        transform: translate3d(0, -15%, 0);
      }
      90% {
        transform: translate3d(0, -4%, 0);
      }
    }

    @keyframes icon-shake {
      10%, 90% {
        transform: translate3d(-1px, 0, 0);
      }
      20%, 80% {
        transform: translate3d(2px, 0, 0);
      }
      30%, 50%, 70% {
        transform: translate3d(-4px, 0, 0);
      }
      40%, 60% {
        transform: translate3d(4px, 0, 0);
      }
    }

    /* Размеры с фиксированными значениями для лучшей производительности */
    .icon-size-12 { width: 12px; height: 12px; min-width: 12px; }
    .icon-size-14 { width: 14px; height: 14px; min-width: 14px; }
    .icon-size-16 { width: 16px; height: 16px; min-width: 16px; }
    .icon-size-18 { width: 18px; height: 18px; min-width: 18px; }
    .icon-size-20 { width: 20px; height: 20px; min-width: 20px; }
    .icon-size-24 { width: 24px; height: 24px; min-width: 24px; }
    .icon-size-28 { width: 28px; height: 28px; min-width: 28px; }
    .icon-size-32 { width: 32px; height: 32px; min-width: 32px; }
    .icon-size-48 { width: 48px; height: 48px; min-width: 48px; }

    /* Доступность */
    @media (prefers-reduced-motion: reduce) {
      .icon {
        animation: none !important;
        transition: none !important;
      }
    }
  `]
})
export class IconComponent {
  // ========== ВХОДНЫЕ ПАРАМЕТРЫ ==========
  @Input() name: IconName = 'info';              // Название иконки
  @Input() size: number = 16;                    // Размер в пикселях
  @Input() color: IconColor = 'secondary';       // Цвет иконки
  @Input() animation: IconAnimation = 'none';    // Анимация иконки
  @Input() interactive: boolean = false;         // Интерактивность (hover эффекты)
  @Input() ariaLabel: string = '';               // Aria-label для accessibility
  @Input() ariaHidden: boolean = true;           // Скрывать от screen readers
  @Input() title: string = '';                   // Всплывающая подсказка

  /**
   * Расширенный маппинг названий иконок на Unicode символы
   */
  private iconMap: Record<IconName, string> = {
    // ========== ОСНОВНЫЕ ДЕЙСТВИЯ ==========
    'plus': '+',
    'x': '×',
    'check': '✓',
    'edit': '✎',
    'trash': '🗑',
    'refresh': '↻',
    'copy': '📋',
    'share': '📤',
    
    // ========== НАВИГАЦИЯ ==========
    'arrow-right': '→',
    'arrow-left': '←',
    'home': '🏠',
    'menu': '☰',
    
    // ========== ВРЕМЯ И КАЛЕНДАРЬ ==========
    'clock': '⏰',
    'calendar': '📅',
    
    // ========== ИНФОРМАЦИЯ ==========
    'info': 'ℹ',
    'settings': '⚙',
    'star': '⭐',
    'heart': '♥',
    'bookmark': '🔖',
    
    // ========== ПОИСК И ФИЛЬТРЫ ==========
    'search': '🔍',
    'filter': '⚗',
    'sort-asc': '↑',
    'sort-desc': '↓',
    
    // ========== ПОЛЬЗОВАТЕЛЬ ==========
    'user': '👤',
    'bell': '🔔',
    'mail': '✉',
    'phone': '📞',
    
    // ========== ФАЙЛЫ И МЕДИА ==========
    'download': '⬇',
    'upload': '⬆',
    'file': '📄',
    'folder': '📁',
    'image': '🖼',
    'video': '🎥',
    'music': '🎵',
    'link': '🔗',
    
    // ========== БЕЗОПАСНОСТЬ ==========
    'lock': '🔒',
    'unlock': '🔓',
    'eye': '👁',
    'eye-off': '🙈',
    
    // ========== СИСТЕМА ==========
    'globe': '🌐',
    'wifi': '📶',
    'battery': '🔋',
    'power': '⚡',
    'volume': '🔊',
    'microphone': '🎤'
  };

  /**
   * Получить Unicode символ для иконки
   * @returns Символ иконки или символ 'info' по умолчанию
   */
  getIconChar(): string {
    return this.iconMap[this.name] || this.iconMap['info'];
  }

  /**
   * Сгенерировать CSS классы для иконки
   * @returns Строка с CSS классами
   */
  getIconClasses(): string {
    const classes = [
      `icon-color-${this.color}`,
      `icon-size-${this.size}`
    ];

    if (this.animation !== 'none') {
      classes.push(`icon-animation-${this.animation}`);
    }

    if (this.interactive) {
      classes.push('icon-interactive');
    }

    return classes.join(' ');
  }

  /**
   * Получить доступные иконки для отладки
   * @returns Массив названий всех доступных иконок
   */
  static getAvailableIcons(): IconName[] {
    return [
      'plus', 'x', 'check', 'edit', 'trash', 'arrow-right', 'arrow-left',
      'clock', 'calendar', 'info', 'settings', 'search', 'filter',
      'sort-asc', 'sort-desc', 'menu', 'home', 'user', 'star', 'heart',
      'download', 'upload', 'refresh', 'copy', 'share', 'bookmark',
      'bell', 'mail', 'phone', 'lock', 'unlock', 'eye', 'eye-off',
      'file', 'folder', 'image', 'video', 'music', 'link',
      'globe', 'wifi', 'battery', 'power', 'volume', 'microphone'
    ];
  }
} 