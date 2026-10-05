import { enablePushReminders } from '../lib/push';

export const REMINDER_OPTIONS = [
  { value: '', label: 'No reminder' },
  { value: '0', label: 'Remind me at the due time' },
  { value: '15', label: 'Remind me 15 minutes before' },
  { value: '60', label: 'Remind me 1 hour before' },
  { value: '1440', label: 'Remind me 1 day before' },
];

type Props = {
  dueDate: string;
  dueTime: string;
  reminder: string;
  onChange: (updates: { dueTime?: string; reminder?: string }) => void;
};

const ReminderFields = ({ dueDate, dueTime, reminder, onChange }: Props) => (
  <div className="form-row reminder-fields">
    <input
      type="time"
      value={dueTime}
      onChange={(e) => onChange({ dueTime: e.target.value })}
      className="time-of-day-input"
      title="Due time (optional, defaults to 9:00 AM)"
      aria-label="Due time"
    />
    <select
      value={reminder}
      onChange={(e) => {
        onChange({ reminder: e.target.value });
        // Ask for notification permission right away, while we still have the user's click
        if (e.target.value !== '') enablePushReminders().catch(err => console.warn(err));
      }}
      className="urgency-select"
      disabled={!dueDate}
      title={dueDate ? 'Get a notification before this task is due' : 'Pick a due date to set a reminder'}
    >
      {REMINDER_OPTIONS.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </div>
);

export function parseReminder(value: string): number | undefined {
  return value === '' ? undefined : Number(value);
}

export default ReminderFields;
