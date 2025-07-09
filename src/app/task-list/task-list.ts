import {Component, OnInit} from '@angular/core';
import {Observable} from 'rxjs';
import {Task, TaskStatus} from '../models/task-model';
import {TaskService} from '../services/task';
import {CommonModule} from '@angular/common';
import {AddTask} from '../add-task/add-task';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-task-list',
  imports: [CommonModule, AddTask, RouterLink],
  templateUrl: './task-list.html',
  styleUrl: './task-list.css'
})
export class TaskList  implements OnInit {
  tasks$: Observable<Task[]>;
  showAddForm = false;
  TaskStatus = TaskStatus;

  constructor(private taskService: TaskService) {
    this.tasks$ = this.taskService.getTasks()
  }

  ngOnInit() {
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
  }

  deleteTask(id: string) {
    if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
      this.taskService.deleteTasks(id)
    }
  }

  updateTaskStatus(id: string, status: TaskStatus): void {
    this.taskService.updateTasksStatus(id, status);
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

  onTaskAdded(): void {
    this.showAddForm = false;
  }

}
