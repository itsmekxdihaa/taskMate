import { useRef, useState } from 'react';
import Icon from './Icon';
import TaskSuggestionsModal from './TaskSuggestionsModal';
import { appendText, speechSupported, useSpeechToText } from '../hooks/useSpeechToText';
import { requestTaskBreakdown, todayKey, type NewTask, type SuggestedTask } from '../lib/taskAi';

const QuickAddBar = ({ onAddTask }: { onAddTask: (task: NewTask) => Promise<void> }) => {
  const [text, setText] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isFindingTasks, setIsFindingTasks] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedTask[] | null>(null);
  const textRef = useRef('');
  textRef.current = text;

  const speech = useSpeechToText({
    onFinalText: (spoken) => setText(prev => appendText(prev, spoken)),
    onEnd: () => {
      if (textRef.current.trim()) findTasks(textRef.current);
    },
  });

  function showMessage(type: 'success' | 'error', messageText: string) {
    setMessage({ type, text: messageText });
    if (type === 'success') setTimeout(() => setMessage(null), 5000);
  }

  async function findTasks(spoken: string) {
    setIsFindingTasks(true);
    setMessage(null);
    try {
      const tasks = await requestTaskBreakdown(spoken.trim());
      if (tasks.length === 0) {
        showMessage('error', 'No tasks found. Edit the text and press Add.');
        return;
      }
      setSuggestions(tasks);
    } catch (error: any) {
      showMessage('error', error.message || 'Something went wrong finding tasks.');
    } finally {
      setIsFindingTasks(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = text.trim();
    if (!title || isFindingTasks) return;
    await onAddTask({ title, urgency: 'medium', dueDate: todayKey(), completed: false });
    setText('');
    showMessage('success', `Added "${title}".`);
  }

  const placeholder = speech.isListening
    ? 'Listening...'
    : isFindingTasks
      ? 'Finding tasks...'
      : speechSupported
        ? 'Add a task, or tap the mic'
        : 'Add a task';

  return (
    <div className="quick-add">
      <form className={`quick-add-bar ${speech.isListening ? 'listening' : ''}`} onSubmit={handleSubmit}>
        <input
          type="text"
          className="quick-add-input"
          placeholder={placeholder}
          value={speech.isListening && speech.interimText ? appendText(text, speech.interimText) : text}
          onChange={(e) => setText(e.target.value)}
          disabled={speech.isListening || isFindingTasks}
          aria-label="New task"
        />
        {speechSupported && (
          <button
            type="button"
            className={`quick-add-mic ${speech.isListening ? 'listening' : ''}`}
            onClick={speech.isListening ? speech.stop : speech.start}
            disabled={isFindingTasks}
            title={speech.isListening ? 'Stop and turn what you said into tasks' : 'Talk instead of typing'}
            aria-label={speech.isListening ? 'Stop recording' : 'Start recording'}
          >
            <Icon name={speech.isListening ? 'stop' : 'mic'} size={20} />
          </button>
        )}
        <button
          type="submit"
          className="quick-add-submit"
          disabled={!text.trim() || speech.isListening || isFindingTasks}
        >
          {isFindingTasks ? 'Working...' : 'Add'}
        </button>
      </form>

      {speech.isListening && <p className="quick-add-hint">Tap stop when you're done.</p>}
      {speech.error && <p className="note-error">{speech.error}</p>}
      {message && <p className={message.type === 'success' ? 'note-success' : 'note-error'}>{message.text}</p>}

      {suggestions && (
        <TaskSuggestionsModal
          sourceTitle="what you said"
          initialTasks={suggestions}
          onAddTask={onAddTask}
          onClose={() => setSuggestions(null)}
          onAdded={(count) => {
            setSuggestions(null);
            setText('');
            showMessage('success', `Added ${count} task${count === 1 ? '' : 's'}.`);
          }}
        />
      )}
    </div>
  );
};

export default QuickAddBar;
