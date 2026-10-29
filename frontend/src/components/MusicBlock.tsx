import { MusicPlayer, type MusicInfo } from './MusicPlayer';

/**
 * 解析文章中的 ```music 區塊：
 *
 * ```music
 * title: 曲名
 * artist: 演出者
 * src: media/xxx.mp3   （或 YouTube / Spotify / SoundCloud 網址）
 * cover: media/cover.jpg
 * ```
 */
export function parseMusic(raw: string): MusicInfo {
  const info: MusicInfo = { src: '' };
  for (const line of raw.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    if (/^https?:\/\//.test(s)) {
      info.src = s;
      continue;
    }
    const kv = /^(\w+)\s*:\s*(.+)$/.exec(s);
    if (!kv) continue;
    const key = kv[1].toLowerCase() as keyof MusicInfo;
    if (key === 'src' || key === 'title' || key === 'artist' || key === 'cover') info[key] = kv[2].trim();
  }
  return info;
}

function youtubeId(url: URL): string | null {
  if (url.hostname === 'youtu.be') return url.pathname.slice(1) || null;
  if (/(^|\.)youtube\.com$/.test(url.hostname)) {
    if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2];
    if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2];
    return url.searchParams.get('v');
  }
  return null;
}

type Embed = { kind: 'youtube' | 'spotify' | 'soundcloud'; src: string; height: number };

export function detectEmbed(src: string): Embed | null {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  const yt = youtubeId(url);
  if (yt) return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${yt}`, height: 0 };

  if (url.hostname === 'open.spotify.com') {
    const m = /\/(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/.exec(url.pathname);
    if (m) {
      const tall = m[1] !== 'track' && m[1] !== 'episode';
      return { kind: 'spotify', src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, height: tall ? 380 : 152 };
    }
  }
  if (/(^|\.)soundcloud\.com$/.test(url.hostname)) {
    return {
      kind: 'soundcloud',
      src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(src)}&color=%239a72f0&visual=false`,
      height: 166,
    };
  }
  return null;
}

export function MusicBlock({ raw, resolve }: { raw: string; resolve: (s: string) => string }) {
  const info = parseMusic(raw);
  if (!info.src) return <div className="music-error">music 區塊缺少 src</div>;

  const embed = detectEmbed(info.src);
  if (embed) {
    return (
      <figure className="music-embed">
        {embed.kind === 'youtube' ? (
          <div className="ratio-16x9">
            <iframe
              src={embed.src}
              title={info.title || 'YouTube'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        ) : (
          <iframe
            src={embed.src}
            title={info.title || embed.kind}
            height={embed.height}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        )}
        {(info.title || info.artist) && (
          <figcaption>
            ♪ {info.title}
            {info.artist && ` — ${info.artist}`}
          </figcaption>
        )}
      </figure>
    );
  }

  return (
    <MusicPlayer
      src={resolve(info.src)}
      title={info.title}
      artist={info.artist}
      cover={info.cover ? resolve(info.cover) : undefined}
    />
  );
}
