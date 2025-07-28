
'use client';

import * as React from 'react';
import Autoplay from "embla-carousel-autoplay";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Image from 'next/image';

interface HomepageCarouselProps {
  images: (string | null)[];
  updated_at?: string;
}

export function HomepageCarousel({ images, updated_at }: HomepageCarouselProps) {
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  const generateCacheBustingUrl = (url: string | null | undefined, timestamp: string | undefined) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return null;
    const cacheKey = timestamp ? `?t=${new Date(timestamp).getTime()}` : '';
    return `${url}${cacheKey}`;
  }

  const validImages = images
    .map(url => generateCacheBustingUrl(url, updated_at))
    .filter((url): url is string => !!url);

  if (validImages.length === 0) {
    return (
        <div className="relative w-full h-full">
            <Image
                src="https://placehold.co/1920x1080.png"
                alt="Hero background placeholder"
                fill
                className="object-cover"
                priority
                data-ai-hint="school students"
            />
        </div>
    );
  }

  return (
    <Carousel
      className="w-full h-full"
      plugins={[plugin.current]}
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
    >
      <CarouselContent>
        {validImages.map((src, index) => (
          <CarouselItem key={index}>
            <div className="relative w-full h-screen">
              <Image
                src={src}
                alt={`Hero background slide ${index + 1}`}
                fill
                className="object-cover"
                priority={index === 0} // Only prioritize the first image
                data-ai-hint="university campus students"
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
