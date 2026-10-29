import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { ElementContent } from 'hast';
import { MusicBlock } from './MusicBlock';

function textOf(n: ElementContent): string {
  if (n.type === 'text') return n.value;
  if ('children' in n) return n.children.map(textOf).join('');
  return '';
}

const identity = (s: string) => s;

export function Markdown({ source, resolveMedia = identity }: { source: string; resolveMedia?: (src: string) => string }) {
  const components: Components = {
    pre({ node, children, ...rest }) {
      const code = node?.children[0];
      if (code?.type === 'element' && code.tagName === 'code') {
        const cls = code.properties?.className;
        if (Array.isArray(cls) && cls.includes('language-music')) {
          return <MusicBlock raw={textOf(code)} resolve={resolveMedia} />;
        }
      }
      return <pre {...rest}>{children}</pre>;
    },
    img({ node, src, alt, ...rest }) {
      return <img {...rest} src={src ? resolveMedia(src) : src} alt={alt ?? ''} loading="lazy" />;
    },
    a({ node, href, children, ...rest }) {
      const external = !!href && /^https?:\/\//.test(href);
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
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: false, plainText: ['music'] }]]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
