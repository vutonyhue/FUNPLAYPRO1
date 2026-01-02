import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholderSrc?: string;
  blurDataURL?: string;
  aspectRatio?: 'video' | 'square' | 'portrait' | 'auto';
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholderSrc,
  blurDataURL,
  aspectRatio = 'auto',
  className,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, []);

  const aspectRatioClasses = {
    video: 'aspect-video',
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
    auto: '',
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setError(true);
    setIsLoaded(true);
  };

  // Default placeholder gradient
  const defaultPlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzAwNjZmZiIgc3RvcC1vcGFjaXR5PSIwLjMiLz48c3RvcCBvZmZzZXQ9IjUwJSIgc3RvcC1jb2xvcj0iIzAwZmZmZiIgc3RvcC1vcGFjaXR5PSIwLjMiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNkOTAwZmYiIHN0b3Atb3BhY2l0eT0iMC4zIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==';

  return (
    <div 
      ref={imgRef}
      className={cn(
        'relative overflow-hidden bg-muted',
        aspectRatioClasses[aspectRatio],
        className
      )}
    >
      {/* Placeholder/Blur */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 animate-pulse"
          style={{
            backgroundImage: blurDataURL 
              ? `url(${blurDataURL})` 
              : `url(${placeholderSrc || defaultPlaceholder})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: blurDataURL ? 'blur(10px)' : 'none',
          }}
        />
      )}

      {/* Actual Image */}
      {isInView && !error && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-500',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          loading="lazy"
          decoding="async"
          {...props}
        />
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-muted-foreground text-sm">Không thể tải ảnh</span>
        </div>
      )}
    </div>
  );
};

export default LazyImage;
