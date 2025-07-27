
import Link from 'next/link';
import { cn } from "@/lib/utils";
import Image from "next/image";

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  schoolName?: string | null;
  imageUrl?: string | null;
  updated_at?: string;
}

export function Logo({ size = 'md', className, schoolName, imageUrl, updated_at }: LogoProps) {
  let imageSizeClass;
  let textSizeClass;

  switch (size) {
    case 'sm':
      textSizeClass = 'text-xl';
      imageSizeClass = { width: 32, height: 32 }; // Square for circle
      break;
    case 'lg':
      textSizeClass = 'text-3xl';
      imageSizeClass = { width: 44, height: 44 };
      break;
    case 'md':
    default:
      textSizeClass = 'text-2xl';
      imageSizeClass = { width: 40, height: 40 };
      break;
  }
 
  const displayName = schoolName || "EduSync";
  
  const generateCacheBustingUrl = (url: string | null | undefined, timestamp: string | undefined) => {
    if (!url) return null;
    const cacheKey = timestamp ? `?t=${new Date(timestamp).getTime()}` : '';
    return `${url}${cacheKey}`;
  }
  
  const finalImageUrl = generateCacheBustingUrl(imageUrl, updated_at);

  return (
    <Link href="/" className={cn(
        "flex items-center gap-2 hover:opacity-80 transition-opacity font-headline font-bold text-primary",
        className
      )}
    >
      {finalImageUrl ? (
        <>
          <div 
            className="relative rounded-full overflow-hidden" 
            style={{ width: imageSizeClass.width, height: imageSizeClass.height }}
          >
            <Image
              src={finalImageUrl}
              alt={`${displayName} Logo`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 32px, 40px"
              priority
            />
          </div>
          <span className={cn(textSizeClass)}>
            {displayName}
          </span>
        </>
      ) : (
        <span className={cn(textSizeClass)}>
          {displayName}
        </span>
      )}
    </Link>
  );
}
