import {Component, OnInit} from '@angular/core';
import { Task, TaskStatus } from '../models/task-model';
import {ActivatedRoute, Router} from '@angular/router';
import {TaskService} from '../services/task';
import {DatePipe, NgClass, NgIf} from '@angular/common';

@Component({
  selector: 'app-task-detail',
  imports: [
    NgClass,
    DatePipe,
    NgIf
  ],
  templateUrl: './task-detail.html',
  styleUrl: './task-detail.css'
})
export class TaskDetail implements OnInit {
  task: Task | undefined;
  TaskStatus = TaskStatus;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private taskService: TaskService
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    console.log('Получен ID задачи:', id); // Отладочный вывод
    if (id) {
      this.task = this.taskService.getTaskById(id);
      console.log('Найдена задача:', this.task); // Отладочный вывод
      if (!this.task) {
        console.warn('Задача с ID', id, 'не найдена');
      }
    }
  }

  goBack(): void {
    this.router.navigate(['/tasks']);
  }

  deleteTask(): void {
    if (this.task && confirm('Вы уверены, что хотите удалить эту задачу?')) {
      this.taskService.deleteTasks(this.task.id);
      this.goBack();
    }
  }

  updateTaskStatus(status: TaskStatus): void {
    if (this.task) {
      this.taskService.updateTasksStatus(this.task.id, status);
      this.task.status = status;
    }
  }

  getStatusText(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.TODO:
        return 'Не выполнена';
      case TaskStatus.IN_PROGRESS:
        return 'В процессе';
      case TaskStatus.COMPLETED:
        return 'Выполнена';
      default:
        return 'Неизвестно';
    }
  }

  getStatusClass(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.TODO:
        return 'status-todo';
      case TaskStatus.IN_PROGRESS:
        return 'status-in-progress';
      case TaskStatus.COMPLETED:
        return 'status-completed';
      default:
        return '';
    }
  }

}
