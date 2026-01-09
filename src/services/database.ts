// Simple database service for TaskMate
// This can be easily replaced with a real database like SQLite, PostgreSQL, etc.

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // In a real app, this would be hashed
  createdAt: string;
}

export interface Task {
  id: number;
  userId: string;
  title: string;
  description?: string;
  dueDate?: string;
  urgency: "high" | "medium" | "low";
  estimatedTime?: number;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface PomodoroSession {
  id: number;
  userId: string;
  taskId?: number;
  startTime: string;
  endTime?: string;
  duration: number;
  completed: boolean;
}

class DatabaseService {
  private users: User[] = [];
  private tasks: Task[] = [];
  private sessions: PomodoroSession[] = [];

  constructor() {
    this.loadData();
  }

  private loadData() {
    // Load from localStorage (for now)
    const savedUsers = localStorage.getItem('taskmate-users');
    const savedTasks = localStorage.getItem('taskmate-tasks');
    const savedSessions = localStorage.getItem('taskmate-sessions');

    if (savedUsers) this.users = JSON.parse(savedUsers);
    if (savedTasks) this.tasks = JSON.parse(savedTasks);
    if (savedSessions) this.sessions = JSON.parse(savedSessions);
  }

  private saveData() {
    localStorage.setItem('taskmate-users', JSON.stringify(this.users));
    localStorage.setItem('taskmate-tasks', JSON.stringify(this.tasks));
    localStorage.setItem('taskmate-sessions', JSON.stringify(this.sessions));
  }

  // User methods
  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const user: User = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    this.users.push(user);
    this.saveData();
    return user;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.users.find(user => user.email === email) || null;
  }

  async findUserById(id: string): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  // Task methods
  async createTask(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    const task: Task = {
      ...taskData,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    
    this.tasks.push(task);
    this.saveData();
    return task;
  }

  async getTasksByUserId(userId: string): Promise<Task[]> {
    return this.tasks.filter(task => task.userId === userId);
  }

  async updateTask(taskId: number, updates: Partial<Task>): Promise<Task | null> {
    const taskIndex = this.tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return null;

    this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updates };
    this.saveData();
    return this.tasks[taskIndex];
  }

  async deleteTask(taskId: number): Promise<boolean> {
    const taskIndex = this.tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return false;

    this.tasks.splice(taskIndex, 1);
    this.saveData();
    return true;
  }

  // Session methods
  async createSession(sessionData: Omit<PomodoroSession, 'id'>): Promise<PomodoroSession> {
    const session: PomodoroSession = {
      ...sessionData,
      id: Date.now()
    };
    
    this.sessions.push(session);
    this.saveData();
    return session;
  }

  async getSessionsByUserId(userId: string): Promise<PomodoroSession[]> {
    return this.sessions.filter(session => session.userId === userId);
  }

  // Cleanup methods
  async cleanupOldCompletedTasks(userId: string, daysOld: number = 1): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    this.tasks = this.tasks.filter(task => {
      if (task.userId !== userId) return true;
      if (!task.completed || !task.completedAt) return true;
      return new Date(task.completedAt) > cutoffDate;
    });

    this.saveData();
  }
}

// Export a singleton instance
export const database = new DatabaseService();

// For future database migration, you can easily replace this with:
// - SQLite (for desktop apps)
// - PostgreSQL/MySQL (for web apps)
// - MongoDB (for NoSQL)
// - Firebase/Supabase (for cloud-based apps)

/*
Example of how to migrate to SQLite:

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

class SQLiteDatabaseService {
  private db: any;

  async init() {
    this.db = await open({
      filename: './taskmate.db',
      driver: sqlite3.Database
    });
    
    await this.createTables();
  }

  private async createTables() {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY,
        userId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        dueDate TEXT,
        urgency TEXT NOT NULL,
        estimatedTime INTEGER,
        completed BOOLEAN NOT NULL,
        completedAt TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users (id)
      );
    `);
  }
}
*/
