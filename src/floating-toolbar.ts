import { Extension } from "@codemirror/state";
import { EditorView, ViewUpdate } from "@codemirror/view";
import { Platform, setIcon } from "obsidian";

interface ToolbarAction {
  id: string;
  icon: string;
  label: string;
  dividerBefore?: boolean;
  apply: (view: EditorView) => void;
}

export class FloatingSelectionToolbar {
  private toolbarEl: HTMLElement | null = null;
  private activeView: EditorView | null = null;
  private isEnabled = true;
  private isVisible = false;
  private rafId: number | null = null;
  private readonly onTriggerAction?: () => void;

  private readonly actions: ToolbarAction[] = [
    {
      id: "bold",
      icon: "bold",
      label: "Жирный",
      apply: (view) => this.toggleWrap(view, "**", "**")
    },
    {
      id: "italic",
      icon: "italic",
      label: "Курсив",
      apply: (view) => this.toggleWrap(view, "*", "*")
    },
    {
      id: "highlight",
      icon: "highlighter",
      label: "Выделение",
      apply: (view) => this.toggleWrap(view, "==", "==")
    },
    {
      id: "code",
      icon: "code",
      label: "Код",
      apply: (view) => this.toggleWrap(view, "`", "`")
    },
    {
      id: "link",
      icon: "link",
      label: "Внутренняя ссылка",
      apply: (view) => this.toggleWrap(view, "[[", "]]")
    },
    {
      id: "clear",
      icon: "remove-formatting",
      label: "Очистить форматирование",
      dividerBefore: true,
      apply: (view) => this.clearFormatting(view)
    }
  ];

