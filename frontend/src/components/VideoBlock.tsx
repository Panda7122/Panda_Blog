import { detectEmbed } from './MusicBlock';

/**
 * 解析文章中的 ```video 區塊：
 *
 * ```video
 * src: media/xxx.mp4   （或 YouTube / Vimeo 網址）
 * title: 影片說明（選填）
 * poster: media/xxx.jpg（選填，播放前顯示的封面）
 * ```
 */
export interface VideoInfo {
  src: string;
  title?: string;
  poster?: string;
}

export const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i;

export function parseVideo(raw: string): VideoInfo {
  const info: VideoInfo = { src: '' };
  for (const line of raw.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    if (/^https?:\/\//.test(s)) {
      info.src = s;
      continue;
    }
    const kv = /^(\w+)\s*:\s*(.+)$/.exec(s);
    if (!kv) continue;
    const key = kv[1].toLowerCase();
    if (key === 'src' || key === 'title' || key === 'poster') info[key] = kv[2].trim();
  }
  return info;
}

function vimeoEmbed(src: string): string | null {
  try {
    const url = new URL(src);
    if (!/(^|\.)vimeo\.com$/.test(url.hostname)) return null;
    const id = /\/(\d+)/.exec(url.pathname)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  } catch {
    return null;
  }
}

export function VideoBlock({ info, resolve }: { info: VideoInfo; resolve: (s: string) => string }) {
  if (!info.src) return <div className="music-error">video 區塊缺少 src</div>;

  const yt = detectEmbed(info.src);
  const embed = yt?.kind === 'youtube' ? yt.src : vimeoEmbed(info.src);

  return (
    <figure className="video-block">
      {embed ? (
        <div className="ratio-16x9">
          <iframe
            src={embed}
            title={info.title || '影片'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ) : (
        <video
          src={resolve(info.src)}
          poster={info.poster ? resolve(info.poster) : undefined}
          controls
          playsInline
          preload="metadata"
        />
      )}
      {info.title && <figcaption>{info.title}</figcaption>}
    </figure>
  );
}
