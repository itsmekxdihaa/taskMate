import { useState, useEffect } from 'react';
import { createNote, getNotes, updateNote, deleteNote } from '../firebase';
import Icon from './Icon';
import TaskSuggestionsModal from './TaskSuggestionsModal';
import { appendText, speechSupported, useSpeechToText } from '../hooks/useSpeechToText';
import { requestTaskBreakdown, type NewTask, type SuggestedTask } from '../lib/taskAi';

type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

function sortByUpdated(notes: Note[]) {
  return [...notes].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

const NotesPage = ({ userId, onAddTask }: { userId: string; onAddTask: (task: NewTask) => Promise<void> }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [aiLoadingFor, setAiLoadingFor] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedTask[] | null>(null);
  const [suggestionSource, setSuggestionSource] = useState('');

  const speech = useSpeechToText({
    onFinalText: (spoken) => setContent(prev => appendText(prev, spoken)),
  });

  useEffect(() => {
    getNotes(userId)
      .then(data => setNotes(sortByUpdated(data as Note[])))
      .catch(err => console.error('Error loading notes:', err));
  }, [userId]);

  function resetEditor() {
    if (speech.isListening) speech.stop();
    setEditingId(null);
    setTitle('');
    setContent('');
  }

  async function handleSave() {
    const finalContent = content.trim();
    if (!finalContent) return;
    const finalTitle = title.trim() || finalContent.slice(0, 40);

    try {
      if (editingId) {
        const updatedAt = await updateNote(editingId, { title: finalTitle, content: finalContent });
        setNotes(prev => sortByUpdated(prev.map(note =>
          note.id === editingId ? { ...note, title: finalTitle, content: finalContent, updatedAt } : note
        )));
      } else {
        const note = await createNote({ userId, title: finalTitle, content: finalContent });
        setNotes(prev => [note, ...prev]);
      }
      resetEditor();
    } catch (error: any) {
      console.error('Error saving note:', error);
      alert('Failed to save note: ' + (error.message || 'Unknown error'));
    }
  }

  function startEdit(note: Note) {
    if (speech.isListening) speech.stop();
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
  }

  async function breakIntoTasks(source: string, noteText: string, sourceTitle: string) {
    const text = noteText.trim();
    if (!text) return;
    if (speech.isListening) speech.stop();
    setAiError(null);
    setAiSuccess(null);
    setAiLoadingFor(source);
    try {
      const tasks = await requestTaskBreakdown(text);
      if (tasks.length === 0) {
        setAiError("No tasks found in this note.");
        return;
      }
      setSuggestionSource(sourceTitle);
      setSuggestions(tasks);
    } catch (error: any) {
      setAiError(error.message || 'Something went wrong with the AI request.');
    } finally {
      setAiLoadingFor(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this note?')) return;
    try {
      await deleteNote(id);
      setNotes(prev => prev.filter(note => note.id !== id));
      if (editingId === id) resetEditor();
    } catch (error: any) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note');
    }
  }

  return (
    <div className="notes-page">
      <div className="notes-header">
        <h1 className="page-title">Notes</h1>
        <p className="page-subtitle">Speak or type, then turn it into tasks.</p>
      </div>

      <div className="note-editor">
        <input
          type="text"
          className="note-title-input"
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="note-content-input"
          placeholder={speech.isListening ? 'Listening...' : 'Write or record a note'}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
        />
        {speech.interimText && <p className="note-interim">{speech.interimText}</p>}
        {speech.error && <p className="note-error">{speech.error}</p>}
        {!speechSupported && (
          <p className="note-error">
            Voice input needs Chrome, Edge or Safari.
          </p>
        )}

        <div className="note-editor-actions">
          {speechSupported && (
            <button
              type="button"
              className={`mic-btn ${speech.isListening ? 'listening' : ''}`}
              onClick={speech.isListening ? speech.stop : speech.start}
            >
              <Icon name={speech.isListening ? 'stop' : 'mic'} size={16} />
              {speech.isListening ? ' Stop' : ' Record'}
            </button>
          )}
          <button
            type="button"
            className="save-task-btn"
            onClick={handleSave}
            disabled={!content.trim()}
          >
            {editingId ? 'Save changes' : 'Save note'}
          </button>
          <button
            type="button"
            className="ai-btn"
            onClick={() => breakIntoTasks('editor', content, title.trim() ? `"${title.trim()}"` : 'your note')}
            disabled={!content.trim() || aiLoadingFor !== null}
            title="Find the to-dos in this note and sort them by energy level"
          >
            <Icon name="sparkle" size={16} />
            {aiLoadingFor === 'editor' ? ' Finding tasks...' : ' Turn into tasks'}
          </button>
          {(editingId || title || content) && (
            <button type="button" className="cancel-btn" onClick={resetEditor}>
              {editingId ? 'Cancel' : 'Clear'}
            </button>
          )}
        </div>
        {aiError && <p className="note-error">{aiError}</p>}
        {aiSuccess && <p className="note-success">{aiSuccess}</p>}
      </div>

      <div className="notes-list">
        {notes.length === 0 ? (
          <div className="empty-state">
            <p>No notes yet.</p>
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className={`note-card ${editingId === note.id ? 'editing' : ''}`}>
              <div className="note-card-header">
                <h3 className="note-card-title">{note.title}</h3>
                <div className="task-actions">
                  <button onClick={() => startEdit(note)} className="edit-btn" title="Edit note" aria-label="Edit note">
                    <Icon name="edit" size={16} />
                  </button>
                  <button onClick={() => handleDelete(note.id)} className="delete-btn" title="Delete note" aria-label="Delete note">
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </div>
              <p className="note-card-content">{note.content}</p>
              <div className="note-card-footer">
                <span className="note-card-date">{new Date(note.updatedAt).toLocaleString()}</span>
                <button
                  type="button"
                  className="ai-btn small"
                  onClick={() => breakIntoTasks(note.id, note.content, `"${note.title}"`)}
                  disabled={aiLoadingFor !== null}
                  title="Find the to-dos in this note and sort them by energy level"
                >
                  <Icon name="sparkle" size={14} />
                  {aiLoadingFor === note.id ? ' Finding tasks...' : ' Turn into tasks'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {suggestions && (
        <TaskSuggestionsModal
          sourceTitle={suggestionSource}
          initialTasks={suggestions}
          onAddTask={onAddTask}
          onClose={() => setSuggestions(null)}
          onAdded={(count) => {
            setSuggestions(null);
            setAiSuccess(`Added ${count} task${count === 1 ? '' : 's'}.`);
            setTimeout(() => setAiSuccess(null), 6000);
          }}
        />
      )}
    </div>
  );
};

export default NotesPage;
