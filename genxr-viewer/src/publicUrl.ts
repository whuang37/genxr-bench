export function publicUrl(path: string): string {
  return new URL(path, document.baseURI).href;
}
