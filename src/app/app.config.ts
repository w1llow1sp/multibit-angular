import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

/**
 * Конфигурация приложения Angular
 * Настраивает провайдеры для standalone приложения
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // Глобальные обработчики ошибок браузера
    provideBrowserGlobalErrorListeners(),
    // Оптимизация обнаружения изменений с объединением событий
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Конфигурация маршрутизации
    provideRouter(routes),
    // Установка русской локали для форматирования
    { provide: LOCALE_ID, useValue: 'ru' }
  ]
};
