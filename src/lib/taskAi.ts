import { auth } from '../firebase';

const AI_API_URL = (import.meta.env.VITE_AI_API_URL as string | undefined) || '/api/extract-tasks';

export type Level = 'high' | 'medium' | 'low';
export type EnergyType = 'mental' | 'physical' | 'mixed';

export type NewTask = {
  title: string;
  description?: string;
  dueDate?: string;
  urgency: Level;
  estimatedTime?: number;
  energy?: Level;
  energyType?: EnergyType;
  completed: boolean;
};

export type SuggestedTask = {
  key: string;
  title: string;
  description: string;
  energy: Level;
  energyType: EnergyType;
  urgency: Level;
  estimatedTime: number;
  dueDate: string | null;
  selected: boolean;
};

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function requestTaskBreakdown(note: string): Promise<SuggestedTask[]> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Please log in again to use AI features.');

  const res = await fetch(AI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ note, today: todayKey() }),
  });
  const data = await res.json().catch(() => ({}));
  // Static hosts like GitHub Pages have no /api route
  if (res.status === 404 || res.status === 405) {
    throw new Error("AI sorting isn't available on this version of the site yet. Your note was kept.");
  }
  if (!res.ok) throw new Error(data.error || `AI request failed (${res.status})`);

  return (data.tasks || []).map((task: Omit<SuggestedTask, 'key' | 'selected'>, index: number) => ({
    ...task,
    key: `${Date.now()}-${index}`,
    selected: true,
  }));
}
