/** jsdom non ha matchMedia: lo simuliamo, con il sistema operativo in modalità chiara (o scura, se richiesto) */
export function systemPrefersDark(dark: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches: query === "(prefers-color-scheme: dark)" && dark,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList;
}
