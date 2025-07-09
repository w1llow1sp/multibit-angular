export interface Task {
  id:string
  title:string
  description?:string
  status:TaskStatus;
  createdAt:Date;
}

export enum TaskStatus {
  TODO ="todo",
  IN_PROGRESS='in_progress',
  COMPLETED='completed'
}

export interface CreateTaskRequest {
  title:string;
  description:string;
}
