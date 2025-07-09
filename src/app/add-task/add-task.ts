import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {TaskService} from '../services/task';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-add-task',
  imports: [
    ReactiveFormsModule,
    CommonModule
  ],
  templateUrl: './add-task.html',
  styleUrl: './add-task.css'
})
export class AddTask implements OnInit{
  @Output() taskAdded = new EventEmitter<void>();
  taskForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private taskService: TaskService
  ) {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['']
    });
  }

  ngOnInit(): void {
  }

  onSubmit(): void {
    if (this.taskForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;

      try {
        const taskData = {
          title: this.taskForm.get('title')?.value?.trim() || '',
          description: this.taskForm.get('description')?.value?.trim() || ''
        };

        this.taskService.addTask(taskData);

        this.taskForm.reset();
        this.taskAdded.emit();
      } catch (error) {
        console.error('Ошибка при добавлении задачи:', error);
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  get title() {
    return this.taskForm.get('title');
  }

  get description() {
    return this.taskForm.get('description');
  }


}
