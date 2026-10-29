import { useEffect, useRef, useState } from 'react';

export interface MusicInfo {
  src: string;
  title?: string;
  artist?: string;
  cover?: string;
}

const PLAY_EVENT = 'record-blog:music-play';

const fmt = (s: number) => {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

/** 音檔（mp3 / wav / ogg / m4a …）用的自訂播放器 */
export function MusicPlayer({ src, title, artist, cover }: MusicInfo) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState(false);

  // 同一頁只讓一首歌在播
  useEffect(() => {
    const onOtherPlay = (e: Event) => {
      if ((e as CustomEvent).detail !== audio.current) audio.current?.pause();
    };
    window.addEventListener(PLAY_EVENT, onOtherPlay);
    return () => window.removeEventListener(PLAY_EVENT, onOtherPlay);
  }, []);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setError(true));
    else a.pause();
  };

  const seek = (v: number) => {
    if (audio.current) audio.current.currentTime = v;
    setTime(v);
  };

  const changeVolume = (v: number) => {
    if (audio.current) audio.current.volume = v;
    setVolume(v);
  };

  const progress = duration ? (time / duration) * 100 : 0;

  return (
    <div className={`music-card ${playing ? 'is-playing' : ''}`}>
      <div className="disc" aria-hidden>
        {cover ? <img src={cover} alt="" /> : <span className="disc-note">♪</span>}
      </div>
      <div className="music-main">
        <div className="music-title">{title || '未命名曲目'}</div>
        {artist && <div className="music-artist">{artist}</div>}
        <div className="music-controls">
          <button className="play-btn" onClick={toggle} aria-label={playing ? '暫停' : '播放'} disabled={error}>
            {playing ? (
              <svg viewBox="0 0 24 24" width="18" height="18">
                <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
                <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor" />
              </svg>
            )}
          </button>
          <span className="music-time">{fmt(time)}</span>
          <input
            className="range progress"
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={time}
            style={{ ['--p' as string]: `${progress}%` }}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="播放進度"
          />
          <span className="music-time">{fmt(duration)}</span>
          <input
            className="range volume"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            style={{ ['--p' as string]: `${volume * 100}%` }}
            onChange={(e) => changeVolume(Number(e.target.value))}
            aria-label="音量"
          />
        </div>
        {error && <div className="music-error">無法載入音檔：{src}</div>}
      </div>
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onPlay={() => {
          setPlaying(true);
          window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: audio.current }));
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onError={() => setError(true)}
      />
    </div>
  );
}
