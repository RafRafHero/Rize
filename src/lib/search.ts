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
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
};

export const formatUrl = (input: string, engine: SearchEngine, theme: 'light' | 'dark' | 'system' = 'system'): string => {
    if (!input) return '';

    // If it's already a valid complete URL, return it
    if (isValidUrl(input)) return input;

    // Simple heuristic: does it have a dot and no spaces? -> URL
    if (input.includes('.') && !input.includes(' ')) {
        return `https://${input}`;
    }

    // Otherwise treat as search query
    return getSearchUrl(input, engine, theme);
};
