import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { IconComponent } from './shared/components/icon/icon.component';

/**
 * Корневой компонент приложения
 * Управляет основной навигацией и отображает общую структуру приложения
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, IconComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent {
  // ========== ДАННЫЕ ПРИЛОЖЕНИЯ ==========
  title = 'Task Manager';                    // Название приложения
  currentYear = new Date().getFullYear();    // Текущий год для футера
  version = '2.0.0';                         // Версия приложения

  constructor(private router: Router) {
    // Отслеживание изменений маршрутов для дополнительной логики
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      // Здесь можно добавить аналитику или другую обработку смены маршрутов
      console.log('Маршрут изменен на:', event.url);
    });
  }

  // ========== МЕТОДЫ НАВИГАЦИИ ==========

  /**
   * Проверить, находимся ли мы на главной странице
   * @returns true если текущий маршрут - главная страница
   */
  isHomeRoute(): boolean {
    return this.router.url === '/';
  }

  /**
   * Перейти на главную страницу
   */
  goHome(): void {
    this.router.navigate(['/']);
  }
}
