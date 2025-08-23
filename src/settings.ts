import { PluginSettingTab, Setting } from 'obsidian';

export type BadgeSetting = string

export const PRESET_BADGES: BadgeSetting[] = [
    '![GitHub stars](https://img.shields.io/github/stars/{author}/{name}.svg?style=social&label=Stars)',
    '![GitHub release](https://img.shields.io/github/v/release/{author}/{name}.svg)',
    '![GitHub top language](https://img.shields.io/github/languages/top/{author}/{name}.svg)',
    '![GitLab stars](https://img.shields.io/gitlab/stars/{author}/{name}.svg?style=social&label=Stars)',
    '![GitLab release](https://img.shields.io/gitlab/v/release/{author}/{name}.svg)',
    '![GitLab top language](https://img.shields.io/gitlab/languages/top/{author}/{name}.svg)',
];

export interface BadgeSettings {
    badges: string[];
    authorPlaceholder: string;
    namePlaceholder: string;
    inlineBlock: boolean;
}

export const DEFAULT_SETTINGS: BadgeSettings = {
    badges: PRESET_BADGES,
    authorPlaceholder: '{author}',
    namePlaceholder: '{name}',
    inlineBlock: false,
};

export class BadgeSettingTab extends PluginSettingTab {
    private plugin: any;

    constructor(plugin: any) {
        super(plugin.app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'GitHub/GitLab Badges Settings' });

        new Setting(containerEl)
            .setName('Customize Badges')
            .setDesc('Add or remove badge markdown strings. Use {author} and {name} as placeholders. Add leading # to comment out.')
            .addTextArea(text => {
            text
                .setValue(this.plugin.settings.badges.join('\n'))
                .onChange(async (value) => {
                this.plugin.settings.badges = value.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                await this.plugin.saveSettings();
                }).inputEl.classList.add('badge-settings-customize-textarea');
            }).settingEl.classList.add('badge-settings-customize-setting');

        new Setting(containerEl)
            .setName('Inline Block Badges')
            .setDesc('Display badges in inline-block style.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.inlineBlock)
                .onChange(async (value) => {
                    this.plugin.settings.inlineBlock = value;
                    await this.plugin.saveSettings();
                }));

    }
}
