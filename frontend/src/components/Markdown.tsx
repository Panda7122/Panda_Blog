import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import remarkDirective from 'remark-directive';
import rehypeSlug from 'rehype-slug';
import { useEffect, useState, type MouseEvent } from 'react';
import type { PluggableList } from 'unified';
import type { ElementContent } from 'hast';
import { MusicBlock } from './MusicBlock';
import { parseVideo, VideoBlock, VIDEO_EXT } from './VideoBlock';
import { preprocessHackmd, rehypeSourceLines, rehypeToc, remarkHackmd } from '../lib/hackmd';
import { emojiTable, loadEmoji, mayHaveShortcode, remarkEmoji } from '../lib/emoji';

function textOf(n: ElementContent): string {
  if (n.type === 'text') return n.value;
  if ('children' in n) return n.children.map(textOf).join('');
  return '';
}

const identity = (s: string) => s;

const basePlugins: PluggableList = [remarkGfm, remarkMath, remarkBreaks, remarkDirective, remarkHackmd];
const rehypePlugins: PluggableList = [
  rehypeSlug,
  rehypeToc,
  rehypeKatex,
  [rehypeHighlight, { detect: false, plainText: ['music', 'video'] }],
];
const rehypePluginsWithLines: PluggableList = [rehypeSourceLines, ...rehypePlugins];

/** 頁內錨點（#標題）：HashRouter 會把 # 當成路由，所以自己捲動 */
function scrollToAnchor(e: MouseEvent<HTMLAnchorElement>, href: string) {
  const el = document.getElementById(decodeURIComponent(href.slice(1)));
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function Markdown({
  source,
  resolveMedia = identity,
  sourceLines = false,
}: {
  source: string;
  resolveMedia?: (src: string) => string;
  /** 後台預覽用：標上原始碼行號，給同步捲動使用 */
  sourceLines?: boolean;
}) {
  // 有 :xxx: 才載入 emoji 表，載完重新 render
  const [emoji, setEmoji] = useState(emojiTable);
  const needEmoji = !emoji && mayHaveShortcode(source);
  useEffect(() => {
    if (needEmoji) loadEmoji().then(setEmoji);
  }, [needEmoji]);
  const remarkPlugins: PluggableList = [...basePlugins, [remarkEmoji, { table: emoji }]];

  const components: Components = {
    pre({ node, children, ...rest }) {
      const code = node?.children[0];
      if (code?.type === 'element' && code.tagName === 'code') {
        const cls = code.properties?.className;
        if (Array.isArray(cls) && cls.includes('language-music')) {
          return <MusicBlock raw={textOf(code)} resolve={resolveMedia} />;
        }
        if (Array.isArray(cls) && cls.includes('language-video')) {
          return <VideoBlock info={parseVideo(textOf(code))} resolve={resolveMedia} />;
        }
      }
      return <pre {...rest}>{children}</pre>;
    },
    img({ node, src, alt, ...rest }) {
      // ![說明](media/xxx.mp4) 也當成影片
      if (src && VIDEO_EXT.test(src)) return <VideoBlock info={{ src, title: alt || undefined }} resolve={resolveMedia} />;
      return <img {...rest} src={src ? resolveMedia(src) : src} alt={alt ?? ''} loading="lazy" />;
    },
    p({ node, children, ...rest }) {
      // 只有一部影片的段落不要包 <p>，避免 <figure> 放在 <p> 裡
      const only = node?.children.length === 1 ? node.children[0] : undefined;
      if (only?.type === 'element' && only.tagName === 'img' && VIDEO_EXT.test(String(only.properties?.src ?? ''))) {
        return <>{children}</>;
      }
      return <p {...rest}>{children}</p>;
    },
    a({ node, href, children, ...rest }) {
      const external = !!href && /^https?:\/\//.test(href);
      if (href?.startsWith('#') && !href.startsWith('#/')) {
        return (
          <a {...rest} href={href} onClick={(e) => scrollToAnchor(e, href)}>
            {children}
          </a>
        );
      }
      return (
        <a {...rest} href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
          {children}
        </a>
      );
    },
  };

  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={sourceLines ? rehypePluginsWithLines : rehypePlugins}
        components={components}
      >
        {preprocessHackmd(source)}
      </ReactMarkdown>
    </div>
  );
}
