import Wordmark from './Wordmark';

/**
 * Renders `text`, swapping every "BeBooked" for the logo wordmark. Headings get
 * the real logo colours; `muted` (for paragraphs) keeps the logo font but uses
 * the surrounding text colour throughout.
 */
export default function BrandText({ text, muted = false }: { text: string; muted?: boolean }) {
  const parts = text.split('BeBooked');
  return (
    <>
      {parts.map((part, i) => (
        <span key={i} style={{ display: 'contents' }}>
          {i > 0 && (
            <span className={muted ? 'brand-wordmark brand-wordmark--muted' : 'brand-wordmark'}>
              <Wordmark />
            </span>
          )}
          {part}
        </span>
      ))}
    </>
  );
}
