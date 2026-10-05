import { useState } from 'react';
import Icon from './Icon';

const PRESETS = [
  { name: 'Deep Focus', uri: 'playlist/37i9dQZF1DWZeKCadgRdKQ' },
  { name: 'Lo-fi beats', uri: 'playlist/37i9dQZF1DWWQRwui0ExPn' },
  { name: 'Peaceful Piano', uri: 'playlist/37i9dQZF1DX4sWSpwq3LiO' },
  { name: 'Brain Food', uri: 'playlist/37i9dQZF1DWXLeA8Omikj7' },
  { name: 'Instrumental Study', uri: 'playlist/37i9dQZF1DX9sIqqvKsjG8' },
  { name: 'Intense Studying', uri: 'playlist/37i9dQZF1DX8NTLI2TtZa6' },
];

const STORAGE_KEY = 'taskmate-spotify';
const VIEW_KEY = 'taskmate-spotify-view';
const CUSTOM = 'custom';

type View = 'expanded' | 'compact' | 'hidden';

/** Accepts open.spotify.com links (with or without /intl-xx/) and spotify: URIs. */
export function parseSpotifyLink(input: string): string | null {
  const text = input.trim();
  const urlMatch = text.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(playlist|album|track|artist|episode|show)\/([A-Za-z0-9]+)/);
  if (urlMatch) return `${urlMatch[1]}/${urlMatch[2]}`;
  const uriMatch = text.match(/^spotify:(playlist|album|track|artist|episode|show):([A-Za-z0-9]+)$/);
  if (uriMatch) return `${uriMatch[1]}/${uriMatch[2]}`;
  return null;
}

function loadSaved(): { uri: string; custom: boolean } {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '');
    if (typeof saved.uri === 'string') return saved;
  } catch {
    // Nothing saved yet
  }
  return { uri: PRESETS[0].uri, custom: false };
}

function loadView(): View {
  const saved = localStorage.getItem(VIEW_KEY);
  if (saved === 'compact' || saved === 'hidden' || saved === 'expanded') return saved;
  return window.innerWidth < 1200 ? 'compact' : 'expanded';
}

const SpotifyPlayer = () => {
  const [selection, setSelection] = useState(loadSaved);
  const [view, setViewState] = useState<View>(loadView);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  function setView(next: View) {
    setViewState(next);
    localStorage.setItem(VIEW_KEY, next);
  }

  function choose(uri: string, custom: boolean) {
    const next = { uri, custom };
    setSelection(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function handleSelect(value: string) {
    if (value === CUSTOM) {
      setShowLinkInput(true);
      return;
    }
    setShowLinkInput(false);
    choose(value, false);
  }

  function handleLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    const uri = parseSpotifyLink(link);
    if (!uri) {
      setLinkError('That doesn\'t look like a Spotify link. In Spotify, use Share → Copy link.');
      return;
    }
    choose(uri, true);
    setLink('');
    setLinkError(null);
    setShowLinkInput(false);
  }

  const selectValue = showLinkInput || selection.custom ? CUSTOM : selection.uri;

  return (
    <>
      {/* The panel stays mounted while hidden so music keeps playing */}
      <div className={`spotify-player ${view}`} aria-hidden={view === 'hidden'}>
        <div className="spotify-header">
          <span className="spotify-badge">Spotify</span>
          <select
            className="spotify-select"
            value={selectValue}
            onChange={(e) => handleSelect(e.target.value)}
            aria-label="Choose a playlist"
          >
            {PRESETS.map(preset => (
              <option key={preset.uri} value={preset.uri}>{preset.name}</option>
            ))}
            <option value={CUSTOM}>{selection.custom ? 'My own link' : 'Use my own link...'}</option>
          </select>
          <button
            className="spotify-icon-btn"
            onClick={() => setView(view === 'expanded' ? 'compact' : 'expanded')}
            title={view === 'expanded' ? 'Make smaller' : 'Make bigger'}
            aria-label={view === 'expanded' ? 'Make smaller' : 'Make bigger'}
          >
            <Icon name={view === 'expanded' ? 'minimize' : 'maximize'} size={16} />
          </button>
          <button
            className="spotify-icon-btn"
            onClick={() => setView('hidden')}
            title="Hide player (music keeps playing)"
            aria-label="Hide player"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {showLinkInput && (
          <form className="spotify-link-form" onSubmit={handleLinkSubmit}>
            <input
              type="text"
              className="spotify-link-input"
              placeholder="Paste a Spotify playlist, album or song link"
              value={link}
              onChange={(e) => { setLink(e.target.value); setLinkError(null); }}
              autoFocus
            />
            <button type="submit" className="spotify-link-btn">Play</button>
          </form>
        )}
        {linkError && <p className="spotify-link-error">{linkError}</p>}

        <iframe
          key={selection.uri}
          className="spotify-embed"
          title="Spotify player"
          src={`https://open.spotify.com/embed/${selection.uri}?utm_source=generator&theme=0`}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
      </div>

      {view === 'hidden' && (
        <button className="spotify-reopen" onClick={() => setView('expanded')} title="Show Spotify player">
          <Icon name="music" size={18} /> Music
        </button>
      )}
    </>
  );
};

export default SpotifyPlayer;
