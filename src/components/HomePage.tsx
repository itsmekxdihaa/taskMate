import { useNavigate } from 'react-router-dom';
import QuickAddBar from './QuickAddBar';
import Icon from './Icon';
import { todayKey, type NewTask } from '../lib/taskAi';

type HomeTask = {
  id: string;
  title: string;
  dueDate?: string;
  completed: boolean;
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

type Props = {
  userName: string;
  tasks: HomeTask[];
  onAddTask: (task: NewTask) => Promise<void>;
};

const HomePage = ({ userName, tasks, onAddTask }: Props) => {
  const navigate = useNavigate();
  const today = todayKey();
  const dueToday = tasks.filter(task => !task.completed && task.dueDate?.slice(0, 10) === today);

  return (
    <div className="home-page">
      <div className="home-header">
        <h1 className="page-title">{greeting()}, {userName}</h1>
        <p className="page-subtitle">What do you need to get done?</p>
      </div>

      <div className="ai-callout">
        <Icon name="sparkle" size={14} />
        <span><strong>AI-organized.</strong> Speak your tasks and they're sorted by energy.</span>
      </div>

      <QuickAddBar onAddTask={onAddTask} />

      <div className="home-today">
        <div className="home-today-header">
          <h3>Due today</h3>
          <button className="home-link-btn" onClick={() => navigate('/tasks')}>See all tasks</button>
        </div>
        {dueToday.length === 0 ? (
          <p className="home-today-empty">Nothing due today.</p>
        ) : (
          <ul className="home-today-list">
            {dueToday.slice(0, 5).map(task => (
              <li key={task.id}>{task.title}</li>
            ))}
            {dueToday.length > 5 && <li className="home-today-more">and {dueToday.length - 5} more</li>}
          </ul>
        )}
      </div>
    </div>
  );
};

export default HomePage;
