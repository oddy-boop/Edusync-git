
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSubdomain(hostname: string): string | null {
  const parts = hostname.split('.');
  
  // Handle localhost cases, e.g., "sjm.localhost"
  if (parts.length > 1 && parts[parts.length - 1] === 'localhost') {
    if (parts.length > 2) {
      return parts[0];
    }
    return null;
  }
  
  // Handle standard domains like "sjm.example.com"
  if (parts.length > 2) {
    // Avoid common subdomains like 'www'
    if (parts[0] === 'www') {
      return null;
    }
    return parts[0];
  }
  
  return null;
}

/**
 * Converts an HSL color string (e.g., "220 25% 20%") to a HEX string (e.g., "#263340").
 * Handles potential errors gracefully.
 * @param hslString The HSL color string.
 * @returns The HEX color string, or a default color if conversion fails.
 */
export function hslStringToHex(hslString: string): string {
  try {
    if (!hslString || typeof hslString !== 'string') return '#000000';
    const [hStr, sStr, lStr] = hslString.split(' ').map(s => s.trim().replace('%', ''));
    let h = parseInt(hStr, 10);
    let s = parseInt(sStr, 10) / 100;
    let l = parseInt(lStr, 10) / 100;

    if (isNaN(h) || isNaN(s) || isNaN(l)) return '#000000';

    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  } catch (e) {
    console.error("Failed to convert HSL string to HEX:", e);
    return '#000000';
  }
}

/**
 * Converts a HEX color string (e.g., "#263340") to an HSL color string (e.g., "220 25% 20%").
 * Handles potential errors gracefully.
 * @param hex The HEX color string.
 * @returns The HSL color string, or a default color if conversion fails.
 */
export function hexToHslString(hex: string): string {
  try {
    if (!hex || typeof hex !== 'string') return '0 0% 0%';
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '0 0% 0%';

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `${h} ${s}% ${l}%`;
  } catch (e) {
    console.error("Failed to convert HEX to HSL string:", e);
    return '0 0% 0%';
  }
}
