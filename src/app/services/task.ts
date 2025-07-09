import {Injectable} from '@angular/core';
import {CreateTaskRequest, Task, TaskStatus} from '../models/task-model';
import {BehaviorSubject, Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private tasks: Task[] = [
    {
      id: '1',
      title: 'Изучить Angular',
      description: 'Изучить основы Angular и создать первое приложение',
      status: TaskStatus.IN_PROGRESS,
      createdAt: new Date('2023-12-01')
    },
    {
      id: '2',
      title: 'Настроить маршрутизацию',
      description: 'Создать маршруты для списка задач и детальной страницы',
      status: TaskStatus.TODO,
      createdAt: new Date('2023-12-02')
    },
    {
      id: '3',
      title: 'Добавить стили',
      description: 'Создать красивый дизайн для приложения',
      status: TaskStatus.COMPLETED,
      createdAt: new Date('2023-12-03')
    }
  ]

  // Храним текущее состояние списка задач и уведомляем подписчиков при его изменении
  private tasksSubject = new BehaviorSubject<Task[]>(this.tasks);

  // Публичный Observable который позволяет компонентам подписываться на изменения списка задач.
  public tasks$ = this.tasksSubject.asObservable();

  constructor() {
  }

  getTasks(): Observable<Task[]> {
    return this.tasks$;
  }

  getTaskById(id: string): Task | undefined {
    return this.tasks.find((task) => task.id === id);
  }

  addTask(taskRequest: CreateTaskRequest): Task {
    const newTask: Task = {
      id: Date.now().toString(),
      title: taskRequest.title,
      description: taskRequest.description,
      status: TaskStatus.TODO,
      createdAt: new Date(),
    }

    this.tasks.push(newTask);
    // Уведомляем подписчиков
    this.tasksSubject.next([...this.tasks]);
    return newTask;
  }

  deleteTasks(id: string): boolean {
    const index = this.tasks.findIndex((task) => task.id === id);

    if (index > -1) {
      this.tasks.splice(index, 1);
      this.tasksSubject.next([...this.tasks]);
      return true;
    }

    return false;

  }

  updateTasksStatus(id: string, status: TaskStatus): Task | undefined {
    const tasks = this.getTaskById(id)
    if(tasks) {
      tasks.status = status;
      this.tasksSubject.next([...this.tasks]);
      return tasks;
    }
    return undefined;
  }

}
