
"use client";

import * as React from 'react';
import Link from "next/link";
import Image from "next/image";
import Autoplay from "embla-carousel-autoplay"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
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
                alt="Abstract background of a modern school campus"
                fill
                className="object-cover"
                priority
                data-ai-hint="modern campus"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="container mx-auto px-4 text-center">
                    <div className="max-w-4xl mx-auto">
                        <h1 className="text-4xl md:text-6xl font-bold font-headline leading-tight text-white">
                           {homepageTitle || 'Welcome to EduSync'}
                        </h1>
                        <p className="mt-6 text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
                            {homepageSubtitle || 'Please configure the homepage title and subtitle in the admin settings.'}
                        </p>
                        <Button asChild size="lg" className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90 text-base font-semibold py-6 px-10">
                            <Link href="/admissions">Get Started</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    </CarouselItem>
  );

  return (
    <section className="relative bg-primary text-primary-foreground h-[60vh] md:h-[80vh] flex items-center">
        <Carousel
            plugins={[autoplayPlugin.current]}
            className="w-full h-full"
            onMouseEnter={autoplayPlugin.current.stop}
            onMouseLeave={autoplayPlugin.current.reset}
        >
            <CarouselContent className="h-full">
                {slides.length > 0 ? slides.map((slide) => {
                    const finalImageUrl = generateCacheBustingUrl(slide.imageUrl, updated_at);
                    if (!finalImageUrl) return null; // Skip slides with invalid URLs
                    return (
                        <CarouselItem key={slide.id} className="h-full">
                            <div className="relative w-full h-full">
                                <Image
                                    src={finalImageUrl}
                                    alt={slide.title}
                                    fill
                                    className="object-cover"
                                    priority
                                    data-ai-hint="modern campus"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="container mx-auto px-4 text-center">
                                        <div className="max-w-4xl mx-auto">
                                            <h1 className="text-4xl md:text-6xl font-bold font-headline leading-tight text-white">
                                            {slide.title}
                                            </h1>
                                            <p className="mt-6 text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
                                                {slide.subtitle}
                                            </p>
                                            <Button asChild size="lg" className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90 text-base font-semibold py-6 px-10">
                                                <Link href="/admissions">Get Started</Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CarouselItem>
                    )
                }) : defaultSlide}
            </CarouselContent>
        </Carousel>
    </section>
  );
}
