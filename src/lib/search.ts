export type SearchEngine = 'google' | 'duckduckgo' | 'brave';

export const getSearchUrl = (query: string, engine: SearchEngine, theme: 'light' | 'dark' | 'system' = 'system'): string => {
    const encodedQuery = encodeURIComponent(query);
    switch (engine) {
        case 'duckduckgo':
            const themeParam = theme === 'dark' ? '&kae=d' : '&kae=-1';
            return `https://duckduckgo.com/?q=${encodedQuery}${themeParam}`;
        case 'brave':
            return `https://search.brave.com/search?q=${encodedQuery}&ui=${theme === 'dark' ? 'dark' : 'light'}`;
        case 'google':
        default:
            return `https://www.google.com/search?q=${encodedQuery}`;
    }
};

export const isValidUrl = (string: string): boolean => {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'rizo:';
    } catch (_) {
        return false;
    }
};

export const formatUrl = (input: string, engine: SearchEngine, theme: 'light' | 'dark' | 'system' = 'system'): string => {
    if (!input) return '';
    const trimmed = input.trim();

    // If it's already a valid complete URL, return it
    if (isValidUrl(trimmed)) return trimmed;

    // Support internal rizo:// protocol directly
    if (trimmed.startsWith('rizo://')) return trimmed;

    // Simple heuristic: does it have a dot and no spaces? -> URL
    // e.g., google.com, localhost:3000
    const urlPattern = /^[a-zA-Z0-9][-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/;
    const isUrl = urlPattern.test(trimmed) || trimmed.startsWith('localhost') || trimmed.includes(':');

    if (isUrl && !trimmed.includes(' ')) {
        return `https://${trimmed}`;
    }

    // Otherwise treat as search query
    return getSearchUrl(trimmed, engine, theme);
};
