
"use client";

import * as React from 'react';
import Link from "next/link";
import Image from "next/image";
import Autoplay from "embla-carousel-autoplay"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Button } from '../ui/button';

interface HomepageSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
}

interface HomepageCarouselProps {
    slides: HomepageSlide[];
    homepageTitle: string | null;
    homepageSubtitle: string | null;
    updated_at?: string;
}

export function HomepageCarousel({ slides, homepageTitle, homepageSubtitle, updated_at }: HomepageCarouselProps) {
  const autoplayPlugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  const generateCacheBustingUrl = (url: string | null | undefined, timestamp: string | undefined) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return null;
    const cacheKey = timestamp ? `?t=${new Date(timestamp).getTime()}` : '';
    return `${url}${cacheKey}`;
  }

  const defaultSlide = (
    <CarouselItem className="h-full">
         <div className="relative w-full h-full">
            <Image
                src="https://placehold.co/1920x1080.png"
                alt="A grand university campus with a large lawn"
                fill
                className="object-cover"
                priority
                data-ai-hint="university campus"
            />
            <div className="absolute inset-0 bg-black/50"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="container mx-auto px-4 text-center">
                    <div className="max-w-4xl mx-auto">
                        <h1 className="text-4xl md:text-6xl font-bold font-headline leading-tight text-white drop-shadow-lg">
                           {homepageTitle || 'Welcome to Our School'}
                        </h1>
                        <p className="mt-4 text-lg md:text-xl text-white/90 max-w-2xl mx-auto drop-shadow-md">
                            {homepageSubtitle || 'A place for learning, growth, and discovery.'}
                        </p>
                        <div className="mt-8 flex flex-wrap gap-4 justify-center">
                            <Button asChild size="lg" variant="secondary" className="bg-white/90 text-primary hover:bg-white text-base font-semibold py-6 px-8 shadow-lg">
                                <Link href="/admissions">Sign Up for Excursion</Link>
                            </Button>
                            <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-base font-semibold py-6 px-8 shadow-lg">
                                <Link href="/about">Learn More</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </CarouselItem>
  );
  
  const validSlides = Array.isArray(slides) ? slides.filter(slide => slide && typeof slide.imageUrl === 'string' && slide.imageUrl.trim() !== '') : [];

  return (
    <section className="relative h-screen w-full">
        <Carousel
            plugins={[autoplayPlugin.current]}
            className="w-full h-full"
            onMouseEnter={autoplayPlugin.current.stop}
            onMouseLeave={autoplayPlugin.current.reset}
            opts={{
              loop: true,
            }}
        >
            <CarouselContent className="h-full">
                {validSlides.length > 0 ? validSlides.map((slide) => {
                    const finalImageUrl = generateCacheBustingUrl(slide.imageUrl, updated_at);
                    if (!finalImageUrl) return null; 
                    return (
                        <CarouselItem key={slide.id} className="h-full">
                            <div className="relative w-full h-full">
                                <Image
                                    src={finalImageUrl}
                                    alt={slide.title}
                                    fill
                                    className="object-cover"
                                    priority
                                    data-ai-hint="university campus"
                                />
                                <div className="absolute inset-0 bg-black/50"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="container mx-auto px-4 text-center">
                                        <div className="max-w-4xl mx-auto">
                                            <h1 className="text-4xl md:text-6xl font-bold font-headline leading-tight text-white drop-shadow-lg">
                                              {slide.title}
                                            </h1>
                                            <p className="mt-4 text-lg md:text-xl text-white/90 max-w-2xl mx-auto drop-shadow-md">
                                                {slide.subtitle}
                                            </p>
                                            <div className="mt-8 flex flex-wrap gap-4 justify-center">
                                                <Button asChild size="lg" variant="secondary" className="bg-white/90 text-primary hover:bg-white text-base font-semibold py-6 px-8 shadow-lg">
                                                    <Link href="/admissions">Sign Up for Excursion</Link>
                                                </Button>
                                                <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-base font-semibold py-6 px-8 shadow-lg">
                                                    <Link href="/about">Learn More</Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CarouselItem>
                    )
                }) : defaultSlide}
            </CarouselContent>
            <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/50 border-none text-white hidden md:inline-flex"/>
            <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/50 border-none text-white hidden md:inline-flex"/>
        </Carousel>
    </section>
  );
}
