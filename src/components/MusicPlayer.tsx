import { useState, useEffect } from 'react';

interface MusicPlayerProps {
  isPlaying: boolean;
  onToggle: () => void;
}

const MusicPlayer = ({ isPlaying, onToggle }: MusicPlayerProps) => {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [selectedMusic, setSelectedMusic] = useState('chill');

  const musicOptions = [
    { id: 'study', name: '📚 Study Focus', url: 'https://www.bensound.com/bensound-music/bensound-creativeminds.mp3' },
    { id: 'lofi', name: '🎧 Lo-Fi Study', url: 'https://www.bensound.com/bensound-music/bensound-summer.mp3' },
    { id: 'white-noise', name: '🔇 White Noise', url: 'https://www.bensound.com/bensound-music/bensound-acousticbreeze.mp3' },
    { id: 'instrumental', name: '🎻 Instrumental', url: 'https://www.bensound.com/bensound-music/bensound-jazzyfrenchy.mp3' },
    { id: 'brain-focus', name: '🧠 Brain Focus', url: 'https://www.bensound.com/bensound-music/bensound-pianomoment.mp3' },
    { id: 'concentration', name: '🎯 Deep Focus', url: 'https://www.bensound.com/bensound-music/bensound-sweet.mp3' },
    { id: 'productivity', name: '⚡ Productivity', url: 'https://www.bensound.com/bensound-music/bensound-energy.mp3' },
    { id: 'meditation', name: '🧘 Study Meditation', url: 'https://www.bensound.com/bensound-music/bensound-buddy.mp3' }
  ];

  useEffect(() => {
    // Stop current audio if playing
    if (audio) {
      audio.pause();
      audio.src = '';
    }

    // Create new audio element with selected music
    const selectedOption = musicOptions.find(option => option.id === selectedMusic);
    const audioElement = new Audio(selectedOption?.url || musicOptions[0].url);
    audioElement.loop = true;
    audioElement.volume = 0.3;
    setAudio(audioElement);

    // If music is currently playing, start the new audio
    if (isPlaying) {
      audioElement.play().catch(err => console.log('Audio play failed:', err));
    }

    return () => {
      audioElement.pause();
      audioElement.src = '';
    };
  }, [selectedMusic]);

  useEffect(() => {
    if (audio) {
      if (isPlaying) {
        audio.play().catch(err => console.log('Audio play failed:', err));
      } else {
        audio.pause();
      }
    }
  }, [isPlaying, audio]);

  const handleMusicChange = (musicId: string) => {
    setSelectedMusic(musicId);
    if (isPlaying && audio) {
      audio.pause();
      // The useEffect will handle creating new audio and playing it
    }
  };

  return (
    <div className="music-player">
      <div className="music-controls-header">
        <button 
          onClick={onToggle}
          className={`music-control-btn ${isPlaying ? 'playing' : ''}`}
        >
          {isPlaying ? '🔇 Stop Music' : '🎵 Play Music'}
        </button>
      </div>
      
      <div className="music-selection">
        <label className="music-label">Choose your vibe:</label>
        <select 
          value={selectedMusic} 
          onChange={(e) => handleMusicChange(e.target.value)}
          className="music-select"
        >
          {musicOptions.map(option => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default MusicPlayer;
