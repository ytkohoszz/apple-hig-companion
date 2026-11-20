import { App, MarkdownView } from "obsidian";

export class CollapsibleTitleManager {
  private readonly app: App;
  private isEnabled = true;
  private readonly boundScrollers = new WeakSet<HTMLElement>();
  private readonly scheduledContainers = new WeakSet<HTMLElement>();

  constructor(app: App) {
    this.app = app;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.cleanupAll();
    } else {
      this.attachAndEvaluateAll();
    }
  }

  public attachAndEvaluateAll(): void {
    if (!this.isEnabled) return;

    this.app.workspace.iterateAllLeaves((leaf) => {
      const view = leaf.view;
      if (!(view instanceof MarkdownView)) return;

      const container = view.containerEl;
      container.classList.add("hig-collapsible-title-enabled");

      const scrollers = container.querySelectorAll<HTMLElement>(
        ".cm-scroller, .markdown-preview-view"
      );

      scrollers.forEach((scroller) => {
        if (!this.boundScrollers.has(scroller)) {
          this.boundScrollers.add(scroller);
          scroller.addEventListener(
            "scroll",
            () => this.scheduleEvaluate(container),
            { passive: true }
          );
        }
      });

      this.scheduleEvaluate(container);
    });
  }

  public destroy(): void {
    this.cleanupAll();
  }

  private scheduleEvaluate(container: HTMLElement): void {
    if (!this.isEnabled || this.scheduledContainers.has(container)) return;

    this.scheduledContainers.add(container);
    requestAnimationFrame(() => {
      this.scheduledContainers.delete(container);
      if (this.isEnabled && document.body.contains(container)) {
        this.evaluateContainer(container);
      }
    });
  }

  private evaluateContainer(container: HTMLElement): void {
    const viewContent = container.querySelector<HTMLElement>(".view-content");
    if (!viewContent) return;

    const isReadingMode = container.classList.contains("is-reading-view") ||
      viewContent.querySelector(".markdown-reading-view")?.getCssPropertyValue("display") !== "none";

    const activeRoot = isReadingMode
      ? viewContent.querySelector<HTMLElement>(".markdown-reading-view")
      : viewContent.querySelector<HTMLElement>(".markdown-source-view");

    if (!activeRoot) return;

    // Ищем видимый .inline-title или первый заголовок H1
    const inlineTitle = activeRoot.querySelector<HTMLElement>(".inline-title");
    const hasVisibleInlineTitle =
      inlineTitle !== null && inlineTitle.offsetParent !== null;

    const headingEl = hasVisibleInlineTitle
      ? inlineTitle
      : activeRoot.querySelector<HTMLElement>(
          ".markdown-preview-section h1, .HyperMD-header-1"
        );

    // Если в заметке нет ни inline-title, ни H1 — оставляем заголовок в шапке видимым
    if (!headingEl || headingEl.offsetParent === null) {
      container.classList.add("is-title-collapsed");
      return;
    }

    const contentTop = viewContent.getBoundingClientRect().top;
    const headingRect = headingEl.getBoundingClientRect();
    const threshold = contentTop + Math.min(headingRect.height * 0.45, 18);

    const isScrolledPast = headingRect.bottom <= threshold;
    container.classList.toggle("is-title-collapsed", isScrolledPast);
  }

  private cleanupAll(): void {
    document
      .querySelectorAll<HTMLElement>(".hig-collapsible-title-enabled")
      .forEach((el) => {
        el.classList.remove("hig-collapsible-title-enabled", "is-title-collapsed");
      });
  }
}