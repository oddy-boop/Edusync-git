import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ size = 'md', className }: LogoProps) {
  let imageWidth;
  let imageHeight;
  let priorityFlag = false;

  switch (size) {
    case 'sm':
      imageWidth = 32;
      imageHeight = 32;
      break;
    case 'lg':
      imageWidth = 48;
      imageHeight = 48;
      priorityFlag = true;
      break;
    case 'md':
    default:
      imageWidth = 40;
      imageHeight = 40;
      priorityFlag = true;
      break;
  }

  return (
    <Link href="/" className={`flex items-center hover:opacity-80 transition-opacity ${className || ''}`}>
      <Image
        src="/images/school_logo.png"
        alt="St. Joseph's Montessori School Logo"
        width={imageWidth}
        height={imageHeight}
        priority={priorityFlag}
        className="object-contain"
      />
    </Link>
  );
}
