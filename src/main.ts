import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';

/**
 * Точка входа в приложение
 * Загружает Angular приложение с standalone компонентами
 */
bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error('Ошибка при запуске приложения:', err));
