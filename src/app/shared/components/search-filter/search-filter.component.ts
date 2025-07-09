import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskStatus } from '../../models/task.model';
import { IconComponent, type IconName } from '../icon/icon.component';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

/**
 * Расширенные опции поиска и фильтрации
 */
export interface SearchFilterOptions {
  searchTerm: string;
  statusFilter: TaskStatus | 'all';
  sortBy: 'title' | 'createdAt' | 'updatedAt' | 'status';
  sortOrder: 'asc' | 'desc';
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  quickFilter?: 'today' | 'week' | 'month' | 'overdue' | 'none';
}

/**
 * Пресеты для быстрых фильтров
 */
export interface FilterPreset {
  id: string;
  name: string;
  icon: IconName;
  options: Partial<SearchFilterOptions>;
}

/**
 * Конфигурация компонента фильтров
 */
export interface SearchFilterConfig {
  enableDateFilter: boolean;
  enableQuickFilters: boolean;
  enablePresets: boolean;
  saveState: boolean;
  debounceMs: number;
  storageKey: string;
}

@Component({
  selector: 'app-search-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="search-filter-container">
      <!-- Search Input -->
      <div class="search-input-container">
        <app-icon name="search" [size]="18" color="secondary"></app-icon>
        <input
          type="text"
          class="search-input"
          placeholder="Поиск задач..."
          [(ngModel)]="searchTerm"
          (input)="onSearchInput($event)"
          [attr.aria-label]="'Поиск задач'">
        <button 
          *ngIf="searchTerm"
          class="clear-search-btn"
          (click)="clearSearch()"
          [attr.aria-label]="'Очистить поиск'">
          <app-icon name="x" [size]="16" color="secondary" [interactive]="true"></app-icon>
        </button>
      </div>

      <!-- Quick Filters -->
      <div class="quick-filters" *ngIf="config.enableQuickFilters">
        <div class="quick-filter-group">
          <span class="filter-label">
            <app-icon name="filter" [size]="16" color="secondary"></app-icon>
            Быстрые фильтры:
          </span>
          <div class="quick-filter-buttons">
            <button 
              *ngFor="let filter of quickFilters"
              class="quick-filter-btn"
              [class.active]="currentOptions.quickFilter === filter.id"
              (click)="applyQuickFilter(filter.id)"
              [attr.aria-label]="filter.name">
              <app-icon [name]="filter.icon" [size]="14"></app-icon>
              {{ filter.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- Main Filter Controls -->
      <div class="filter-controls">
        <!-- Status Filter -->
        <div class="filter-group">
          <label class="filter-label">
            <app-icon name="info" [size]="16" color="secondary"></app-icon>
            Статус:
          </label>
          <select 
            class="filter-select"
            [(ngModel)]="currentOptions.statusFilter"
            (change)="onFiltersChange()"
            [attr.aria-label]="'Фильтр по статусу'">
            <option value="all">Все статусы</option>
            <option [value]="TaskStatus.TODO">К выполнению</option>
            <option [value]="TaskStatus.IN_PROGRESS">В процессе</option>
            <option [value]="TaskStatus.COMPLETED">Выполнено</option>
          </select>
        </div>

        <!-- Sort Controls -->
        <div class="filter-group">
          <label class="filter-label">
            <app-icon name="sort-asc" [size]="16" color="secondary"></app-icon>
            Сортировка:
          </label>
          <select 
            class="filter-select"
            [(ngModel)]="currentOptions.sortBy"
            (change)="onFiltersChange()"
            [attr.aria-label]="'Сортировка по полю'">
            <option value="createdAt">По дате создания</option>
            <option value="updatedAt">По дате изменения</option>
            <option value="title">По названию</option>
            <option value="status">По статусу</option>
          </select>
          
          <button 
            class="sort-order-btn"
            (click)="toggleSortOrder()"
            [class.active]="currentOptions.sortOrder === 'desc'"
            [attr.aria-label]="'Порядок сортировки: ' + (currentOptions.sortOrder === 'asc' ? 'по возрастанию' : 'по убыванию')">
            <app-icon 
              [name]="currentOptions.sortOrder === 'asc' ? 'sort-asc' : 'sort-desc'" 
              [size]="16" 
              [color]="currentOptions.sortOrder === 'desc' ? 'primary' : 'secondary'"
              [interactive]="true">
            </app-icon>
          </button>
        </div>

        <!-- Date Range Filter -->
        <div class="filter-group" *ngIf="config.enableDateFilter">
          <label class="filter-label">
            <app-icon name="calendar" [size]="16" color="secondary"></app-icon>
            Период:
          </label>
          <div class="date-range-inputs">
            <input 
              type="date"
              class="date-input"
              [(ngModel)]="dateFromString"
              (change)="onDateRangeChange()"
              placeholder="От"
              [attr.aria-label]="'Дата от'">
            <span class="date-separator">—</span>
            <input 
              type="date"
              class="date-input"
              [(ngModel)]="dateToString"
              (change)="onDateRangeChange()"
              placeholder="До"
              [attr.aria-label]="'Дата до'">
          </div>
        </div>
      </div>

      <!-- Filter Presets -->
      <div class="filter-presets" *ngIf="config.enablePresets && filterPresets.length > 0">
        <div class="preset-group">
          <span class="filter-label">
            <app-icon name="bookmark" [size]="16" color="secondary"></app-icon>
            Пресеты:
          </span>
          <div class="preset-buttons">
            <button 
              *ngFor="let preset of filterPresets"
              class="preset-btn"
              (click)="applyPreset(preset)"
              [attr.aria-label]="'Применить пресет: ' + preset.name">
              <app-icon [name]="preset.icon" [size]="14"></app-icon>
              {{ preset.name }}
            </button>
            <button 
              class="preset-btn preset-save-btn"
              (click)="saveCurrentAsPreset()"
              [disabled]="!hasActiveFilters()"
              [attr.aria-label]="'Сохранить текущие настройки как пресет'">
              <app-icon name="plus" [size]="14"></app-icon>
              Сохранить
            </button>
          </div>
        </div>
      </div>

      <!-- Results Info and Actions -->
      <div class="results-info" *ngIf="totalTasks > 0">
        <div class="results-text">
          <app-icon name="info" [size]="14" color="secondary"></app-icon>
          Показано {{ filteredCount }} из {{ totalTasks }} 
          {{ getTaskWord(totalTasks) }}
          <span *ngIf="hasActiveFilters()" class="filter-indicator">
            (отфильтровано)
          </span>
        </div>
        
        <div class="results-actions">
          <button 
            *ngIf="hasActiveFilters()"
            class="clear-filters-btn"
            (click)="clearAllFilters()"
            [attr.aria-label]="'Сбросить все фильтры'">
            <app-icon name="x" [size]="14" [interactive]="true"></app-icon>
            Сбросить фильтры
          </button>
          
          <button 
            class="export-btn"
            (click)="exportFilters()"
            [disabled]="!hasActiveFilters()"
            [attr.aria-label]="'Экспортировать настройки фильтров'">
            <app-icon name="download" [size]="14" [interactive]="true"></app-icon>
            Экспорт
          </button>
        </div>
      </div>

      <!-- Search Suggestions -->
      <div class="search-suggestions" *ngIf="showSuggestions && searchSuggestions.length > 0">
        <div class="suggestions-header">
          <app-icon name="search" [size]="14" color="secondary"></app-icon>
          Похожие запросы:
        </div>
        <div class="suggestions-list">
          <button 
            *ngFor="let suggestion of searchSuggestions"
            class="suggestion-btn"
            (click)="applySuggestion(suggestion)"
            [attr.aria-label]="'Применить предложение: ' + suggestion">
            {{ suggestion }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .search-filter-container {
      background: var(--bg-primary);
      border: 1px solid var(--gray-200);
      border-radius: var(--radius-xl);
      padding: var(--space-lg);
      margin-bottom: var(--space-xl);
      box-shadow: var(--shadow-sm);
    }

    /* Search Input */
    .search-input-container {
      position: relative;
      display: flex;
      align-items: center;
      margin-bottom: var(--space-lg);
      border: 1px solid var(--gray-300);
      border-radius: var(--radius-lg);
      background: var(--bg-secondary);
      padding: 0 var(--space-md);
      transition: all var(--transition-fast);
    }

    .search-input-container:focus-within {
      border-color: var(--primary);
      box-shadow: var(--focus-primary);
    }

    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      padding: var(--space-md) var(--space-sm);
      font-size: 1rem;
      color: var(--text-primary);
      outline: none;
    }

    .search-input::placeholder {
      color: var(--text-muted);
    }

    .clear-search-btn {
      background: none;
      border: none;
      padding: var(--space-xs);
      cursor: pointer;
      color: var(--text-secondary);
      border-radius: var(--radius-sm);
      transition: all var(--transition-fast);
    }

    /* Quick Filters */
    .quick-filters {
      margin-bottom: var(--space-lg);
    }

    .quick-filter-group,
    .preset-group {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      flex-wrap: wrap;
    }

    .quick-filter-buttons,
    .preset-buttons {
      display: flex;
      gap: var(--space-xs);
      flex-wrap: wrap;
    }

    .quick-filter-btn,
    .preset-btn {
      background: var(--bg-secondary);
      border: 1px solid var(--gray-300);
      border-radius: var(--radius-md);
      padding: var(--space-xs) var(--space-sm);
      color: var(--text-secondary);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all var(--transition-fast);
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      white-space: nowrap;
    }

    .quick-filter-btn:hover,
    .preset-btn:hover {
      background: var(--gray-100);
      border-color: var(--gray-400);
      color: var(--text-primary);
    }

    .quick-filter-btn.active {
      background: var(--primary-light);
      border-color: var(--primary);
      color: var(--primary);
    }

    .preset-save-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Filter Controls */
    .filter-controls {
      display: flex;
      gap: var(--space-lg);
      flex-wrap: wrap;
      align-items: center;
      margin-bottom: var(--space-md);
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      flex: 1;
      min-width: 200px;
    }

    .filter-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      white-space: nowrap;
    }

    .filter-select {
      flex: 1;
      padding: var(--space-sm) var(--space-md);
      border: 1px solid var(--gray-300);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
      color: var(--text-primary);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .filter-select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: var(--focus-primary);
    }

    .sort-order-btn {
      background: var(--bg-secondary);
      border: 1px solid var(--gray-300);
      border-radius: var(--radius-md);
      padding: var(--space-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sort-order-btn:hover {
      background: var(--gray-100);
      border-color: var(--gray-400);
    }

    .sort-order-btn.active {
      background: var(--primary-light);
      border-color: var(--primary);
    }

    /* Date Range */
    .date-range-inputs {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      flex: 1;
    }

    .date-input {
      flex: 1;
      padding: var(--space-sm) var(--space-md);
      border: 1px solid var(--gray-300);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
      color: var(--text-primary);
      font-size: 0.875rem;
      transition: all var(--transition-fast);
    }

    .date-input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: var(--focus-primary);
    }

    .date-separator {
      color: var(--text-muted);
      font-weight: 500;
    }

    /* Filter Presets */
    .filter-presets {
      margin-bottom: var(--space-md);
    }

    /* Results Info */
    .results-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: var(--space-md);
      border-top: 1px solid var(--gray-200);
      flex-wrap: wrap;
      gap: var(--space-sm);
    }

    .results-text {
      font-size: 0.875rem;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .filter-indicator {
      color: var(--primary);
      font-weight: 500;
    }

    .results-actions {
      display: flex;
      gap: var(--space-sm);
      align-items: center;
    }

    .clear-filters-btn,
    .export-btn {
      background: none;
      border: 1px solid var(--gray-300);
      border-radius: var(--radius-md);
      padding: var(--space-xs) var(--space-sm);
      color: var(--text-secondary);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all var(--transition-fast);
      display: flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .clear-filters-btn:hover,
    .export-btn:hover {
      background: var(--gray-100);
      border-color: var(--gray-400);
      color: var(--text-primary);
    }

    .export-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Search Suggestions */
    .search-suggestions {
      margin-top: var(--space-md);
      padding-top: var(--space-md);
      border-top: 1px solid var(--gray-200);
    }

    .suggestions-header {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: var(--space-sm);
      display: flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .suggestions-list {
      display: flex;
      gap: var(--space-xs);
      flex-wrap: wrap;
    }

    .suggestion-btn {
      background: var(--bg-tertiary);
      border: 1px solid var(--gray-200);
      border-radius: var(--radius-md);
      padding: var(--space-xs) var(--space-sm);
      color: var(--text-secondary);
      font-size: 0.8rem;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .suggestion-btn:hover {
      background: var(--primary-light);
      border-color: var(--primary);
      color: var(--primary);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .search-filter-container {
        padding: var(--space-md);
      }

      .filter-controls {
        flex-direction: column;
        align-items: stretch;
        gap: var(--space-md);
      }

      .filter-group {
        flex-direction: column;
        align-items: stretch;
        min-width: auto;
      }

      .filter-label {
        justify-content: flex-start;
      }

      .results-info {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
        gap: var(--space-md);
      }

      .results-actions {
        justify-content: center;
      }

      .quick-filter-group,
      .preset-group {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-sm);
      }

      .date-range-inputs {
        flex-direction: column;
        gap: var(--space-sm);
      }

      .date-separator {
        display: none;
      }
    }

    @media (max-width: 480px) {
      .search-input-container {
        padding: 0 var(--space-sm);
      }

      .search-input {
        padding: var(--space-sm);
        font-size: 0.875rem;
      }

      .quick-filter-buttons,
      .preset-buttons {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class SearchFilterComponent implements OnInit, OnDestroy {
  // ========== ВХОДНЫЕ ПАРАМЕТРЫ ==========
  @Input() totalTasks: number = 0;
  @Input() filteredCount: number = 0;
  @Input() config: SearchFilterConfig = {
    enableDateFilter: false,
    enableQuickFilters: true,
    enablePresets: false,
    saveState: true,
    debounceMs: 300,
    storageKey: 'task-search-filters'
  };
  @Input() searchSuggestions: string[] = [];

  // ========== ВЫХОДНЫЕ СОБЫТИЯ ==========
  @Output() filtersChange = new EventEmitter<SearchFilterOptions>();

  // ========== СОСТОЯНИЕ КОМПОНЕНТА ==========
  searchTerm: string = '';
  currentOptions: SearchFilterOptions = {
    searchTerm: '',
    statusFilter: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    quickFilter: 'none'
  };

  // ========== ВНУТРЕННИЕ СВОЙСТВА ==========
  dateFromString: string = '';
  dateToString: string = '';
  showSuggestions: boolean = false;
  filterPresets: FilterPreset[] = [];

  // ========== RxJS ==========
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // ========== КОНСТАНТЫ ==========
  readonly TaskStatus = TaskStatus;
  readonly quickFilters: Array<{ id: string; name: string; icon: IconName }> = [
    { id: 'none', name: 'Все', icon: 'home' as IconName },
    { id: 'today', name: 'Сегодня', icon: 'clock' as IconName },
    { id: 'week', name: 'Неделя', icon: 'calendar' as IconName },
    { id: 'month', name: 'Месяц', icon: 'calendar' as IconName },
    { id: 'overdue', name: 'Просрочено', icon: 'warning' as IconName }
  ];

  ngOnInit(): void {
    this.setupSearchDebounce();
    this.loadSavedState();
    this.loadFilterPresets();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== ПОИСК С ДЕБАУНСОМ ==========
  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(
        debounceTime(this.config.debounceMs),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.currentOptions.searchTerm = searchTerm;
        this.emitFilters();
        this.updateSuggestions(searchTerm);
      });
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.searchSubject.next(this.searchTerm);
  }

  // ========== ФИЛЬТРЫ И СОРТИРОВКА ==========
  onFiltersChange(): void {
    this.saveCurrentState();
    this.emitFilters();
  }

  toggleSortOrder(): void {
    this.currentOptions.sortOrder = this.currentOptions.sortOrder === 'asc' ? 'desc' : 'asc';
    this.onFiltersChange();
  }

  onDateRangeChange(): void {
    if (this.dateFromString || this.dateToString) {
      this.currentOptions.dateRange = {
        from: this.dateFromString ? new Date(this.dateFromString) : undefined,
        to: this.dateToString ? new Date(this.dateToString) : undefined
      };
    } else {
      this.currentOptions.dateRange = undefined;
    }
    this.onFiltersChange();
  }

  // ========== БЫСТРЫЕ ФИЛЬТРЫ ==========
  applyQuickFilter(filterId: string): void {
    this.currentOptions.quickFilter = filterId as any;
    
    // Применяем дополнительную логику для быстрых фильтров
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    
    switch (filterId) {
      case 'today':
        this.currentOptions.dateRange = {
          from: startOfDay,
          to: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
        };
        break;
      case 'week':
        const weekStart = new Date(startOfDay);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        this.currentOptions.dateRange = {
          from: weekStart,
          to: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
        };
        break;
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        this.currentOptions.dateRange = {
          from: monthStart,
          to: monthEnd
        };
        break;
      case 'overdue':
        this.currentOptions.dateRange = {
          to: startOfDay
        };
        this.currentOptions.statusFilter = TaskStatus.TODO;
        break;
      default:
        this.currentOptions.dateRange = undefined;
    }
    
    this.updateDateInputs();
    this.onFiltersChange();
  }

  // ========== ПРЕСЕТЫ ==========
  applyPreset(preset: FilterPreset): void {
    this.currentOptions = { ...this.currentOptions, ...preset.options };
    this.searchTerm = this.currentOptions.searchTerm || '';
    this.updateDateInputs();
    this.onFiltersChange();
  }

  saveCurrentAsPreset(): void {
    const name = prompt('Введите название пресета:');
    if (name && name.trim()) {
      const preset: FilterPreset = {
        id: Date.now().toString(),
        name: name.trim(),
        icon: 'bookmark' as IconName,
        options: { ...this.currentOptions }
      };
      this.filterPresets.push(preset);
      this.saveFilterPresets();
    }
  }

  // ========== СБРОС И ОЧИСТКА ==========
  clearSearch(): void {
    this.searchTerm = '';
    this.currentOptions.searchTerm = '';
    this.showSuggestions = false;
    this.emitFilters();
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.dateFromString = '';
    this.dateToString = '';
    this.currentOptions = {
      searchTerm: '',
      statusFilter: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      quickFilter: 'none'
    };
    this.showSuggestions = false;
    this.saveCurrentState();
    this.emitFilters();
  }

  // ========== ПРОВЕРКИ СОСТОЯНИЯ ==========
  hasActiveFilters(): boolean {
    return this.currentOptions.searchTerm !== '' || 
           this.currentOptions.statusFilter !== 'all' ||
           this.currentOptions.sortBy !== 'createdAt' ||
           this.currentOptions.sortOrder !== 'desc' ||
           this.currentOptions.quickFilter !== 'none' ||
           !!this.currentOptions.dateRange;
  }

  // ========== ПРЕДЛОЖЕНИЯ ПОИСКА ==========
  updateSuggestions(searchTerm: string): void {
    this.showSuggestions = searchTerm.length > 0 && this.searchSuggestions.length > 0;
  }

  applySuggestion(suggestion: string): void {
    this.searchTerm = suggestion;
    this.currentOptions.searchTerm = suggestion;
    this.showSuggestions = false;
    this.emitFilters();
  }

  // ========== УТИЛИТЫ ==========
  getTaskWord(count: number): string {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
      return 'задач';
    }

    switch (lastDigit) {
      case 1:
        return 'задача';
      case 2:
      case 3:
      case 4:
        return 'задачи';
      default:
        return 'задач';
    }
  }

  exportFilters(): void {
    const filtersData = {
      options: this.currentOptions,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(filtersData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task-filters-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ========== ПРИВАТНЫЕ МЕТОДЫ ==========
  private updateDateInputs(): void {
    this.dateFromString = this.currentOptions.dateRange?.from ? 
      this.formatDateForInput(this.currentOptions.dateRange.from) : '';
    this.dateToString = this.currentOptions.dateRange?.to ? 
      this.formatDateForInput(this.currentOptions.dateRange.to) : '';
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private emitFilters(): void {
    this.filtersChange.emit({ ...this.currentOptions });
  }

  private saveCurrentState(): void {
    if (this.config.saveState) {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.currentOptions));
    }
  }

  private loadSavedState(): void {
    if (this.config.saveState) {
      const saved = localStorage.getItem(this.config.storageKey);
      if (saved) {
        try {
          this.currentOptions = { ...this.currentOptions, ...JSON.parse(saved) };
          this.searchTerm = this.currentOptions.searchTerm || '';
          this.updateDateInputs();
        } catch (error) {
          console.warn('Ошибка при загрузке сохраненных фильтров:', error);
        }
      }
    }
  }

  private loadFilterPresets(): void {
    const saved = localStorage.getItem(`${this.config.storageKey}-presets`);
    if (saved) {
      try {
        this.filterPresets = JSON.parse(saved);
      } catch (error) {
        console.warn('Ошибка при загрузке пресетов фильтров:', error);
      }
    }
  }

  private saveFilterPresets(): void {
    localStorage.setItem(`${this.config.storageKey}-presets`, JSON.stringify(this.filterPresets));
  }
} 