import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faPrint } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';

// Large enough to print sharply on a sheet of paper.
const QR_SIDE = 1024;

/**
 * A link as a QR code, with buttons to download it as a PNG or print it.
 * `title` is printed above the code; `fileName` names the download.
 */
export default function QrCode({ link, title, alt, fileName }: { link: string; title: string; alt: string; fileName: string }) {
  const { t } = useLang();
  const c = t.customerProfile;
  const [image, setImage] = useState('');

  useEffect(() => {
    let stale = false;
    // Only needed here, so it stays out of the main bundle.
    import('qrcode')
      .then((qr) => qr.toDataURL(link, { width: QR_SIDE, margin: 2, errorCorrectionLevel: 'M' }))
      .then((url) => { if (!stale) setImage(url); })
      .catch(() => { if (!stale) setImage(''); });
    return () => { stale = true; };
  }, [link]);

  const print = () => {
    const page = window.open('', '_blank');
    if (!page) return;
    const doc = page.document;
    doc.title = title;
    const heading = doc.createElement('h1');
    heading.textContent = title;
    const picture = doc.createElement('img');
    picture.src = image;
    picture.alt = alt;
    picture.style.width = '70%';
    const address = doc.createElement('p');
    address.textContent = link;
    doc.body.style.fontFamily = 'sans-serif';
    doc.body.style.textAlign = 'center';
    doc.body.append(heading, picture, address);
    picture.onload = () => {
      page.focus();
      page.print();
    };
  };

  if (!image) return null;

  return (
    <div className="qr-code">
      <img className="qr-code__image" src={image} alt={alt} />
      <div className="cluster cluster--tight">
        <a className="btn btn--secondary btn--sm" href={image} download={fileName}>
          <FontAwesomeIcon icon={faDownload} aria-hidden="true" />
          {c.download}
        </a>
        <button type="button" className="btn btn--secondary btn--sm" onClick={print}>
          <FontAwesomeIcon icon={faPrint} aria-hidden="true" />
          {c.print}
        </button>
      </div>
    </div>
  );
}
