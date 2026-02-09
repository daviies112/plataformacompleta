// Color Scheme Utility
// Centralizes color scheme management for the application

export type ColorScheme = 'golden' | 'blue' | 'purple' | 'green' | 'pink' | 'orange';

export const colorSchemes: Record<ColorScheme, string> = {
  golden: '45 100% 85%',
  blue: '217 91% 60%',
  purple: '271 91% 65%',
  green: '142 71% 45%',
  pink: '330 81% 60%',
  orange: '25 95% 53%'
};

/**
 * Apply a color scheme to the document
 * Updates CSS variables --primary and --accent
 */
export function applyColorScheme(scheme: ColorScheme): void {
  const colorValue = colorSchemes[scheme];
  if (colorValue) {
    document.documentElement.style.setProperty('--primary', colorValue);
    document.documentElement.style.setProperty('--accent', colorValue);
  }
}

/**
 * Get the saved color scheme from localStorage
 * Defaults to 'golden' if not set
 */
export function getSavedColorScheme(): ColorScheme {
  const saved = localStorage.getItem('color-scheme');
  if (saved && saved in colorSchemes) {
    return saved as ColorScheme;
  }
  return 'golden';
}

/**
 * Save a color scheme to localStorage and apply it
 */
export function setColorScheme(scheme: ColorScheme): void {
  localStorage.setItem('color-scheme', scheme);
  applyColorScheme(scheme);
}

/**
 * Initialize color scheme on app startup
 * Call this early in the application lifecycle
 */
export function initializeColorScheme(): void {
  const savedScheme = getSavedColorScheme();
  applyColorScheme(savedScheme);
}
