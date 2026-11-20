import { Plugin } from "obsidian";
import { CollapsibleTitleManager } from "./collapsible-title";
import { FloatingSelectionToolbar } from "./floating-toolbar";
import { HapticsManager } from "./haptics";
import {
  AppleHigCompanionSettings,
  AppleHigCompanionSettingTab,
  DEFAULT_SETTINGS
} from "./settings";

export default class AppleHigCompanionPlugin extends Plugin {
  settings: AppleHigCompanionSettings = { ...DEFAULT_SETTINGS };
  private floatingToolbar: FloatingSelectionToolbar | null = null;
  private collapsibleTitle: CollapsibleTitleManager | null = null;
  private haptics: HapticsManager | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.haptics = new HapticsManager();
    this.floatingToolbar = new FloatingSelectionToolbar(() => {
      this.haptics?.triggerLight();
    });
    this.collapsibleTitle = new CollapsibleTitleManager(this.app);

    this.registerEditorExtension(this.floatingToolbar.createEditorExtension());

    this.registerDomEvent(window, "scroll", this.floatingToolbar.handleGlobalScroll, {
      capture: true,
      passive: true
    });

    this.registerDomEvent(document, "click", this.haptics.handleDocumentClick, {
      capture: true,
      passive: true
    });

    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.collapsibleTitle?.attachAndEvaluateAll();
      })
    );

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.floatingToolbar?.hide();
        this.collapsibleTitle?.attachAndEvaluateAll();
      })
    );

    this.registerEvent(
      this.app.workspace.on("file-open", () => {
        this.collapsibleTitle?.attachAndEvaluateAll();
      })
    );

    this.addSettingTab(new AppleHigCompanionSettingTab(this.app, this));

    this.app.workspace.onLayoutReady(() => {
      this.syncModules();
    });
  }

  onunload(): void {
    this.floatingToolbar?.destroy();
    this.floatingToolbar = null;

    this.collapsibleTitle?.destroy();
    this.collapsibleTitle = null;

    this.haptics = null;
  }

  public syncModules(): void {
    this.floatingToolbar?.setEnabled(this.settings.enableFloatingToolbar);
    this.collapsibleTitle?.setEnabled(this.settings.enableCollapsibleTitle);
    this.haptics?.setEnabled(this.settings.enableHaptics);
  }

  async loadSettings(): Promise<void> {
    const data = (await this.loadData()) as Partial<AppleHigCompanionSettings> | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}