
declare module 'qrcode' {
  export function toDataURL(
    text: string | { data: Buffer; mode: string }[],
    callback: (error: Error | null | undefined, url: string) => void
  ): void;
  export function toDataURL(
    text: string | { data: Buffer; mode: string }[],
    options: any,
    callback: (error: Error | null | undefined, url: string) => void
  ): void;
}
