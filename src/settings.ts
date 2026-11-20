import { App, PluginSettingTab, Setting } from "obsidian";
import type AppleHigCompanionPlugin from "./main";

export interface AppleHigCompanionSettings {
  enableFloatingToolbar: boolean;
  enableCollapsibleTitle: boolean;
  enableHaptics: boolean;
}

export const DEFAULT_SETTINGS: AppleHigCompanionSettings = {
  enableFloatingToolbar: true,
  enableCollapsibleTitle: true,
  enableHaptics: true
};

export class AppleHigCompanionSettingTab extends PluginSettingTab {
  private readonly plugin: AppleHigCompanionPlugin;

  constructor(app: App, plugin: AppleHigCompanionPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Плавающая панель выделения")
      .setDesc("Островная панель форматирования над выделенным текстом в редакторе")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableFloatingToolbar)
          .onChange(async (value) => {
            this.plugin.settings.enableFloatingToolbar = value;
            await this.plugin.saveSettings();
            this.plugin.syncModules();
          })
      );

    new Setting(containerEl)
      .setName("Динамический заголовок при прокрутке")
      .setDesc("Плавно отображает заголовок заметки в верхней шапке при скролле вниз")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableCollapsibleTitle)
          .onChange(async (value) => {
            this.plugin.settings.enableCollapsibleTitle = value;
            await this.plugin.saveSettings();
            this.plugin.syncModules();
          })
      );

    new Setting(containerEl)
      .setName("Тактильный отклик (Haptics)")
      .setDesc("Лёгкая вибрация на iPad/iPhone при переключении задач и нажатии кнопок панели")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableHaptics)
          .onChange(async (value) => {
            this.plugin.settings.enableHaptics = value;
            await this.plugin.saveSettings();
          })
      );
  }
}