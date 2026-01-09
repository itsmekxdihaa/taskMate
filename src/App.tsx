
import { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, NavLink, Navigate } from "react-router-dom";
import "./App.css";
import MusicPlayer from "./components/MusicPlayer";
import { signUp, signIn, createTask, getTasks, updateTask, deleteTask as deleteTaskFromDB, createSession, getSessions, auth } from "./firebase";

// Enhanced Task type
type Task = { 
  id: string; 
  title: string; 
  description?: string;
  dueDate?: string;
  urgency: "high" | "medium" | "low";
  estimatedTime?: number;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
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
           <h1 className="login-title">TaskMate</h1>
           <p className="login-subtitle">Your cozy task companion</p>
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
            {isSignUp ? "Sign Up" : "Login"}
          </button>
        </form>
        
        <button 
          onClick={() => setIsSignUp(!isSignUp)} 
          className="toggle-auth-btn"
        >
          {isSignUp ? "Already have an account? Login" : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  )
}

// ----- Layout -----
function Layout({ children, user, onLogout, isMusicPlaying, toggleMusic, currentBackground, onBackgroundChange }: { 
  children: React.ReactNode; 
  user: User;
  onLogout: () => void;
  isMusicPlaying: boolean;
  toggleMusic: () => void;
  currentBackground: number;
  onBackgroundChange: (index: number) => void;
}) {
  const [sidebarHidden, setSidebarHidden] = useState(false)

  return (
    <div className={`app-container ${sidebarHidden ? 'sidebar-hidden' : ''}`}>
      <button 
        className="sidebar-toggle"
        onClick={() => setSidebarHidden(!sidebarHidden)}
        title={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
      >
        {sidebarHidden ? "☰" : "✕"}
      </button>
      <aside className="sidebar">
                 <div className="logo-section">
           <h2 className="app-title">TaskMate</h2>
           <p className="app-subtitle">Welcome, {user.name}!</p>
         </div>
        <nav className="nav-menu">
          <NavLink to="/tasks" className="nav-link">
            <span className="nav-icon">📋</span>
            Tasks
          </NavLink>
          <NavLink to="/pomodoro" className="nav-link">
            <span className="nav-icon">⏰</span>
            Pomodoro Timer
          </NavLink>
                     <NavLink to="/analytics" className="nav-link">
             <span className="nav-icon">📊</span>
             Analytics
           </NavLink>
        </nav>
        <div className="sidebar-footer">
                     <div className="background-switcher">
             <div className="background-label">Theme: {currentBackground}</div>
             <div className="background-options">
                               {[
                  { num: 1, label: '🌿' },
                  { num: 2, label: '⚫' },
                  { num: 3, label: '🌸' },
                  { num: 4, label: '💕' },
                  { num: 5, label: '🖤' }
                ].map(({ num, label }) => (
                 <button
                   key={num}
                   className={`background-btn ${currentBackground === num ? 'active' : ''}`}
                   onClick={() => onBackgroundChange(num)}
                   title={`Theme ${num}`}
                 >
                   {label}
                 </button>
               ))}
            </div>
          </div>
          <div className="music-controls">
            <MusicPlayer isPlaying={isMusicPlaying} onToggle={toggleMusic} />
          </div>
          <button onClick={onLogout} className="logout-btn">
            <span className="nav-icon">🚪</span>
            Logout
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}

// ----- Tasks Page -----
function TasksPage({ tasks, onAddTask, onToggleTask, onDeleteTask, onEditTask }: { 
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, task: Partial<Task>) => void;
}) {
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all")
  const [showCompleted, setShowCompleted] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    dueDate: "",
    urgency: "medium" as const,
    estimatedTime: "",
    completed: false
  })
  const [editTask, setEditTask] = useState({
    title: "",
    description: "",
    dueDate: "",
    urgency: "medium" as "high" | "medium" | "low",
    estimatedTime: "",
    completed: false
  })

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
    high: "#ff6b6b",
    medium: "#ffd93d", 
    low: "#6bcf7f"
  }

  const urgencyLabels = {
    high: "🔥 High Priority",
    medium: "⚡ Medium Priority", 
    low: "🌱 Low Priority"
  }

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTask.title.trim()) return

    onAddTask({
      title: newTask.title,
      description: newTask.description || undefined,
      dueDate: newTask.dueDate || undefined,
      urgency: newTask.urgency,
      estimatedTime: newTask.estimatedTime ? parseInt(newTask.estimatedTime) : undefined,
      completed: false
    })

    setNewTask({
      title: "",
      description: "",
      dueDate: "",
      urgency: "medium",
      estimatedTime: "",
      completed: false
    })
    setShowAddForm(false)
  }

  function startEditTask(task: Task) {
    setEditingTaskId(task.id)
    setEditTask({
      title: task.title,
      description: task.description || "",
      dueDate: task.dueDate || "",
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
      urgency: editTask.urgency,
      estimatedTime: editTask.estimatedTime ? parseInt(editTask.estimatedTime) : undefined,
      completed: editTask.completed
    }

    console.log('Submitting edit task:', editingTaskId, updateData)
    onEditTask(editingTaskId, updateData)

    setEditingTaskId(null)
    setEditTask({
      title: "",
      description: "",
      dueDate: "",
      urgency: "medium",
      estimatedTime: "",
      completed: false
    })
  }

  function cancelEdit() {
    setEditingTaskId(null)
    setEditTask({
      title: "",
      description: "",
      dueDate: "",
      urgency: "medium",
      estimatedTime: "",
      completed: false
    })
  }

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <h1 className="page-title">📋 Your Tasks</h1>
        <div className="tasks-controls">
                     <button 
             onClick={() => setShowAddForm(!showAddForm)}
             className="add-task-btn"
           >
             Add New Task
           </button>
          <div className="filter-controls">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
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
            <div className="form-actions">
              <button type="submit" className="save-task-btn">Save Task</button>
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
          <h3>Edit Task</h3>
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
            <div className="form-actions">
              <button type="submit" className="save-task-btn">Update Task</button>
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
                            📅 Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        {task.estimatedTime && (
                          <span className="task-time">
                            ⏱️ {task.estimatedTime} min
                          </span>
                        )}
                        {task.completed && task.completedAt && (
                          <span className="task-completed">
                            ✅ Completed: {new Date(task.completedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="task-actions">
                      <button 
                        onClick={() => startEditTask(task)}
                        className="edit-btn"
                        title="Edit task"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => onDeleteTask(task.id)}
                        className="delete-btn"
                        title="Delete task"
                      >
                        🗑️
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
            <p>✨ No tasks found. Add your first task to get started!</p>
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

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
    } else if (timeLeft === 0) {
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
      if (isBreak) {
        setTimeLeft(workTime)
        setIsBreak(false)
      } else {
        setTimeLeft(breakTime)
        setIsBreak(true)
      }
      setIsRunning(false)
      setSessionStart(null)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, timeLeft, isBreak, selectedTask, sessionStart, onAddSession])

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
               {isBreak ? '🌿 Break Time' : ''}
             </div>
          </div>
        </div>

        <div className="timer-controls">
          {!isRunning ? (
            <button onClick={startTimer} className="start-btn">
              ▶️ Start Session
            </button>
          ) : (
            <button onClick={pauseTimer} className="pause-btn">
              ⏸️ Pause
            </button>
          )}
          <button onClick={resetTimer} className="reset-btn">
            🔄 Reset
          </button>
        </div>

                 <div className="task-selection">
           
          <select
            value={selectedTask || ""}
                         onChange={(e) => setSelectedTask(e.target.value || null)}
            className="task-select"
          >
            <option value="">No specific task</option>
            {pendingTasks.map(task => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </div>

        <div className="pomodoro-info">
          <div className="info-card">
            <h4>📚 How it works:</h4>
            <ul>
              <li>Work for 25 minutes, then take a 5-minute break</li>
              <li>After 4 work sessions, take a longer 15-minute break</li>
              <li>Choose a task to focus on during your work session</li>
              <li>Track your productivity and focus time</li>
            </ul>
          </div>
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
        <h1 className="page-title">📊 Task Analytics</h1>
        <p className="page-subtitle">Track your productivity and progress</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{tasks.length}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{completedTasks.length}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{pendingTasks.length}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{highPriorityTasks.length}</div>
          <div className="stat-label">High Priority</div>
        </div>
      </div>

      <div className="progress-section">
        <h3>Progress Overview</h3>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${completionRate}%` }}
          ></div>
        </div>
        <p className="progress-text">{completionRate.toFixed(1)}% Complete</p>
      </div>

      <div className="time-section">
        <h3>Time Tracking</h3>
        <div className="time-stats">
          <div className="time-stat">
            <span className="time-label">Total Estimated Time:</span>
            <span className="time-value">{totalTime} minutes</span>
          </div>
          <div className="time-stat">
            <span className="time-label">Completed Time:</span>
            <span className="time-value">{completedTime} minutes</span>
          </div>
          <div className="time-stat">
            <span className="time-label">Pomodoro Sessions:</span>
            <span className="time-value">{completedSessions.length}</span>
          </div>
          <div className="time-stat">
            <span className="time-label">Total Focus Time:</span>
            <span className="time-value">{totalPomodoroTime} minutes</span>
          </div>
        </div>
      </div>

      <div className="recent-activity">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          {completedTasks
            .sort((a, b) => new Date(b.completedAt || "").getTime() - new Date(a.completedAt || "").getTime())
            .slice(0, 5)
            .map(task => (
              <div key={task.id} className="activity-item">
                <span className="activity-icon">✅</span>
                <span className="activity-text">Completed: {task.title}</span>
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

// ----- App -----
export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [sessions, setSessions] = useState<PomodoroSession[]>([])
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [currentBackground, setCurrentBackground] = useState(1)

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

  // Set initial background
  useEffect(() => {
    document.body.setAttribute('data-background', '1')
  }, [])

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
      
      setTasks(userTasks.map((dbTask: any) => ({
        id: dbTask.id,
        title: dbTask.title,
        description: dbTask.description,
        dueDate: dbTask.dueDate,
        urgency: dbTask.urgency,
        estimatedTime: dbTask.estimatedTime,
        completed: dbTask.completed,
        completedAt: dbTask.completedAt,
        createdAt: dbTask.createdAt
      })))

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

  // Update body background when currentBackground changes
  useEffect(() => {
    console.log('Changing background to:', currentBackground)
    document.body.setAttribute('data-background', currentBackground.toString())
  }, [currentBackground])

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

      await updateTask(id, {
        completed: !task.completed,
        completedAt: !task.completed ? new Date().toISOString() : undefined
      })

      setTasks(prev => prev.map(task => {
        if (task.id === id) {
          return {
            ...task,
            completed: !task.completed,
            completedAt: !task.completed ? new Date().toISOString() : undefined
          }
        }
        return task
      }))
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

  function toggleMusic() {
    setIsMusicPlaying(!isMusicPlaying)
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <Router>
             <Layout 
          user={user} 
          onLogout={handleLogout} 
          isMusicPlaying={isMusicPlaying} 
          toggleMusic={toggleMusic}
          currentBackground={currentBackground}
          onBackgroundChange={setCurrentBackground}
        >
        <Routes>
          <Route path="/" element={<Navigate to="/tasks" replace />} />
          <Route path="/tasks" element={
            <TasksPage 
              tasks={tasks} 
              onAddTask={addTask}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              onEditTask={editTask}
            />
          } />
          <Route path="/pomodoro" element={
            <PomodoroPage 
              tasks={tasks}
              onAddSession={addSession}
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
