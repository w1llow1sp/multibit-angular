import { Pipe, PipeTransform, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Observable, map, distinctUntilChanged, shareReplay } from 'rxjs';

/**
 * Доступные форматы отображения даты
 */
export type DateFormat = 
  | 'relative' 
  | 'short' 
  | 'medium' 
  | 'full' 
  | 'time' 
  | 'date-only' 
  | 'iso' 
  | 'custom';

/**
 * Интерфейс для единицы относительного времени
 */
interface RelativeTimeUnit {
  unit: Intl.RelativeTimeFormatUnit;  // Единица времени
  ms: number;                         // Количество миллисекунд
  threshold: number;                  // Порог для использования этой единицы
}

/**
 * Конфигурация для кастомного форматирования
 */
export interface CustomDateConfig {
  pattern?: string;                   // Шаблон для кастомного формата
  timezone?: string;                  // Временная зона
  locale?: string;                    // Локаль (по умолчанию 'ru')
  showSeconds?: boolean;              // Показывать секунды
  use24Hour?: boolean;               // Использовать 24-часовой формат
  showTimezone?: boolean;            // Показывать временную зону
  relativeThreshold?: number;        // Порог для относительного времени (в часах)
}

/**
 * Интерфейс результата форматирования
 */
export interface FormattedDateResult {
  formatted: string;                 // Отформатированная строка
  isRelative: boolean;              // Является ли относительной датой
  timestamp: number;                // Timestamp исходной даты
  format: DateFormat;               // Использованный формат
  locale: string;                   // Использованная локаль
}

/**
 * Кеш для результатов форматирования
 */
interface DateCache {
  [key: string]: {
    result: FormattedDateResult;
    timestamp: number;
    ttl: number;
  };
}

/**
 * Улучшенный Pipe для форматирования дат на русском языке
 * Поддерживает кеширование, временные зоны, кастомные форматы и валидацию
 */
@Pipe({
  name: 'russianDate',
  standalone: true,
  pure: false // Делаем impure для обновления относительных дат
})
export class RussianDatePipe implements PipeTransform, OnDestroy {
  // ========== КОНСТАНТЫ ==========
  
  /**
   * Единицы времени для относительного форматирования
   * Отсортированы от больших к меньшим с улучшенными порогами
   */
  private readonly relativeTimeUnits: RelativeTimeUnit[] = [
    { unit: 'year', ms: 365.25 * 24 * 60 * 60 * 1000, threshold: 365 },
    { unit: 'month', ms: 30.44 * 24 * 60 * 60 * 1000, threshold: 30 },
    { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000, threshold: 7 },
    { unit: 'day', ms: 24 * 60 * 60 * 1000, threshold: 1 },
    { unit: 'hour', ms: 60 * 60 * 1000, threshold: 1 },
    { unit: 'minute', ms: 60 * 1000, threshold: 1 },
    { unit: 'second', ms: 1000, threshold: 1 }
  ];

  /**
   * Названия месяцев в разных падежах
   */
  private readonly monthNames = {
    nominative: [
      'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
      'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
    ],
    genitive: [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ],
    short: [
      'янв', 'фев', 'мар', 'апр', 'май', 'июн',
      'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'
    ]
  };

  /**
   * Названия дней недели
   */
  private readonly weekdays = {
    full: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
    short: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
    abbreviated: ['вск', 'пнд', 'втр', 'срд', 'чтв', 'птн', 'сбт']
  };

  // ========== ПРИВАТНЫЕ СВОЙСТВА ==========
  
  private readonly cache: DateCache = {};
  private readonly cacheTimeout = 60000; // 1 минута для кеша
  private readonly maxCacheSize = 100;
  private updateInterval?: number;
  private readonly cacheKeys = new Set<string>();

  // ========== КОНСТРУКТОР ==========
  
  constructor() {
    // Очищаем кеш каждые 5 минут
    this.updateInterval = window.setInterval(() => {
      this.cleanupCache();
    }, 300000);
  }

  ngOnDestroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.clearCache();
  }

  // ========== ОСНОВНЫЕ МЕТОДЫ ==========

  /**
   * Основной метод преобразования даты
   * @param value Дата в виде строки, числа или объекта Date
   * @param format Формат отображения
   * @param config Дополнительная конфигурация
   * @returns Отформатированная строка даты или объект результата
   */
  transform(
    value: string | Date | number | null | undefined,
    format: DateFormat = 'relative',
    config?: CustomDateConfig
  ): string {
    if (!this.isValidInput(value)) {
      return this.handleInvalidDate(value);
    }

    const date = this.parseDate(value);
    if (!date || isNaN(date.getTime())) {
      return this.handleInvalidDate(value);
    }

    // Создаем ключ для кеширования
    const cacheKey = this.createCacheKey(date, format, config);
    
    // Проверяем кеш для неотносительных дат
    if (format !== 'relative') {
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        return cached.result.formatted;
      }
    }

    const result = this.formatDate(date, format, config);
    
    // Кешируем результат (кроме относительных дат)
    if (format !== 'relative') {
      this.setCachedResult(cacheKey, result);
    }

    return result.formatted;
  }

  /**
   * Получить полный результат форматирования
   * @param value Дата для форматирования
   * @param format Формат отображения
   * @param config Дополнительная конфигурация
   * @returns Полный объект результата
   */
  transformDetailed(
    value: string | Date | number | null | undefined,
    format: DateFormat = 'relative',
    config?: CustomDateConfig
  ): FormattedDateResult | null {
    if (!this.isValidInput(value)) {
      return null;
    }

    const date = this.parseDate(value);
    if (!date || isNaN(date.getTime())) {
      return null;
    }

    return this.formatDate(date, format, config);
  }

  // ========== МЕТОДЫ ФОРМАТИРОВАНИЯ ==========

  /**
   * Форматировать дату согласно выбранному формату
   * @param date Дата для форматирования
   * @param format Формат отображения
   * @param config Дополнительная конфигурация
   * @returns Объект результата форматирования
   */
  private formatDate(date: Date, format: DateFormat, config?: CustomDateConfig): FormattedDateResult {
    const baseResult: FormattedDateResult = {
      formatted: '',
      isRelative: false,
      timestamp: date.getTime(),
      format,
      locale: config?.locale || 'ru'
    };

    switch (format) {
      case 'relative':
        return {
          ...baseResult,
          formatted: this.getRelativeTime(date, config),
          isRelative: true
        };
      
      case 'short':
        return {
          ...baseResult,
          formatted: this.getShortFormat(date, config)
        };
      
      case 'medium':
        return {
          ...baseResult,
          formatted: this.getMediumFormat(date, config)
        };
      
      case 'full':
        return {
          ...baseResult,
          formatted: this.getFullFormat(date, config)
        };
      
      case 'time':
        return {
          ...baseResult,
          formatted: this.getTimeFormat(date, config)
        };
      
      case 'date-only':
        return {
          ...baseResult,
          formatted: this.getDateOnlyFormat(date, config)
        };
      
      case 'iso':
        return {
          ...baseResult,
          formatted: date.toISOString()
        };
      
      case 'custom':
        return {
          ...baseResult,
          formatted: this.getCustomFormat(date, config)
        };
      
      default:
        return {
          ...baseResult,
          formatted: this.getRelativeTime(date, config),
          isRelative: true
        };
    }
  }

  /**
   * Получить относительное время с улучшенной логикой
   * @param date Дата для обработки
   * @param config Дополнительная конфигурация
   * @returns Строка относительного времени
   */
  private getRelativeTime(date: Date, config?: CustomDateConfig): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const thresholdMs = (config?.relativeThreshold || 48) * 60 * 60 * 1000; // 48 часов по умолчанию

    // Если разница больше порога, используем абсолютный формат
    if (Math.abs(diffMs) > thresholdMs) {
      return this.getShortFormat(date, config);
    }

    // Будущие даты
    if (diffMs < 0) {
      const futureDiff = Math.abs(diffMs);
      
      if (futureDiff < 60000) { // Меньше 1 минуты
        return 'через несколько секунд';
      }

      for (const { unit, ms } of this.relativeTimeUnits) {
        const value = Math.floor(futureDiff / ms);
        if (value >= 1) {
          return this.formatRelative(value, unit);
        }
      }
      return 'сейчас';
    }

    // Прошедшие даты
    if (diffMs < 30000) { // Меньше 30 секунд
      return 'только что';
    }

    if (diffMs < 60000) { // Меньше 1 минуты
      return 'менее минуты назад';
    }

    for (const { unit, ms } of this.relativeTimeUnits) {
      const value = Math.floor(diffMs / ms);
      if (value >= 1) {
        return this.formatRelative(-value, unit);
      }
    }

    return 'только что';
  }

  /**
   * Форматировать относительное время используя Intl.RelativeTimeFormat
   * @param value Числовое значение
   * @param unit Единица времени
   * @returns Отформатированная строка
   */
  private formatRelative(value: number, unit: Intl.RelativeTimeFormatUnit): string {
    try {
      const rtf = new Intl.RelativeTimeFormat('ru', { 
        numeric: 'auto',
        style: 'long'
      });
      return rtf.format(value, unit);
    } catch (error) {
      console.warn('Ошибка форматирования относительного времени:', error);
      return this.getFallbackRelativeFormat(value, unit);
    }
  }

  /**
   * Fallback для относительного форматирования
   * @param value Числовое значение
   * @param unit Единица времени
   * @returns Отформатированная строка
   */
     private getFallbackRelativeFormat(value: number, unit: Intl.RelativeTimeFormatUnit): string {
     const absValue = Math.abs(value);
     const isNegative = value < 0;
     
     const templates: Partial<Record<Intl.RelativeTimeFormatUnit, { singular: string; plural: string; }>> = {
       second: { singular: 'секунду', plural: 'секунд' },
       seconds: { singular: 'секунду', plural: 'секунд' },
       minute: { singular: 'минуту', plural: 'минут' },
       minutes: { singular: 'минуту', plural: 'минут' },
       hour: { singular: 'час', plural: 'часов' },
       hours: { singular: 'час', plural: 'часов' },
       day: { singular: 'день', plural: 'дней' },
       days: { singular: 'день', plural: 'дней' },
       week: { singular: 'неделю', plural: 'недель' },
       weeks: { singular: 'неделю', plural: 'недель' },
       month: { singular: 'месяц', plural: 'месяцев' },
       months: { singular: 'месяц', plural: 'месяцев' },
       quarter: { singular: 'квартал', plural: 'кварталов' },
       quarters: { singular: 'квартал', plural: 'кварталов' },
       year: { singular: 'год', plural: 'лет' },
       years: { singular: 'год', plural: 'лет' }
     };

    const template = templates[unit];
    if (!template) return `${value} ${unit}`;

    const unitName = this.pluralize(absValue, template.singular, template.plural);
    
    if (isNegative) {
      return `${absValue} ${unitName} назад`;
    } else {
      return `через ${absValue} ${unitName}`;
    }
  }

  /**
   * Получить короткий формат даты с улучшениями
   * @param date Дата для форматирования
   * @param config Дополнительная конфигурация
   * @returns Короткая строка даты
   */
  private getShortFormat(date: Date, config?: CustomDateConfig): string {
    const day = date.getDate();
    const month = this.monthNames.short[date.getMonth()];
    const year = date.getFullYear();
    const currentYear = new Date().getFullYear();

    if (config?.timezone) {
      const timeZoneDate = new Date(date.toLocaleString('en-US', { timeZone: config.timezone }));
      const tzDay = timeZoneDate.getDate();
      const tzMonth = this.monthNames.short[timeZoneDate.getMonth()];
      const tzYear = timeZoneDate.getFullYear();
      
      if (tzYear === currentYear) {
        return `${tzDay} ${tzMonth}`;
      }
      return `${tzDay} ${tzMonth} ${tzYear}`;
    }

    if (year === currentYear) {
      return `${day} ${month}`;
    }
    return `${day} ${month} ${year}`;
  }

  /**
   * Получить средний формат даты с улучшениями
   * @param date Дата для форматирования
   * @param config Дополнительная конфигурация
   * @returns Средняя строка даты с временем
   */
  private getMediumFormat(date: Date, config?: CustomDateConfig): string {
    const day = date.getDate();
    const month = this.monthNames.genitive[date.getMonth()];
    const year = date.getFullYear();
    
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    const timeStr = config?.use24Hour !== false ? 
      `${hours.toString().padStart(2, '0')}:${minutes}` :
      this.formatTime12Hour(hours, parseInt(minutes));

    let result = `${day} ${month} ${year}, ${timeStr}`;

    if (config?.showSeconds) {
      const seconds = date.getSeconds().toString().padStart(2, '0');
      result = result.replace(timeStr, `${timeStr}:${seconds}`);
    }

    if (config?.showTimezone && config?.timezone) {
      result += ` (${config.timezone})`;
    }

    return result;
  }

  /**
   * Получить полный формат даты с улучшениями
   * @param date Дата для форматирования
   * @param config Дополнительная конфигурация
   * @returns Полная строка даты с днем недели и секундами
   */
  private getFullFormat(date: Date, config?: CustomDateConfig): string {
    const weekday = this.weekdays.full[date.getDay()];
    const day = date.getDate();
    const month = this.monthNames.genitive[date.getMonth()];
    const year = date.getFullYear();
    
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    const timeStr = config?.use24Hour !== false ? 
      `${hours.toString().padStart(2, '0')}:${minutes}:${seconds}` :
      this.formatTime12Hour(hours, parseInt(minutes), parseInt(seconds));

    let result = `${weekday}, ${day} ${month} ${year} года, ${timeStr}`;

    if (config?.showTimezone && config?.timezone) {
      result += ` (${config.timezone})`;
    }

    return result;
  }

  /**
   * Получить только время
   * @param date Дата для форматирования
   * @param config Дополнительная конфигурация
   * @returns Строка времени
   */
  private getTimeFormat(date: Date, config?: CustomDateConfig): string {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    let timeStr = config?.use24Hour !== false ? 
      `${hours.toString().padStart(2, '0')}:${minutes}` :
      this.formatTime12Hour(hours, parseInt(minutes));

    if (config?.showSeconds) {
      const seconds = date.getSeconds().toString().padStart(2, '0');
      timeStr += `:${seconds}`;
    }

    return timeStr;
  }

  /**
   * Получить только дату без времени
   * @param date Дата для форматирования
   * @param config Дополнительная конфигурация
   * @returns Строка даты
   */
  private getDateOnlyFormat(date: Date, config?: CustomDateConfig): string {
    const day = date.getDate();
    const month = this.monthNames.genitive[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  }

  /**
   * Получить кастомный формат даты
   * @param date Дата для форматирования
   * @param config Дополнительная конфигурация
   * @returns Отформатированная строка согласно шаблону
   */
  private getCustomFormat(date: Date, config?: CustomDateConfig): string {
    if (!config?.pattern) {
      return this.getMediumFormat(date, config);
    }

    const formatters: Record<string, () => string> = {
      'YYYY': () => date.getFullYear().toString(),
      'YY': () => date.getFullYear().toString().slice(-2),
      'MM': () => (date.getMonth() + 1).toString().padStart(2, '0'),
      'MMM': () => this.monthNames.short[date.getMonth()],
      'MMMM': () => this.monthNames.genitive[date.getMonth()],
      'DD': () => date.getDate().toString().padStart(2, '0'),
      'D': () => date.getDate().toString(),
      'HH': () => date.getHours().toString().padStart(2, '0'),
      'H': () => date.getHours().toString(),
      'mm': () => date.getMinutes().toString().padStart(2, '0'),
      'm': () => date.getMinutes().toString(),
      'ss': () => date.getSeconds().toString().padStart(2, '0'),
      's': () => date.getSeconds().toString(),
      'dddd': () => this.weekdays.full[date.getDay()],
      'ddd': () => this.weekdays.abbreviated[date.getDay()],
      'dd': () => this.weekdays.short[date.getDay()]
    };

    let result = config.pattern;
    Object.entries(formatters).forEach(([pattern, formatter]) => {
      result = result.replace(new RegExp(pattern, 'g'), formatter());
    });

    return result;
  }

  // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

  /**
   * Проверить валидность входных данных
   * @param value Входное значение
   * @returns true если валидно
   */
  private isValidInput(value: any): boolean {
    return value !== null && value !== undefined && value !== '';
  }

  /**
   * Парсить дату из различных форматов
   * @param value Входное значение
   * @returns Объект Date или null
   */
  private parseDate(value: string | Date | number | null | undefined): Date | null {
    if (!value) return null;

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'number') {
      return new Date(value);
    }

    if (typeof value === 'string') {
      // Пробуем различные форматы
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }

      // Пробуем ISO формат
      const isoMatch = value.match(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/);
      if (isoMatch) {
        return new Date(value);
      }

      // Пробуем timestamp
      const timestamp = parseInt(value, 10);
      if (!isNaN(timestamp) && timestamp > 0) {
        return new Date(timestamp);
      }
    }

    return null;
  }

  /**
   * Обработать невалидную дату
   * @param value Исходное значение
   * @returns Строка ошибки
   */
  private handleInvalidDate(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    return 'Неверная дата';
  }

  /**
   * Форматировать время в 12-часовом формате
   * @param hours Часы
   * @param minutes Минуты
   * @param seconds Секунды (опционально)
   * @returns Отформатированное время
   */
  private formatTime12Hour(hours: number, minutes: number, seconds?: number): string {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    
    let result = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    
    if (seconds !== undefined) {
      result = result.replace(' ' + period, `:${seconds.toString().padStart(2, '0')} ${period}`);
    }
    
    return result;
  }

  /**
   * Плюрализация русских слов
   * @param count Количество
   * @param singular Единственное число
   * @param plural Множественное число
   * @returns Правильная форма слова
   */
  private pluralize(count: number, singular: string, plural: string): string {
    if (count % 10 === 1 && count % 100 !== 11) {
      return singular;
    }
    return plural;
  }

  // ========== МЕТОДЫ КЕШИРОВАНИЯ ==========

  /**
   * Создать ключ для кеширования
   * @param date Дата
   * @param format Формат
   * @param config Конфигурация
   * @returns Ключ для кеша
   */
  private createCacheKey(date: Date, format: DateFormat, config?: CustomDateConfig): string {
    const timestamp = date.getTime();
    const configStr = JSON.stringify(config || {});
    return `${timestamp}-${format}-${configStr}`;
  }

  /**
   * Получить результат из кеша
   * @param key Ключ кеша
   * @returns Закешированный результат или null
   */
  private getCachedResult(key: string): { result: FormattedDateResult } | null {
    const cached = this.cache[key];
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      delete this.cache[key];
      this.cacheKeys.delete(key);
      return null;
    }

    return cached;
  }

  /**
   * Сохранить результат в кеш
   * @param key Ключ кеша
   * @param result Результат для кеширования
   */
  private setCachedResult(key: string, result: FormattedDateResult): void {
    // Проверяем лимит кеша
    if (this.cacheKeys.size >= this.maxCacheSize) {
      this.clearOldestCacheEntries();
    }

    this.cache[key] = {
      result,
      timestamp: Date.now(),
      ttl: this.cacheTimeout
    };
    this.cacheKeys.add(key);
  }

  /**
   * Очистить старые записи кеша
   */
  private clearOldestCacheEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const key of this.cacheKeys) {
      const cached = this.cache[key];
      if (!cached || now - cached.timestamp > cached.ttl) {
        keysToDelete.push(key);
      }
    }

    // Удаляем 20% старых записей
    if (keysToDelete.length === 0) {
      const allKeys = Array.from(this.cacheKeys);
      const deleteCount = Math.floor(allKeys.length * 0.2);
      keysToDelete.push(...allKeys.slice(0, deleteCount));
    }

    keysToDelete.forEach(key => {
      delete this.cache[key];
      this.cacheKeys.delete(key);
    });
  }

  /**
   * Очистить весь кеш
   */
  private clearCache(): void {
    Object.keys(this.cache).forEach(key => delete this.cache[key]);
    this.cacheKeys.clear();
  }

  /**
   * Очистить устаревшие записи кеша
   */
  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const key of this.cacheKeys) {
      const cached = this.cache[key];
      if (!cached || now - cached.timestamp > cached.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      delete this.cache[key];
      this.cacheKeys.delete(key);
    });
  }

  // ========== СТАТИЧЕСКИЕ МЕТОДЫ ==========

  /**
   * Создать конфигурацию для быстрого использования
   * @param options Опции конфигурации
   * @returns Готовая конфигурация
   */
  static createConfig(options: Partial<CustomDateConfig> = {}): CustomDateConfig {
    return {
      timezone: 'Europe/Moscow',
      locale: 'ru',
      showSeconds: false,
      use24Hour: true,
      showTimezone: false,
      relativeThreshold: 48,
      ...options
    };
  }

  /**
   * Получить список доступных форматов
   * @returns Массив доступных форматов
   */
  static getAvailableFormats(): DateFormat[] {
    return ['relative', 'short', 'medium', 'full', 'time', 'date-only', 'iso', 'custom'];
  }

  /**
   * Валидировать дату
   * @param value Значение для проверки
   * @returns true если дата валидна
   */
  static isValidDate(value: any): boolean {
    if (!value) return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
} 