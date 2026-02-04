import { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

interface ImageLightboxProps {
  src: string;
  alt: string;
  className?: string;
}

export function ImageLightbox({ src, alt, className = '' }: ImageLightboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`cursor-pointer hover:opacity-90 transition-opacity ${className}`}
        onClick={() => setOpen(true)}
        loading="lazy"
      />

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        slides={[{ src, alt }]}
        render={{
          buttonPrev: () => null,
          buttonNext: () => null,
        }}
      />
    </>
  );
}
