'use client';

/**
 * Stage 10 Part 4 — share buttons that also record a ShareEvent.
 *
 * Sharing was previously untracked, so the per-article "shares" card had no
 * source of truth. Each button opens the target and reports the platform; the
 * copy button falls back to a temporary textarea when the clipboard API is not
 * available (older mobile browsers over http).
 */
import { useState } from 'react';
import { trackShare } from '@/lib/analytics';
import type { SharePlatformInput } from '@/types/analytics';

type Props = {
  newsId: string;
  /** Absolute URL of the article. */
  url: string;
  title: string;
};

const BUTTON_CLASS =
  'rounded-md border border-border px-3 py-1.5 text-sm text-ink transition-colors hover:border-strong hover:bg-muted';

export default function ShareButtons({ newsId, url, title }: Props) {
  const [copied, setCopied] = useState(false);

  const share = (platform: SharePlatformInput, target?: string) => {
    trackShare({ newsId, platform });
    if (target !== undefined) window.open(target, '_blank', 'noopener,noreferrer');
  };

  const copyLink = async () => {
    trackShare({ newsId, platform: 'copy-link' });
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const field = document.createElement('textarea');
      field.value = url;
      field.setAttribute('readonly', 'true');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      document.body.removeChild(field);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const telegramUrl = 'https://t.me/share/url?url=' + encodedUrl + '&text=' + encodedTitle;
  const twitterUrl = 'https://twitter.com/intent/tweet?url=' + encodedUrl + '&text=' + encodedTitle;
  const whatsappUrl = 'https://api.whatsapp.com/send?text=' + encodedTitle + '%20' + encodedUrl;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-ink-soft">اشتراک‌گذاری:</span>
      <button type="button" className={BUTTON_CLASS} onClick={() => share('telegram', telegramUrl)}>
        تلگرام
      </button>
      <button type="button" className={BUTTON_CLASS} onClick={() => share('twitter', twitterUrl)}>
        اکس (توییتر)
      </button>
      <button type="button" className={BUTTON_CLASS} onClick={() => share('whatsapp', whatsappUrl)}>
        واتس‌اپ
      </button>
      <button type="button" className={BUTTON_CLASS} onClick={() => void copyLink()}>
        {copied ? 'کپی شد' : 'کپی لینک'}
      </button>
    </div>
  );
}