  constructor(onTriggerAction?: () => void) {
    this.onTriggerAction = onTriggerAction;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.hide();
    }
  }

  public createEditorExtension(): Extension {
    return EditorView.updateListener.of((update: ViewUpdate) => {
      if (!this.isEnabled) return;

      if (update.docChanged) {
        this.hide();
        return;
      }

      if (update.selectionSet || update.focusChanged || update.geometryChanged) {
        this.scheduleUpdate(update.view);
      }
    });
  }

  public readonly handleGlobalScroll = (): void => {
    if (this.isVisible) {
      this.hide();
    }
  };

  public destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.toolbarEl) {
      this.toolbarEl.remove();
      this.toolbarEl = null;
    }
    this.activeView = null;
    this.isVisible = false;
  }

  private scheduleUpdate(view: EditorView): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.evaluateSelection(view);
    });
  }

  private evaluateSelection(view: EditorView): void {
    if (!this.isEnabled || !view.hasFocus) {
      this.hide();
      return;
    }

    const { from, to } = view.state.selection.main;
    if (from === to) {
      this.hide();
      return;
    }

    const selectedText = view.state.sliceDoc(from, to);
    if (!selectedText.trim()) {
      this.hide();
      return;
    }

    const startCoords = view.coordsAtPos(from);
    const endCoords = view.coordsAtPos(to);
    if (!startCoords || !endCoords) {
      this.hide();
      return;
    }

    this.activeView = view;
    const el = this.ensureToolbarEl();

    const selTop = Math.min(startCoords.top, endCoords.top);
    const selBottom = Math.max(startCoords.bottom, endCoords.bottom);
    const selCenterX = (startCoords.left + endCoords.right) / 2;

    const toolbarWidth = el.offsetWidth || 230;
    const toolbarHeight = el.offsetHeight || 40;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;

    // На iPad/iPhone оставляем зазор ~56px над выделением, чтобы не перекрывать нативное меню iOS
    const isTouch = Platform.isMobile || window.matchMedia("(pointer: coarse)").matches;
    const verticalGap = isTouch ? 56 : 10;

    let posX = selCenterX - toolbarWidth / 2;
    posX = Math.max(margin, Math.min(viewportWidth - toolbarWidth - margin, posX));

    let posY = selTop - toolbarHeight - verticalGap;
    let flipped = false;

    // Если сверху не хватает места — переворачиваем панель под выделение
    if (posY < margin + 36) {
      posY = selBottom + (isTouch ? 48 : 10);
      flipped = true;
      if (posY + toolbarHeight > viewportHeight - margin) {
        posY = Math.max(margin, selTop - toolbarHeight - 8);
        flipped = false;
      }
    }

    el.style.setProperty("--hig-ft-x", `${Math.round(posX)}px`);
    el.style.setProperty("--hig-ft-y", `${Math.round(posY)}px`);
    el.classList.toggle("is-flipped", flipped);
    el.classList.add("is-visible");
    this.isVisible = true;
  }

  public hide(): void {
    if (!this.isVisible && !this.toolbarEl) return;
    this.isVisible = false;
    this.activeView = null;
    if (this.toolbarEl) {
      this.toolbarEl.classList.remove("is-visible");
    }
  }

  private ensureToolbarEl(): HTMLElement {
    if (this.toolbarEl && document.body.contains(this.toolbarEl)) {
      return this.toolbarEl;
    }

    const container = document.body.createDiv({
      cls: "hig-floating-toolbar hig-island"
    });

    // Блокируем потерю фокуса и сброс выделения в CodeMirror 6 при клике/тапе
    container.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    for (const action of this.actions) {
      if (action.dividerBefore) {
        container.createDiv({ cls: "hig-floating-toolbar-divider" });
      }

      const btn = container.createEl("button", {
        cls: "hig-floating-toolbar-btn",
        attr: {
          type: "button",
          "aria-label": action.label
        }
      });
      setIcon(btn, action.icon);

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!this.activeView) return;
        action.apply(this.activeView);
        this.onTriggerAction?.();
        this.scheduleUpdate(this.activeView);
      });
    }

    this.toolbarEl = container;
    return container;
  }

  private toggleWrap(view: EditorView, prefix: string, suffix: string): void {
    const { from, to } = view.state.selection.main;
    if (from === to) return;

    const docLength = view.state.doc.length;
    const selected = view.state.sliceDoc(from, to);

    // 1. Проверяем, обёрнут ли сам выделенный фрагмент
    if (
      selected.startsWith(prefix) &&
      selected.endsWith(suffix) &&
      selected.length >= prefix.length + suffix.length
    ) {
      const unwrapped = selected.slice(prefix.length, selected.length - suffix.length);
      view.dispatch({
        changes: { from, to, insert: unwrapped },
        selection: { anchor: from, head: from + unwrapped.length }
      });
      return;
    }

    // 2. Проверяем, находятся ли маркеры непосредственно снаружи выделения
    const outerFrom = from - prefix.length;
    const outerTo = to + suffix.length;
    if (outerFrom >= 0 && outerTo <= docLength) {
      const before = view.state.sliceDoc(outerFrom, from);
      const after = view.state.sliceDoc(to, outerTo);
      if (before === prefix && after === suffix) {
        view.dispatch({
          changes: [
            { from: outerFrom, to: from, insert: "" },
            { from: to, to: outerTo, insert: "" }
          ],
          selection: { anchor: outerFrom, head: outerFrom + selected.length }
        });
        return;
      }
    }

    // 3. Оборачиваем выделенный текст
    const wrapped = `${prefix}${selected}${suffix}`;
    view.dispatch({
      changes: { from, to, insert: wrapped },
      selection: {
        anchor: from + prefix.length,
        head: from + prefix.length + selected.length
      }
    });
  }

  private clearFormatting(view: EditorView): void {
    const { from, to } = view.state.selection.main;
    if (from === to) return;

    const selected = view.state.sliceDoc(from, to);
    const cleaned = selected
      .replace(/(\*\*|__|~~|==|`)/g, "")
      .replace(/(\*|_)/g, "")
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
      .replace(/\[\[([^\]]+)\]\]/g, "$1");

    view.dispatch({
      changes: { from, to, insert: cleaned },
      selection: { anchor: from, head: from + cleaned.length }
    });
  }
}