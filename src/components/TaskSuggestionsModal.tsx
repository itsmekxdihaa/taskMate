import { useState } from 'react';
import Icon from './Icon';
import type { Level, NewTask, SuggestedTask } from '../lib/taskAi';

const ENERGY_GROUPS: { level: Level; label: string }[] = [
  { level: 'high', label: 'High energy' },
  { level: 'medium', label: 'Medium energy' },
  { level: 'low', label: 'Low energy' },
];

const ENERGY_TYPE_LABELS = {
  mental: 'Mental',
  physical: 'Physical',
  mixed: 'Mental & physical',
};

const ENERGY_ORDER = { high: 0, medium: 1, low: 2 };

type Props = {
  sourceTitle: string;
  initialTasks: SuggestedTask[];
  onAddTask: (task: NewTask) => Promise<void>;
  onClose: () => void;
  onAdded: (count: number) => void;
};

const TaskSuggestionsModal = ({ sourceTitle, initialTasks, onAddTask, onClose, onAdded }: Props) => {
  const [suggestions, setSuggestions] = useState(initialTasks);
  const [isAdding, setIsAdding] = useState(false);
  const selectedCount = suggestions.filter(task => task.selected).length;

  function updateSuggestion(key: string, updates: Partial<SuggestedTask>) {
    setSuggestions(prev => prev.map(task => (task.key === key ? { ...task, ...updates } : task)));
  }

  async function addSelected() {
    const chosen = suggestions
      .filter(task => task.selected && task.title.trim())
      .sort((a, b) => ENERGY_ORDER[a.energy] - ENERGY_ORDER[b.energy]);
    if (chosen.length === 0) return;

    setIsAdding(true);
    try {
      for (const task of chosen) {
        await onAddTask({
          title: task.title.trim(),
          description: task.description || undefined,
          dueDate: task.dueDate || undefined,
          urgency: task.urgency,
          estimatedTime: task.estimatedTime || undefined,
          energy: task.energy,
          energyType: task.energyType,
          completed: false,
        });
      }
      onAdded(chosen.length);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="calendar-modal-overlay" onClick={() => !isAdding && onClose()}>
      <div className="calendar-modal ai-review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="calendar-modal-header">
          <div>
            <h3>Suggested tasks from {sourceTitle}</h3>
            <p className="ai-review-subtitle">Sorted by energy. Untick what you don't need.</p>
          </div>
          <button className="modal-close-btn" onClick={onClose} disabled={isAdding} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="ai-review-body">
          {ENERGY_GROUPS.map(group => {
            const groupTasks = suggestions.filter(task => task.energy === group.level);
            if (groupTasks.length === 0) return null;
            return (
              <section key={group.level} className={`energy-group ${group.level}`}>
                <div className="energy-group-header">
                  <h3>{group.label}</h3>
                </div>
                {groupTasks.map(task => (
                  <div key={task.key} className={`suggestion-row ${task.selected ? '' : 'deselected'}`}>
                    <input
                      type="checkbox"
                      checked={task.selected}
                      onChange={(e) => updateSuggestion(task.key, { selected: e.target.checked })}
                    />
                    <div className="suggestion-content">
                      <input
                        type="text"
                        className="suggestion-title"
                        value={task.title}
                        onChange={(e) => updateSuggestion(task.key, { title: e.target.value })}
                      />
                      {task.description && <p className="suggestion-description">{task.description}</p>}
                      <div className="task-meta">
                        <span className="suggestion-chip">{ENERGY_TYPE_LABELS[task.energyType]}</span>
                        {task.estimatedTime > 0 && <span className="suggestion-chip">About {task.estimatedTime} min</span>}
                        {task.dueDate && (
                          <span className="suggestion-chip">Due {new Date(task.dueDate + 'T00:00:00').toLocaleDateString()}</span>
                        )}
                        <select
                          className="suggestion-energy-select"
                          value={task.energy}
                          onChange={(e) => updateSuggestion(task.key, { energy: e.target.value as Level })}
                          title="Move to a different energy level"
                        >
                          <option value="high">High energy</option>
                          <option value="medium">Medium energy</option>
                          <option value="low">Low energy</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            );
          })}
        </div>

        <div className="ai-review-actions">
          <button className="cancel-btn" onClick={onClose} disabled={isAdding}>Cancel</button>
          <button className="save-task-btn" onClick={addSelected} disabled={isAdding || selectedCount === 0}>
            {isAdding ? 'Adding...' : `Add ${selectedCount} to my tasks`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskSuggestionsModal;
