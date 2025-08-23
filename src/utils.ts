import { URL } from 'url';

export function isValidUrl(string: string): boolean {
    try {
        new URL(string);
        return true;
    } catch {
        return false;
    }
}

export function extractRepoInfo(url: string): { author: string; name: string } | null {
    const regex = /(?:https?:\/\/)?(?:www\.)?(github\.com|gitlab\.com)\/([^\/]+)\/([^\/]+)/;
    const match = url.match(regex);
    if (match) {
        return {
            author: match[2],
            name: match[3],
        };
    }
    return null;
}

export function formatBadgeMarkdown(badgeType: string, value: string): string {
    return `![${badgeType} badge](https://img.shields.io/badge/${badgeType}-${value}-brightgreen)`;
}
