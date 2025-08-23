import { Editor } from 'obsidian';
import { getBadges } from './badges';
import GithubGitlabBadgesPlugin from 'main';

export async function addBadgesInCurrentFile(plugin: GithubGitlabBadgesPlugin, editor: Editor) {
    const activeFile = plugin.app.workspace.getActiveFile();
    if (!activeFile || activeFile.extension !== 'md') {
        return;
    }

    const markdownContent = await plugin.app.vault.read(activeFile);
    const lines = markdownContent.split('\n');
    const updatedLines: string[] = [];

    const linkRegex = /\[([^\]]+)\]\((https?:\/\/(?:www\.)?(github\.com|gitlab\.com)\/[^\/\s]+\/[^\/\s]+)\)/g;

    for (const line of lines) {
        let resultLine = '';
        let match: RegExpExecArray | null;
        let badgeInsertions: { pos: number, badgeData: string[] }[] = [];

        // Find all matches and prepare badge insertions
        while ((match = linkRegex.exec(line)) !== null) {
            const url = match[2];
            const badgeData = getBadges(url, plugin.settings.badges, plugin.settings.authorPlaceholder, plugin.settings.namePlaceholder);
            if (badgeData.length > 0) {
                badgeInsertions.push({ pos: match.index + match[0].length, badgeData });
            }
        }

        if (badgeInsertions.length === 0) {
            updatedLines.push(line);
            continue;
        }

        let cursor = 0;
        let badgeIdx = 0;
        for (const { pos, badgeData } of badgeInsertions) {
            // Add text up to the end of the current link
            resultLine += line.slice(cursor, pos);
            // Insert badges immediately after the link
            resultLine += getBadgeBlock(badgeData, plugin.settings.inlineBlock);
            cursor = pos;
            badgeIdx++;
        }
        // Add any remaining text after the last link
        resultLine += line.slice(cursor);
        updatedLines.push(resultLine);
    }

    const updatedContent = updatedLines.join('\n');
    await plugin.app.vault.modify(activeFile, updatedContent);
}

export function addBadgesAtCursorPosition(plugin: GithubGitlabBadgesPlugin, editor: Editor) {
    if (!editor) {
        return;
    }

    const cursor = editor.getCursor();
    const lineText = editor.getLine(cursor.line);

    // Check if cursor is inside a markdown link
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/(?:www\.)?(github\.com|gitlab\.com)\/[^\/\s]+\/[^\/\s]+)\)/g;
    let match: RegExpExecArray | null;
    let found = false;

    while ((match = linkRegex.exec(lineText)) !== null) {
        const start = match.index;
        const end = match.index + match[0].length;
        if (cursor.ch >= start && cursor.ch <= end) {
            // Cursor is inside this link
            const repoUrl = match[2];
            const badgeData = getBadges(repoUrl, plugin.settings.badges, plugin.settings.authorPlaceholder, plugin.settings.namePlaceholder);
            if (badgeData.length > 0) {
                // Insert badges after the link
                const insertPos = { line: cursor.line, ch: end };
                const badgeMarkdown = getBadgeBlock(badgeData, plugin.settings.inlineBlock) + '\n';
                editor.replaceRange(badgeMarkdown, insertPos);
            }
            found = true;
            break;
        }
    }

    if (!found) {
        // Fallback: try to extract repo URL before cursor
        const repoUrl = extractRepoUrl(lineText, cursor.ch);
        if (repoUrl) {
            const badgeData = getBadges(repoUrl, plugin.settings.badges, plugin.settings.authorPlaceholder, plugin.settings.namePlaceholder);
            if (badgeData.length > 0) {
                const badgeMarkdown = getBadgeBlock(badgeData, plugin.settings.inlineBlock) + '\n';
                editor.replaceRange(badgeMarkdown, cursor);
            }
        }
    }
}

function extractRepoUrl(lineText: string, cursorPosition: number): string | null {
    const urlPattern = /https?:\/\/(www\.)?(github\.com|gitlab\.com)\/([^\/]+)\/([^\/]+)/;
    const match = lineText.slice(0, cursorPosition).match(urlPattern);
    return match ? match[0] : null;
}

function getBadgeBlock(badgeData: string[], inlineBlock: boolean): string {
    if (inlineBlock) {
        return badgeData.map(badge => `<span style="display: inline-block;">${badge}</span>`).join(' ');
    } else {
        return badgeData.join('\n');
    }
}
