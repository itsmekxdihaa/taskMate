
import { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, NavLink, Navigate } from "react-router-dom";
import "./App.css";
import SpotifyPlayer from "./components/SpotifyPlayer";
import NotesPage from "./components/NotesPage";
import Icon from "./components/Icon";
import Logo from "./components/Logo";
import HomePage from "./components/HomePage";
import QuickAddBar from "./components/QuickAddBar";
import ReminderFields, { parseReminder } from "./components/ReminderFields";
import { enablePushReminders, refreshPushRegistration, PUSH_STATUS_EVENT, type PushStatus } from "./lib/push";

// Always open the app on the Home page, even if it was last left on another page
if (window.location.hash && window.location.hash !== "#/") {
  window.history.replaceState(null, "", window.location.pathname + window.location.search + "#/")
}
import { signUp, signIn, createTask, getTasks, updateTask, deleteTask as deleteTaskFromDB, createSession, getSessions, auth } from "./firebase";

// Enhanced Task type
type Task = { 
  id: string; 
  title: string; 
  description?: string;
  dueDate?: string;
  urgency: "high" | "medium" | "low";
  estimatedTime?: number;
  energy?: "high" | "medium" | "low";
  energyType?: "mental" | "physical" | "mixed";
  dueTime?: string;
  reminderMinutes?: number;
  remindAt?: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

const DEFAULT_DUE_TIME = "09:00"

function computeRemindAt(task: Pick<Task, "dueDate" | "dueTime" | "reminderMinutes" | "completed">) {
  if (task.completed || !task.dueDate || task.reminderMinutes === undefined) return undefined
  const due = new Date(`${task.dueDate.slice(0, 10)}T${task.dueTime || DEFAULT_DUE_TIME}:00`)
  if (isNaN(due.getTime())) return undefined
  const remindAt = new Date(due.getTime() - task.reminderMinutes * 60000)
  return remindAt.getTime() > Date.now() ? remindAt.toISOString() : undefined
}

function formatDueTime(time: string) {
  const [h, m] = time.split(":").map(Number)
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

const energyLabels = {
  high: "High energy",
  medium: "Medium energy",
  low: "Low energy",
}

const energyTypeLabels = {
  mental: "mental",
  physical: "physical",
  mixed: "mental & physical",
}

// User type for login
type User = {
  id: string;
  name: string;
  email: string;
}

// Pomodoro session type
type PomodoroSession = {
  id: string;
  taskId?: string;
  startTime: string;
  endTime?: string;
  duration: number; // in minutes
  completed: boolean;
}

// ----- Login Page -----
function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (isSignUp && !name.trim()) {
      alert("Please enter your name")
      return
    }
    
    if (!email.trim() || !password.trim()) {
      alert("Please enter email and password")
      return
    }

    try {
      if (isSignUp) {
        // Create new user with Firebase
        const firebaseUser = await signUp(email, password, name || email.split('@')[0])
        
        const user: User = {
          id: firebaseUser.uid,
          name: name || email.split('@')[0],
          email: email
        }

        onLogin(user)
      } else {
        // Login existing user with Firebase
        const firebaseUser = await signIn(email, password)
        
        const user: User = {
          id: firebaseUser.uid,
          name: email.split('@')[0], // We'll get the actual name from Firestore later
          email: email
        }

        onLogin(user)
      }
    } catch (error: any) {
      console.error('Login error:', error)
      alert(error.message || "An error occurred during login")
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
                 <div className="login-header">
           <div className="login-logo"><Logo size={56} /></div>
           <h1 className="login-title">TaskMate</h1>
           <p className="login-subtitle">Tasks, notes and focus in one place</p>
         </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {isSignUp && (
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="login-input"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
          />
          <button type="submit" className="login-btn">
            {isSignUp ? "Create account" : "Log in"}
          </button>
        </form>
        
        <button 
          onClick={() => setIsSignUp(!isSignUp)} 
          className="toggle-auth-btn"
        >
          {isSignUp ? "Already have an account? Log in" : "New here? Create an account"}
        </button>
      </div>
    </div>
  )
}

// ----- Layout -----
const pushStatusLabels: Record<PushStatus, string> = {
  enabled: "Reminders are on",
  off: "Turn on reminders",
  blocked: "Reminders blocked",
  unsupported: "Reminders not supported here",
  "not-configured": "Reminders not set up yet",
  failed: "Reminders didn't connect",
}

const pushStatusHelp: Record<PushStatus, string> = {
  enabled: "You'll get a notification before tasks with a reminder are due, even when TaskMate is closed",
  off: "Get notifications before tasks are due, even when TaskMate is closed",
  blocked: "Notifications are blocked. Allow them for this site in your browser settings",
  unsupported: "This browser doesn't support push notifications. Try Chrome, Edge or Firefox",
  "not-configured": "Push notifications need a VAPID key in the app settings",
  failed: "This browser couldn't connect to the push service. Click to retry, or open TaskMate in Chrome, Edge or Firefox",
}

function Layout({ children, user, onLogout, theme, onToggleTheme, pushStatus, onEnableReminders }: { 
  children: React.ReactNode; 
  user: User;
  onLogout: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  pushStatus: PushStatus;
  onEnableReminders: () => void;
}) {
  const [sidebarHidden, setSidebarHidden] = useState(false)

  return (
    <div className={`app-container ${sidebarHidden ? 'sidebar-hidden' : ''}`}>
      <button 
        className="sidebar-toggle"
        onClick={() => setSidebarHidden(!sidebarHidden)}
        title={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
      >
        <Icon name={sidebarHidden ? "menu" : "close"} />
      </button>
      <aside className="sidebar">
        <div className="logo-section">
          <Logo size={40} />
          <div>
            <h2 className="app-title">TaskMate</h2>
            <p className="app-subtitle">Welcome, {user.name}!</p>
          </div>
        </div>
        <nav className="nav-menu">
          <NavLink to="/" end className="nav-link">
            <span className="nav-icon"><Icon name="home" /></span>
            Home
          </NavLink>
          <NavLink to="/calendar" className="nav-link">
            <span className="nav-icon"><Icon name="calendar" /></span>
            Calendar
          </NavLink>
          <NavLink to="/pomodoro" className="nav-link">
            <span className="nav-icon"><Icon name="clock" /></span>
            Pomodoro Timer
          </NavLink>
          <NavLink to="/tasks" className="nav-link">
            <span className="nav-icon"><Icon name="tasks" /></span>
            Tasks
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <button
            onClick={onEnableReminders}
            className={`theme-toggle reminders-toggle ${pushStatus}`}
            title={pushStatusHelp[pushStatus]}
            disabled={pushStatus !== "off" && pushStatus !== "failed"}
          >
            <span className="nav-icon"><Icon name="bell" /></span>
            {pushStatusLabels[pushStatus]}
          </button>
          <button onClick={onToggleTheme} className="theme-toggle" title="Switch between light and dark mode">
            <span className="nav-icon"><Icon name={theme === "dark" ? "sun" : "moon"} /></span>
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button onClick={onLogout} className="logout-btn">
            <span className="nav-icon"><Icon name="logout" /></span>
            Log out
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
      <SpotifyPlayer />
    </div>
  );
}

// ----- Tasks Page -----
function TasksPage({ tasks, onAddTask, onToggleTask, onDeleteTask, onEditTask }: { 
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, task: Partial<Task>) => void;
}) {
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all")
  const [showCompleted, setShowCompleted] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const emptyForm = {
    title: "",
    description: "",
    dueDate: "",
    dueTime: "",
    reminder: "",
    urgency: "medium" as "high" | "medium" | "low",
    estimatedTime: "",
    completed: false
  }
  const [newTask, setNewTask] = useState(emptyForm)
  const [editTask, setEditTask] = useState(emptyForm)

  const filteredTasks = tasks.filter(task => {
    if (!showCompleted && task.completed) return false
    if (filter !== "all" && task.urgency !== filter) return false
    return true
  })

  const groupedTasks = filteredTasks.reduce((acc, task) => {
    if (!acc[task.urgency]) acc[task.urgency] = []
    acc[task.urgency].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  const urgencyOrder = ["high", "medium", "low"]
  const urgencyColors = {
    high: "#d0675f",
    medium: "#c99a4f",
    low: "#5f9b78"
  }

  const urgencyLabels = {
    high: "High priority",
    medium: "Medium priority",
    low: "Low priority"
  }

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTask.title.trim()) return

    onAddTask({
      title: newTask.title,
      description: newTask.description || undefined,
      dueDate: newTask.dueDate || undefined,
      dueTime: newTask.dueDate && newTask.dueTime ? newTask.dueTime : undefined,
      reminderMinutes: newTask.dueDate ? parseReminder(newTask.reminder) : undefined,
      urgency: newTask.urgency,
      estimatedTime: newTask.estimatedTime ? parseInt(newTask.estimatedTime) : undefined,
      completed: false
    })

    setNewTask(emptyForm)
    setShowAddForm(false)
  }

  function startEditTask(task: Task) {
    setEditingTaskId(task.id)
    setEditTask({
      title: task.title,
      description: task.description || "",
      dueDate: task.dueDate || "",
      dueTime: task.dueTime || "",
      reminder: task.reminderMinutes === undefined ? "" : String(task.reminderMinutes),
      urgency: task.urgency,
      estimatedTime: task.estimatedTime?.toString() || "",
      completed: task.completed
    })
  }

  function handleEditTask(e: React.FormEvent) {
    e.preventDefault()
    if (!editTask.title.trim() || !editingTaskId) {
      console.log('Edit task validation failed:', { title: editTask.title, editingTaskId })
      return
    }

    const updateData = {
      title: editTask.title,
      description: editTask.description || undefined,
      dueDate: editTask.dueDate || undefined,
      dueTime: editTask.dueDate && editTask.dueTime ? editTask.dueTime : undefined,
      reminderMinutes: editTask.dueDate ? parseReminder(editTask.reminder) : undefined,
      urgency: editTask.urgency,
      estimatedTime: editTask.estimatedTime ? parseInt(editTask.estimatedTime) : undefined,
      completed: editTask.completed
    }

    console.log('Submitting edit task:', editingTaskId, updateData)
    onEditTask(editingTaskId, updateData)

    setEditingTaskId(null)
    setEditTask(emptyForm)
  }

  function cancelEdit() {
    setEditingTaskId(null)
    setEditTask(emptyForm)
  }

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <h1 className="page-title">Tasks</h1>
        <div className="tasks-controls">
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="add-task-btn"
          >
            <Icon name="plus" size={16} /> More options
          </button>
          <div className="filter-controls">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value as any)}
              className="filter-select"
              title="Show tasks by priority"
            >
              <option value="all">All priorities</option>
              <option value="high">High priority only</option>
              <option value="medium">Medium priority only</option>
              <option value="low">Low priority only</option>
            </select>
            <label className="show-completed">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
              />
              Show completed
            </label>
          </div>
        </div>
      </div>

      <QuickAddBar onAddTask={onAddTask} />

      {showAddForm && (
        <div className="add-task-form">
          <form onSubmit={handleAddTask}>
            <div className="form-row">
              <input
                type="text"
                placeholder="Task title"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                className="task-input"
                required
              />
              <select
                value={newTask.urgency}
                onChange={(e) => setNewTask({...newTask, urgency: e.target.value as any})}
                className="urgency-select"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <div className="form-row">
              <textarea
                placeholder="Description (optional)"
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                className="task-description-input"
                rows={2}
              />
            </div>
            <div className="form-row">
              <input
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                className="date-input"
              />
              <input
                type="number"
                placeholder="Estimated time (minutes)"
                value={newTask.estimatedTime}
                onChange={(e) => setNewTask({...newTask, estimatedTime: e.target.value})}
                className="time-input"
                min="1"
              />
            </div>
            <ReminderFields
              dueDate={newTask.dueDate}
              dueTime={newTask.dueTime}
              reminder={newTask.reminder}
              onChange={(updates) => setNewTask(prev => ({ ...prev, ...updates }))}
            />
            <div className="form-actions">
              <button type="submit" className="save-task-btn">Save task</button>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {editingTaskId && (
        <div className="edit-task-form">
          <h3>Edit task</h3>
          <form onSubmit={handleEditTask}>
            <div className="form-row">
              <input
                type="text"
                placeholder="Task title"
                value={editTask.title}
                onChange={(e) => setEditTask({...editTask, title: e.target.value})}
                className="task-input"
                required
              />
              <select
                value={editTask.urgency}
                onChange={(e) => setEditTask({...editTask, urgency: e.target.value as any})}
                className="urgency-select"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <div className="form-row">
              <textarea
                placeholder="Description (optional)"
                value={editTask.description}
                onChange={(e) => setEditTask({...editTask, description: e.target.value})}
                className="task-description-input"
                rows={2}
              />
            </div>
            <div className="form-row">
              <input
                type="date"
                value={editTask.dueDate}
                onChange={(e) => setEditTask({...editTask, dueDate: e.target.value})}
                className="date-input"
              />
              <input
                type="number"
                placeholder="Estimated time (minutes)"
                value={editTask.estimatedTime}
                onChange={(e) => setEditTask({...editTask, estimatedTime: e.target.value})}
                className="time-input"
                min="1"
              />
            </div>
            <ReminderFields
              dueDate={editTask.dueDate}
              dueTime={editTask.dueTime}
              reminder={editTask.reminder}
              onChange={(updates) => setEditTask(prev => ({ ...prev, ...updates }))}
            />
            <div className="form-actions">
              <button type="submit" className="save-task-btn">Save changes</button>
              <button 
                type="button" 
                onClick={cancelEdit}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="tasks-container">
        {urgencyOrder.map(urgency => {
          const tasksInGroup = groupedTasks[urgency] || []
          if (tasksInGroup.length === 0) return null

          return (
            <div key={urgency} className="task-group">
              <h2 className="group-title" style={{ color: urgencyColors[urgency as keyof typeof urgencyColors] }}>
                {urgencyLabels[urgency as keyof typeof urgencyLabels]} ({tasksInGroup.length})
              </h2>
              <div className="task-list">
                {tasksInGroup.map((task) => (
                  <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                    <div className="task-checkbox">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => onToggleTask(task.id)}
                        className="task-checkbox-input"
                      />
                    </div>
                    <div className="task-content">
                      <h3 className="task-title">{task.title}</h3>
                      {task.description && (
                        <p className="task-description">{task.description}</p>
                      )}
                      <div className="task-meta">
                        {task.dueDate && (
                          <span className="task-due">
                            Due {new Date(task.dueDate.slice(0, 10) + "T00:00:00").toLocaleDateString()}
                            {task.dueTime && ` at ${formatDueTime(task.dueTime)}`}
                          </span>
                        )}
                        {task.remindAt && !task.completed && (
                          <span className="task-reminder" title={`Reminder at ${new Date(task.remindAt).toLocaleString()}`}>
                            Reminder {new Date(task.remindAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </span>
                        )}
                        {task.estimatedTime && (
                          <span className="task-time">
                            About {task.estimatedTime} min
                          </span>
                        )}
                        {task.energy && (
                          <span className={`energy-badge ${task.energy}`}>
                            {energyLabels[task.energy]}
                            {task.energyType && ` · ${energyTypeLabels[task.energyType]}`}
                          </span>
                        )}
                        {task.completed && task.completedAt && (
                          <span className="task-completed">
                            Done {new Date(task.completedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="task-actions">
                      <button 
                        onClick={() => startEditTask(task)}
                        className="edit-btn"
                        title="Edit task"
                        aria-label="Edit task"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button 
                        onClick={() => onDeleteTask(task.id)}
                        className="delete-btn"
                        title="Delete task"
                        aria-label="Delete task"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        
        {filteredTasks.length === 0 && (
          <div className="empty-state">
            <p>No tasks yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ----- Pomodoro Timer Page -----
function PomodoroPage({ tasks, onAddSession }: { 
  tasks: Task[];
  onAddSession: (session: Omit<PomodoroSession, 'id'>) => void;
}) {
  const [timeLeft, setTimeLeft] = useState(25 * 60) // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [sessionStart, setSessionStart] = useState<Date | null>(null)

  const workTime = 25 * 60 // 25 minutes
  const breakTime = 5 * 60 // 5 minutes

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  function playNotificationSound(isBreakTime: boolean) {
    // Create a simple notification sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
      
      // Also try browser notification if available
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(isBreakTime ? 'Break is over' : 'Focus session complete', {
          body: isBreakTime ? 'Ready to start your next focus session?' : 'Nice work. Time for a short break.',
          icon: `${import.meta.env.BASE_URL}logo.svg`
        })
      }
    } catch (error) {
      console.log('Could not play notification sound:', error)
    }
  }

  // Handle timer completion
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      setIsRunning(false)
      playNotificationSound(isBreak)
      
      // Session completed
      if (sessionStart) {
        onAddSession({
          taskId: selectedTask || undefined,
          startTime: sessionStart.toISOString(),
          endTime: new Date().toISOString(),
          duration: isBreak ? 5 : 25,
          completed: true
        })
      }
      
      // Switch between work and break
      setTimeout(() => {
      if (isBreak) {
        setTimeLeft(workTime)
        setIsBreak(false)
      } else {
        setTimeLeft(breakTime)
        setIsBreak(true)
      }
      setSessionStart(null)
      }, 100)
    }
  }, [timeLeft, isRunning, isBreak, selectedTask, sessionStart, onAddSession, workTime, breakTime])

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, timeLeft])

  function startTimer() {
    setIsRunning(true)
    setSessionStart(new Date())
  }

  function pauseTimer() {
    setIsRunning(false)
  }

  function resetTimer() {
    setIsRunning(false)
    setTimeLeft(workTime)
    setIsBreak(false)
    setSessionStart(null)
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const pendingTasks = tasks.filter(t => !t.completed)

  return (
    <div className="pomodoro-page">
      <div className="pomodoro-header">
        <h1 className="page-title pomodoro-title">Pomodoro Timer</h1>
      </div>

      <div className="pomodoro-container">
        <div className="timer-display">
          <div className={`timer-circle ${isBreak ? 'break' : 'work'}`}>
            <div className="timer-time">{formatTime(timeLeft)}</div>
            <div className="timer-label">
              {isBreak ? 'Break' : 'Focus'}
            </div>
          </div>
        </div>

        <div className="timer-controls">
          {!isRunning ? (
            <button onClick={startTimer} className="start-btn">
              <Icon name="play" size={16} /> Start
            </button>
          ) : (
            <button onClick={pauseTimer} className="pause-btn">
              <Icon name="pause" size={16} /> Pause
            </button>
          )}
          <button onClick={resetTimer} className="reset-btn">
            <Icon name="reset" size={16} /> Reset
          </button>
        </div>

        <div className="task-selection">
          <label className="task-selection-label" htmlFor="focus-task">Working on</label>
          <select
            id="focus-task"
            value={selectedTask || ""}
            onChange={(e) => setSelectedTask(e.target.value || null)}
            className="task-select"
          >
            <option value="">Nothing specific</option>
            {pendingTasks.map(task => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </div>

      </div>
    </div>
  )
}

// ----- Analytics Page -----
function AnalyticsPage({ tasks, sessions }: { tasks: Task[]; sessions: PomodoroSession[] }) {
  const completedTasks = tasks.filter(t => t.completed)
  const pendingTasks = tasks.filter(t => !t.completed)
  const highPriorityTasks = tasks.filter(t => t.urgency === "high" && !t.completed)
  
  const totalTime = tasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0)
  const completedTime = completedTasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0)
  
  const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0

  const totalPomodoroTime = sessions.reduce((sum, session) => sum + session.duration, 0)
  const completedSessions = sessions.filter(s => s.completed)

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h1 className="page-title">Progress</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{tasks.length}</div>
          <div className="stat-label">All tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{completedTasks.length}</div>
          <div className="stat-label">Done</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{pendingTasks.length}</div>
          <div className="stat-label">Still to do</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{highPriorityTasks.length}</div>
          <div className="stat-label">High priority, not done</div>
        </div>
      </div>

      <div className="progress-section">
        <h3>Tasks completed</h3>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${completionRate}%` }}
          ></div>
        </div>
        <p className="progress-text">{completionRate.toFixed(0)}% of your tasks are done</p>
      </div>

      <div className="time-section">
        <h3>Time</h3>
        <div className="time-stats">
          <div className="time-stat">
            <span className="time-label">Estimated time for all tasks</span>
            <span className="time-value">{totalTime} min</span>
          </div>
          <div className="time-stat">
            <span className="time-label">Estimated time for finished tasks</span>
            <span className="time-value">{completedTime} min</span>
          </div>
          <div className="time-stat">
            <span className="time-label">Focus sessions completed</span>
            <span className="time-value">{completedSessions.length}</span>
          </div>
          <div className="time-stat">
            <span className="time-label">Time spent in focus sessions</span>
            <span className="time-value">{totalPomodoroTime} min</span>
          </div>
        </div>
      </div>

      <div className="recent-activity">
        <h3>Recently finished</h3>
        <div className="activity-list">
          {completedTasks
            .sort((a, b) => new Date(b.completedAt || "").getTime() - new Date(a.completedAt || "").getTime())
            .slice(0, 5)
            .map(task => (
              <div key={task.id} className="activity-item">
                <span className="activity-icon"><Icon name="check" size={16} /></span>
                <span className="activity-text">{task.title}</span>
                <span className="activity-time">
                  {task.completedAt && new Date(task.completedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

// ----- Calendar Page -----
function CalendarPage({ tasks, onAddTask, onToggleTask, onDeleteTask, onEditTask }: {
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, task: Partial<Task>) => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    dueDate: string;
    dueTime: string;
    reminder: string;
    urgency: "high" | "medium" | "low";
    estimatedTime: string;
    completed: boolean;
  }>({
    title: "",
    description: "",
    dueDate: "",
    dueTime: "",
    reminder: "",
    urgency: "medium",
    estimatedTime: "",
    completed: false
  })

  function blankTaskFor(date: Date | null) {
    return {
      title: "",
      description: "",
      dueDate: date ? date.toISOString().split('T')[0] : "",
      dueTime: "",
      reminder: "",
      urgency: "medium" as const,
      estimatedTime: "",
      completed: false
    }
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Get tasks for a specific date
  function getTasksForDate(date: Date): Task[] {
    const dateStr = date.toISOString().split('T')[0]
    return tasks.filter(task => {
      if (!task.dueDate) return false
      const taskDate = task.dueDate.split('T')[0]
      return taskDate === dateStr
    })
  }

  // Get tasks for selected date
  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : []

  // Generate calendar days
  const calendarDays: (Date | null)[] = []
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null)
  }
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(year, month, day))
  }

  function handleDateClick(date: Date) {
    setSelectedDate(date)
    setShowTaskModal(true)
    setEditingTask(null)
    setNewTask(blankTaskFor(date))
  }

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTask.title.trim() || !newTask.dueDate) return

    onAddTask({
      title: newTask.title,
      description: newTask.description || undefined,
      dueDate: newTask.dueDate,
      dueTime: newTask.dueTime || undefined,
      reminderMinutes: parseReminder(newTask.reminder),
      urgency: newTask.urgency,
      estimatedTime: newTask.estimatedTime ? parseInt(newTask.estimatedTime) : undefined,
      completed: false
    })

    setNewTask(blankTaskFor(selectedDate))
  }

  function handleEditTask(e: React.FormEvent) {
    e.preventDefault()
    if (!editingTask || !newTask.title.trim()) return

    onEditTask(editingTask.id, {
      title: newTask.title,
      description: newTask.description || undefined,
      dueDate: newTask.dueDate,
      dueTime: newTask.dueTime || undefined,
      reminderMinutes: parseReminder(newTask.reminder),
      urgency: newTask.urgency,
      estimatedTime: newTask.estimatedTime ? parseInt(newTask.estimatedTime) : undefined
    })

    setEditingTask(null)
    setNewTask(blankTaskFor(selectedDate))
  }

  function startEdit(task: Task) {
    setEditingTask(task)
    setNewTask({
      title: task.title,
      description: task.description || "",
      dueDate: task.dueDate || "",
      dueTime: task.dueTime || "",
      reminder: task.reminderMinutes === undefined ? "" : String(task.reminderMinutes),
      urgency: task.urgency,
      estimatedTime: task.estimatedTime?.toString() || "",
      completed: task.completed
    })
  }

  function previousMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"]
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div className="calendar-page">
      <div className="calendar-header">
        <h1 className="page-title">Calendar</h1>
        <div className="calendar-nav">
          <button onClick={previousMonth} className="calendar-nav-btn" title="Previous month" aria-label="Previous month">‹</button>
          <h2>{monthNames[month]} {year}</h2>
          <button onClick={nextMonth} className="calendar-nav-btn" title="Next month" aria-label="Next month">›</button>
        </div>
      </div>

      <div className="calendar-container">
        <div className="calendar-grid">
          {/* Day headers */}
          {dayNames.map(day => (
            <div key={day} className="calendar-day-header">{day}</div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="calendar-day empty"></div>
            }

            const dayTasks = getTasksForDate(date)
            const isToday = date.toDateString() === new Date().toDateString()
            const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString()

            return (
              <div
                key={date.toISOString()}
                className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => handleDateClick(date)}
              >
                <div className="calendar-day-number">{date.getDate()}</div>
                {dayTasks.length > 0 && (
                  <div className="calendar-day-tasks">
                    {dayTasks.slice(0, 3).map(task => (
                      <div
                        key={task.id}
                        className={`calendar-day-task-chip ${task.urgency} ${task.completed ? 'completed' : ''}`}
                        title={task.title}
                      >
                        {task.title.length > 12 ? task.title.slice(0, 12) + '…' : task.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="calendar-task-more">+{dayTasks.length - 3} more</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Task Modal */}
        {showTaskModal && selectedDate && (
          <div className="calendar-modal-overlay" onClick={() => setShowTaskModal(false)}>
            <div className="calendar-modal" onClick={(e) => e.stopPropagation()}>
              <div className="calendar-modal-header">
                <h3>{formatDate(selectedDate)}</h3>
                <button className="modal-close-btn" onClick={() => setShowTaskModal(false)} aria-label="Close">
                  <Icon name="close" size={16} />
                </button>
              </div>

              {/* Task List */}
              <div className="calendar-task-list">
                {selectedDateTasks.length > 0 ? (
                  selectedDateTasks.map(task => (
                    <div key={task.id} className="calendar-task-item">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => onToggleTask(task.id)}
                        className="task-checkbox"
                      />
                      <div className="task-content">
                        <div className={`task-title ${task.completed ? 'completed' : ''}`}>
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="task-description">{task.description}</div>
                        )}
                        <div className="task-meta">
                          <span className={`urgency-badge ${task.urgency}`}>
                            {task.urgency} priority
                          </span>
                        </div>
                      </div>
                      <div className="task-actions">
                        <button onClick={() => startEdit(task)} className="edit-btn" title="Edit task" aria-label="Edit task">
                          <Icon name="edit" size={16} />
                        </button>
                        <button onClick={() => onDeleteTask(task.id)} className="delete-btn" title="Delete task" aria-label="Delete task">
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-tasks">Nothing planned.</p>
                )}
              </div>

              {/* Add/Edit Task Form */}
              <form onSubmit={editingTask ? handleEditTask : handleAddTask} className="calendar-task-form">
                <h4>{editingTask ? 'Edit task' : 'New task'}</h4>
                <input
                  type="text"
                  placeholder="Task title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="task-input"
                  required
                />
                <textarea
                  placeholder="Description (optional)"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="task-textarea"
                />
                <select
                  value={newTask.urgency}
                  onChange={(e) => setNewTask({ ...newTask, urgency: e.target.value as "high" | "medium" | "low" })}
                  className="task-select"
                >
                  <option value="high">High priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="low">Low priority</option>
                </select>
                <input
                  type="number"
                  placeholder="Estimated time (minutes)"
                  value={newTask.estimatedTime}
                  onChange={(e) => setNewTask({ ...newTask, estimatedTime: e.target.value })}
                  className="task-input"
                />
                <ReminderFields
                  dueDate={newTask.dueDate}
                  dueTime={newTask.dueTime}
                  reminder={newTask.reminder}
                  onChange={(updates) => setNewTask(prev => ({ ...prev, ...updates }))}
                />
                <div className="form-actions">
                  {editingTask && (
                    <button type="button" onClick={() => {
                      setEditingTask(null)
                      setNewTask(blankTaskFor(selectedDate))
                    }} className="cancel-btn">Cancel</button>
                  )}
                  <button type="submit" className="save-task-btn">
                    {editingTask ? 'Save changes' : 'Add task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ----- App -----
export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [sessions, setSessions] = useState<PomodoroSession[]>([])
  const [theme, setTheme] = useState<"dark" | "light">(
    () => (localStorage.getItem('taskmate-theme') as "dark" | "light") || "dark"
  )
  const [pushStatus, setPushStatus] = useState<PushStatus>("off")

  useEffect(() => {
    if (!user) return
    refreshPushRegistration().then(setPushStatus)
  }, [user?.id])

  useEffect(() => {
    const onStatus = (e: Event) => setPushStatus((e as CustomEvent<PushStatus>).detail)
    window.addEventListener(PUSH_STATUS_EVENT, onStatus)
    return () => window.removeEventListener(PUSH_STATUS_EVENT, onStatus)
  }, [])

  async function handleEnableReminders() {
    try {
      await enablePushReminders()
    } catch (error: any) {
      console.error('Could not turn on reminders:', error)
      alert('Could not turn on reminders: ' + (error.message || 'Unknown error'))
    }
  }

  function getLocalDateKey(date: Date): string {
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, "0")
    const day = `${date.getDate()}`.padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  function getTaskDateKey(dateValue?: string): string | null {
    if (!dateValue) return null
    return dateValue.split("T")[0]
  }

  async function moveOverdueTasksToToday(loadedTasks: Task[]) {
    const todayKey = getLocalDateKey(new Date())
    const overdueTasks = loadedTasks.filter(task => {
      if (task.completed) return false
      const dueDateKey = getTaskDateKey(task.dueDate)
      if (!dueDateKey) return false
      return dueDateKey < todayKey
    })

    if (overdueTasks.length === 0) return

    console.log(`Auto-rescheduling ${overdueTasks.length} overdue task(s) to today`)

    await Promise.all(
      overdueTasks.map(task =>
        updateTask(task.id, { dueDate: todayKey })
      )
    )

    setTasks(prev =>
      prev.map(task => {
        const isOverdue = overdueTasks.some(overdueTask => overdueTask.id === task.id)
        return isOverdue ? { ...task, dueDate: todayKey } : task
      })
    )
  }

  // Load user from localStorage on mount and check Firebase auth state
  useEffect(() => {
    const savedUser = localStorage.getItem('taskmate-user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    
    // Listen for Firebase auth state changes
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        console.log('Firebase user authenticated:', firebaseUser.uid)
        // Update user with Firebase UID if different
        if (savedUser) {
          const localUser = JSON.parse(savedUser)
          if (localUser.id !== firebaseUser.uid) {
            const updatedUser = { ...localUser, id: firebaseUser.uid }
            setUser(updatedUser)
            localStorage.setItem('taskmate-user', JSON.stringify(updatedUser))
          }
        }
      } else {
        console.log('No Firebase user authenticated')
      }
    })
    
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('taskmate-theme', theme)
  }, [theme])

  // Load user data when user changes
  useEffect(() => {
    if (user) {
      // Wait for Firebase auth to be ready
      const waitForAuth = async () => {
        let attempts = 0
        while (attempts < 10) { // Try for up to 5 seconds
          if (auth.currentUser) {
            console.log('Firebase auth ready, loading data...')
      loadUserData()
            return
          }
          await new Promise(resolve => setTimeout(resolve, 500))
          attempts++
        }
        console.log('Firebase auth not ready after 5 seconds, trying anyway...')
        loadUserData()
      }
      waitForAuth()
    }
  }, [user])

  async function loadUserData() {
    if (!user) return

    try {
      console.log('Loading data for user:', user.id)
      console.log('Firebase auth current user:', auth.currentUser?.uid)
      console.log('User from localStorage:', user)
      
      // Check Firebase connectivity
      if (!auth.currentUser) {
        console.log('No Firebase auth user found, checking if user needs to re-authenticate...')
        
        // If we have a user in localStorage but no Firebase auth, they need to log in again
        if (user && user.id) {
          console.log('User exists in localStorage but not authenticated with Firebase')
          console.log('This usually means the user needs to log in again')
          throw new Error('Your session has expired. Please log in again.')
        }
        
        throw new Error('No authenticated user found. Please log in again.')
      }
      
      // Use Firebase authenticated user ID
      const userId = auth.currentUser.uid
      console.log('Using userId for data loading:', userId)
      
      const userTasks = await getTasks(userId)
      console.log('Loaded tasks:', userTasks)
      const userSessions = await getSessions(userId)
      console.log('Loaded sessions:', userSessions)
      
      const mappedTasks = userTasks.map((dbTask: any) => ({
        id: dbTask.id,
        title: dbTask.title,
        description: dbTask.description,
        dueDate: dbTask.dueDate,
        urgency: dbTask.urgency,
        estimatedTime: dbTask.estimatedTime,
        energy: dbTask.energy,
        energyType: dbTask.energyType,
        dueTime: dbTask.dueTime,
        reminderMinutes: dbTask.reminderMinutes,
        remindAt: dbTask.remindAt,
        completed: dbTask.completed,
        completedAt: dbTask.completedAt,
        createdAt: dbTask.createdAt
      }))

      setTasks(mappedTasks)
      await moveOverdueTasksToToday(mappedTasks)

      setSessions(userSessions.map((dbSession: any) => ({
        id: dbSession.id,
        taskId: dbSession.taskId,
        startTime: dbSession.startTime,
        endTime: dbSession.endTime,
        duration: dbSession.duration,
        completed: dbSession.completed
      })))
    } catch (error) {
      console.error('Error loading user data:', error)
      console.error('Error details:', {
        message: (error as any).message,
        code: (error as any).code,
        user: user,
        authUser: auth.currentUser
      })
      
      // Provide more specific error messages
      let errorMessage = 'Failed to load your data'
      if ((error as any).code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your authentication or try logging in again.'
      } else if ((error as any).code === 'unauthenticated') {
        errorMessage = 'Please log in again to access your tasks.'
      } else if ((error as any).message) {
        errorMessage = (error as any).message
      }
      
      // If the error suggests the user needs to log in again, clear the stored user
      if (errorMessage.includes('log in again') || errorMessage.includes('session has expired')) {
        console.log('Clearing stored user due to authentication error')
        localStorage.removeItem('taskmate-user')
        setUser(null)
      }
      
      alert(errorMessage)
    }
  }

  // Clean up old completed tasks (older than 1 day)
  useEffect(() => {
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)
    
    setTasks(prev => prev.filter(task => {
      if (!task.completed) return true
      if (!task.completedAt) return true
      return new Date(task.completedAt) > oneDayAgo
    }))
  }, [])

  function handleLogin(user: User) {
    setUser(user)
    localStorage.setItem('taskmate-user', JSON.stringify(user))
  }

  function handleLogout() {
    setUser(null)
    setTasks([])
    setSessions([])
    localStorage.removeItem('taskmate-user')
  }

  async function addTask(taskData: Omit<Task, 'id' | 'createdAt'>) {
    if (!user) return

    try {
      const newTask = await createTask({
        userId: user.id,
        title: taskData.title,
        description: taskData.description,
        dueDate: taskData.dueDate,
        urgency: taskData.urgency,
        estimatedTime: taskData.estimatedTime,
        energy: taskData.energy,
        energyType: taskData.energyType,
        dueTime: taskData.dueTime,
        reminderMinutes: taskData.reminderMinutes,
        remindAt: computeRemindAt(taskData),
        completed: taskData.completed,
        completedAt: taskData.completedAt
      })

      // Add the new task to local state
      setTasks(prev => [...prev, newTask])
    } catch (error: any) {
      console.error('Error adding task:', error)
      alert('Failed to add task: ' + (error.message || 'Unknown error'))
    }
  }

  async function toggleTask(id: string) {
    try {
      const task = tasks.find(t => t.id === id)
      if (!task) return

      const completed = !task.completed
      const changes = {
        completed,
        completedAt: completed ? new Date().toISOString() : undefined,
        remindAt: computeRemindAt({ ...task, completed })
      }

      await updateTask(id, changes)

      setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...changes } : t)))
    } catch (error) {
      console.error('Error toggling task:', error)
    }
  }

  async function deleteTask(id: string) {
    try {
      await deleteTaskFromDB(id)
      setTasks(prev => prev.filter(task => task.id !== id))
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Failed to delete task')
    }
  }

  async function editTask(id: string, updates: Partial<Task>) {
    try {
      console.log('Starting edit task:', id, updates)
      console.log('Environment:', import.meta.env.MODE)
      console.log('User:', user?.id)
      
      // Check if user is logged in
      if (!user) {
        throw new Error('Please log in to update tasks')
      }
      
      const existing = tasks.find(t => t.id === id)
      if (existing) {
        updates = { ...updates, remindAt: computeRemindAt({ ...existing, ...updates }) }
      }

      await updateTask(id, updates)
      
      setTasks(prev => prev.map(task => {
        if (task.id === id) {
          const updatedTask = { ...task, ...updates }
          console.log('Updated task in state:', updatedTask)
          return updatedTask
        }
        return task
      }))
      
      console.log('Task updated successfully')
    } catch (error) {
      console.error('Error updating task:', error)
      console.error('Full error object:', error)
      
      // Show more detailed error message
      const errorMessage = (error as any).message || 'Unknown error occurred'
      alert(`Failed to update task: ${errorMessage}\n\nPlease check the console for more details.`)
    }
  }

  async function addSession(sessionData: Omit<PomodoroSession, 'id'>) {
    if (!user) return

    try {
      const newSession = await createSession({
        userId: user.id,
        taskId: sessionData.taskId,
        startTime: sessionData.startTime,
        endTime: sessionData.endTime,
        duration: sessionData.duration,
        completed: sessionData.completed
      })

      setSessions(prev => [...prev, {
        id: newSession.id,
        taskId: newSession.taskId,
        startTime: newSession.startTime,
        endTime: newSession.endTime,
        duration: newSession.duration,
        completed: newSession.completed
      }])
    } catch (error) {
      console.error('Error adding session:', error)
    }
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <Router>
             <Layout 
          user={user} 
          onLogout={handleLogout} 
          theme={theme}
          onToggleTheme={() => setTheme(prev => prev === "dark" ? "light" : "dark")}
          pushStatus={pushStatus}
          onEnableReminders={handleEnableReminders}
        >
        <Routes>
          <Route path="/" element={<HomePage userName={user.name} tasks={tasks} onAddTask={addTask} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/tasks" element={
            <TasksPage 
              tasks={tasks} 
              onAddTask={addTask}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              onEditTask={editTask}
            />
          } />
          <Route path="/notes" element={<NotesPage userId={user.id} onAddTask={addTask} />} />
          <Route path="/pomodoro" element={
            <PomodoroPage 
              tasks={tasks}
              onAddSession={addSession}
            />
          } />
          <Route path="/calendar" element={
            <CalendarPage 
              tasks={tasks}
              onAddTask={addTask}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              onEditTask={editTask}
            />
          } />
          <Route path="/analytics" element={
            <AnalyticsPage 
              tasks={tasks} 
              sessions={sessions}
            />
          } />
        </Routes>
      </Layout>
    </Router>
  )
}
