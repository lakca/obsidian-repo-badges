import { Editor, EditorPosition } from 'obsidian';
import { getBadges } from './badges';
import GithubGitlabBadgesPlugin from 'main';
import { Modal, Setting } from 'obsidian';

class BadgeSelectionModal extends Modal {
    selected: boolean[];
    constructor(app: any, private badges: string[], private onConfirm: (selected: string[]) => void) {
        super(app);
        this.selected = Array(badges.length).fill(true);
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h3', { text: 'Select badges to insert:' });
        contentEl.classList.add('badge-selection-modal');

        contentEl.createEl('p', { cls: 'setting-item-description', text: 'Navigate using "arrow" and "Tab" keys. Select/Deselect by "Space", and "Enter" to confirm or "Escape" to cancel.\nUsually you just need to press "Enter" to apply you settings.' });

        this.badges.forEach((badge, idx) => {
            const setting = new Setting(contentEl)
                .setName('')
                .addToggle(toggle => {
                    toggle.setValue(this.selected[idx]);
                    toggle.onChange(val => {
                        this.selected[idx] = val;
                    });
                })
                .addExtraButton(btn => {
                    btn.setIcon('copy');
                    btn.setTooltip('Copy badge markdown');
                    btn.onClick(() => navigator.clipboard.writeText(badge));
                })
                .setDesc(badge);
            return setting;
        });

        // Bind Enter key to Insert button
        let insertBtnEl: HTMLElement | null = null;
        new Setting(contentEl)
            .addButton(btn =>
                btn.setButtonText('Insert')
                    .setCta()
                    .onClick(() => {
                        this.onConfirm(this.badges.filter((_, i) => this.selected[i]));
                        this.close();
                    })
                    .then(b => { insertBtnEl = b.buttonEl; })
            )
            .addButton(btn =>
                btn.setButtonText('Cancel')
                    .onClick(() => this.close())
            );

        // Focus Insert button and bind Enter key
        setTimeout(() => {
            console.log('attaching keydown listener');
            insertBtnEl?.focus();
            contentEl.addEventListener('keydown', (e: KeyboardEvent) => {
                console.log(e.key)
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.close();
                }
                else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    const focusable = contentEl.querySelectorAll('input[type="checkbox"]');
                    if (focusable.length === 0) return;
                    const currentIndex = Array.from(focusable).indexOf(document.activeElement as HTMLElement);
                    let nextIndex = currentIndex;
                    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                        nextIndex = (currentIndex - 1 + focusable.length) % focusable.length;
                    } else {
                        nextIndex = (currentIndex + 1) % focusable.length;
                    }
                    (focusable[nextIndex] as HTMLElement).focus();
                }
                else if (e.key === 'Enter') {
                    e.preventDefault();
                    insertBtnEl?.click();
                }
                console.log('focused element:', document.activeElement);
            });
        }, 0);
    }
}

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

    let insertPos: EditorPosition = { line: cursor.line, ch: cursor.ch };
    let insertBadgeData: string[] = []

    while ((match = linkRegex.exec(lineText)) !== null) {
        const start = match.index;
        const end = match.index + match[0].length;
        if (cursor.ch >= start && cursor.ch <= end) {
            // Cursor is inside this link
            const repoUrl = match[2];
            const badgeData = getBadges(repoUrl, plugin.settings.badges, plugin.settings.authorPlaceholder, plugin.settings.namePlaceholder);

            if (badgeData.length > 0) {
                // Insert badges after the link
                insertPos = { line: cursor.line, ch: end };
                insertBadgeData = badgeData
                found = true;
                break;
            }
        }
    }

    if (!found) {
        // Fallback: try to extract repo URL before cursor
        const repoUrl = extractRepoUrl(lineText, cursor.ch);
        if (repoUrl) {
            const badgeData = getBadges(repoUrl, plugin.settings.badges, plugin.settings.authorPlaceholder, plugin.settings.namePlaceholder);
            if (badgeData.length > 0) {
                insertPos = { line: cursor.line, ch: cursor.ch };
                insertBadgeData = badgeData
                found = true;
            }
        }
    }

    if (found && insertBadgeData.length > 0) {
        // Use Obsidian's built-in Modal and UI components for badge selection
        if (plugin.settings.confirmBeforeInsert && insertBadgeData.length > 1) {
            new BadgeSelectionModal(plugin.app, insertBadgeData, (selectedBadges: string[]) => {
                if (selectedBadges.length > 0) {
                    const badgeMarkdown = getBadgeBlock(selectedBadges, plugin.settings.inlineBlock) + '\n';
                    editor.replaceRange(badgeMarkdown, insertPos);
                }
            }).open();
            return;
        }

        if (insertBadgeData.length > 0) {
            // Insert badges after the link
            const badgeMarkdown = getBadgeBlock(insertBadgeData, plugin.settings.inlineBlock) + '\n';
            editor.replaceRange(badgeMarkdown, insertPos);
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
        return badgeData.map(badge => `<span style="display: inline-block;">${badge}</span>`).join('');
    } else {
        return badgeData.join('\n');
    }
}
