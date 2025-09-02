import { Plugin } from 'obsidian';
import { addBadgesInCurrentFile, addBadgesAtCursorPosition } from './src/commands';
import { BadgeSettings, BadgeSettingTab, DEFAULT_SETTINGS } from './src/settings';

export default class GithubGitlabBadgesPlugin extends Plugin {
    public settings: BadgeSettings
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    async saveSettings() {
        await this.saveData(this.settings);
    }
    async onload() {
        // Load settings
        await this.loadSettings();
        // Add settings tab
        this.addSettingTab(new BadgeSettingTab(this));

        // Register commands
        this.addCommand({
            id: 'add-badges-in-current-file',
            name: 'Add Badges in Current File',
            editorCallback: (editor, ctx) => addBadgesInCurrentFile(this, editor),
        });

        this.addCommand({
            id: 'add-badges-at-cursor',
            name: 'Add Badges',
            editorCallback: (editor, ctx) => addBadgesAtCursorPosition(this, editor),
        });
    }

    onunload() {
        // Cleanup if necessary
    }
}
