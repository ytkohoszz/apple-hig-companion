import { Platform } from "obsidian";

interface CapacitorHapticsPlugin {
  impact?: (options: { style: "LIGHT" | "MEDIUM" | "HEAVY" }) => Promise<void>;
}

interface WindowWithCapacitor extends Window {
  Capacitor?: {
    Plugins?: {
      Haptics?: CapacitorHapticsPlugin;
    };
  };
}

export class HapticsManager {
  private isEnabled = true;

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public triggerLight(): void {
    if (!this.isEnabled || !Platform.isMobile) return;

    try {
      const cap = (window as WindowWithCapacitor).Capacitor;
      if (cap?.Plugins?.Haptics?.impact) {
        void cap.Plugins.Haptics.impact({ style: "LIGHT" });
        return;
      }

      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(10);
      }
    } catch {
      // Игнорируем на устройствах и WebView без поддержки Haptics/Vibration API
    }
  }

  public readonly handleDocumentClick = (evt: MouseEvent): void => {
    if (!this.isEnabled || !Platform.isMobile) return;

    const target = evt.target;
    if (!(target instanceof HTMLElement)) return;

    if (
      target.matches("input.task-list-item-checkbox") ||
      target.closest(".task-list-item-checkbox")
    ) {
      this.triggerLight();
    }
  };
}