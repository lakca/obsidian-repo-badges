import { BadgeSetting } from "./settings";

export function getBadges(url: string, badgeSettings: BadgeSetting[], authorPlaceholder: string, namePlaceholder: string): string[] {
    const githubPattern = /https?:\/\/(www\.)?github\.com\/([^\/]+)\/([^\/]+)/;
    const gitlabPattern = /https?:\/\/(www\.)?gitlab\.com\/([^\/]+)\/([^\/]+)/;

    let match = url.match(githubPattern);
    if (match) {
        const author = match[2];
        const name = match[3];
        return getBadgesForRepo('github', author, name, badgeSettings, authorPlaceholder, namePlaceholder);
    }

    match = url.match(gitlabPattern);
    if (match) {
        const author = match[2];
        const name = match[3];
        return getBadgesForRepo('gitlab', author, name, badgeSettings, authorPlaceholder, namePlaceholder);
    }

    return [];
}

export function getBadgesForRepo(
    platform: string,
    author: string,
    name: string,
    badgeSettings: BadgeSetting[],
    authorPlaceholder: string,
    namePlaceholder: string
): string[] {
    return badgeSettings.filter(badge => {
        if (!badge || badge.trim() === '' || badge.startsWith('#')) {
            return false;
        }
        // Platform is determined by badge title starting with platform name (case-insensitive)
        const badgeTitleMatch = badge.match(/!\[([^\]]+)\]/);
        if (!badgeTitleMatch) {
            return false;
        }
        const title = badgeTitleMatch[1].toLowerCase();
        return title.startsWith(platform);
    }).map(badge =>
        badge.replace(authorPlaceholder, author).replace(namePlaceholder, name)
    );
}
