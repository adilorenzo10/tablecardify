export type TableCardifyTheme = "default" | "bootstrap";

export type TableCardifyOptions = {
  breakpoint?: number | string;
  theme?: TableCardifyTheme;
  cardClassName?: string;
  detailsClassName?: string;
  summaryClassName?: string;
  bodyClassName?: string;
  emptyCellText?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  detailsBackgroundColor?: string;
  summaryBackgroundColor?: string;
  bodyBackgroundColor?: string;
  textColor?: string;
  labelColor?: string;
  borderColor?: string;
  borderRadius?: string;
};

type NormalizedOptions = {
  breakpoint: string;
  theme: TableCardifyTheme;
  cardClassName: string;
  detailsClassName: string;
  summaryClassName: string;
  bodyClassName: string;
  emptyCellText: string;
  collapsible: boolean;
  defaultExpanded: boolean;
  detailsBackgroundColor?: string;
  summaryBackgroundColor?: string;
  bodyBackgroundColor?: string;
  textColor?: string;
  labelColor?: string;
  borderColor?: string;
  borderRadius?: string;
};

type ColumnMeta = {
  index: number;
  label: string;
  isTitle: boolean;
  isHidden: boolean;
  isActions: boolean;
};

const DEFAULT_OPTIONS: NormalizedOptions = {
  breakpoint: "(max-width: 991.98px)",
  theme: "default",
  cardClassName: "",
  detailsClassName: "",
  summaryClassName: "",
  bodyClassName: "",
  emptyCellText: "—",
  collapsible: false,
  defaultExpanded: true,
};

function normalizeBreakpoint(value?: number | string): string {
  if (typeof value === "number") {
    const maxWidth = Math.max(0, value - 0.02);
    return `(max-width: ${maxWidth}px)`;
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim().startsWith("(") ? value.trim() : `(max-width: ${value.trim()})`;
  }

  return DEFAULT_OPTIONS.breakpoint;
}

function cloneChildrenInto(source: HTMLElement, target: HTMLElement): boolean {
  const nodes = Array.from(source.childNodes);
  if (!nodes.length) {
    return false;
  }

  nodes.forEach((node) => target.appendChild(node.cloneNode(true)));
  return true;
}

function applyCardVariables(element: HTMLElement, options: NormalizedOptions): void {
  const variables: Array<[string, string | undefined]> = [
    ["--tc-details-bg", options.detailsBackgroundColor],
    ["--tc-summary-bg", options.summaryBackgroundColor],
    ["--tc-body-bg", options.bodyBackgroundColor],
    ["--tc-text-color", options.textColor],
    ["--tc-label-color", options.labelColor],
    ["--tc-border-color", options.borderColor],
    ["--tc-radius", options.borderRadius],
  ];

  variables.forEach(([name, value]) => {
    if (value) {
      element.style.setProperty(name, value);
    }
  });
}

class TableCardifyTable {
  private readonly table: HTMLTableElement;
  private readonly options: NormalizedOptions;
  private readonly mediaQuery: MediaQueryList;
  private readonly container: HTMLDivElement;
  private readonly onMediaChange: (event: MediaQueryListEvent) => void;

  constructor(table: HTMLTableElement, options: NormalizedOptions) {
    this.table = table;
    this.options = options;
    this.mediaQuery = window.matchMedia(options.breakpoint);
    this.container = document.createElement("div");
    this.container.className = [
      "tablecardify",
      options.theme === "bootstrap" ? "tablecardify--bootstrap" : "",
      options.cardClassName,
    ]
      .filter(Boolean)
      .join(" ");
    this.container.hidden = true;

    this.onMediaChange = (event) => {
      if (event.matches) {
        this.render();
      } else {
        this.restoreTable();
      }
    };

    this.mount();
  }

  mount(): void {
    this.table.classList.add("tablecardify__source");
    this.table.insertAdjacentElement("afterend", this.container);
    this.mediaQuery.addEventListener("change", this.onMediaChange);

    if (this.mediaQuery.matches) {
      this.render();
    }
  }

  destroy(): void {
    this.mediaQuery.removeEventListener("change", this.onMediaChange);
    this.restoreTable();
    this.container.remove();
    this.table.classList.remove("tablecardify__source", "tablecardify__source--hidden");
  }

  private restoreTable(): void {
    this.table.classList.remove("tablecardify__source--hidden");
    this.container.hidden = true;
    this.container.replaceChildren();
  }

  private render(): void {
    const headerRow = this.table.tHead?.rows.item(0);
    const bodyRows = Array.from(this.table.tBodies.item(0)?.rows ?? []);

    if (!headerRow || !bodyRows.length) {
      this.restoreTable();
      return;
    }

    const columns = Array.from(headerRow.cells).map((cell, index) => this.getColumnMeta(cell, index));

    this.container.replaceChildren();

    bodyRows.forEach((row) => {
      const card = this.buildCard(row, columns);
      if (card) {
        this.container.appendChild(card);
      }
    });

    this.table.classList.add("tablecardify__source--hidden");
    this.container.hidden = false;
  }

  private getColumnMeta(cell: HTMLTableCellElement, index: number): ColumnMeta {
    const dataset = cell.dataset;
    return {
      index,
      label: dataset.tcLabel?.trim() || cell.textContent?.trim() || `Colonna ${index + 1}`,
      isTitle: dataset.tcTitle !== undefined,
      isHidden: dataset.tcHide !== undefined || cell.hidden,
      isActions: dataset.tcActions !== undefined,
    };
  }

  private setupCollapsibleCard(card: HTMLDetailsElement, summary: HTMLElement, content: HTMLElement): void {
    let isAnimating = false;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      return;
    }

    const cleanupOpenState = () => {
      content.style.height = "auto";
      content.style.opacity = "1";
      card.classList.remove("tablecardify--animating");
      isAnimating = false;
    };

    const cleanupClosedState = () => {
      card.open = false;
      content.style.height = "0px";
      content.style.opacity = "0";
      card.classList.remove("tablecardify--animating");
      isAnimating = false;
    };

    if (!card.open) {
      content.style.height = "0px";
      content.style.opacity = "0";
    }

    summary.addEventListener("click", (event) => {
      event.preventDefault();

      if (isAnimating) {
        return;
      }

      isAnimating = true;
      card.classList.add("tablecardify--animating");

      if (card.open) {
        const startHeight = `${content.scrollHeight}px`;
        content.style.height = startHeight;
        content.style.opacity = "1";

        requestAnimationFrame(() => {
          content.style.height = "0px";
          content.style.opacity = "0";
        });

        const onCloseEnd = (transitionEvent: TransitionEvent) => {
          if (transitionEvent.propertyName !== "height") {
            return;
          }
          content.removeEventListener("transitionend", onCloseEnd);
          cleanupClosedState();
        };

        content.addEventListener("transitionend", onCloseEnd);
        return;
      }

      card.open = true;
      content.style.height = "0px";
      content.style.opacity = "0";

      requestAnimationFrame(() => {
        const targetHeight = `${content.scrollHeight}px`;
        content.style.height = targetHeight;
        content.style.opacity = "1";
      });

      const onOpenEnd = (transitionEvent: TransitionEvent) => {
        if (transitionEvent.propertyName !== "height") {
          return;
        }
        content.removeEventListener("transitionend", onOpenEnd);
        cleanupOpenState();
      };

      content.addEventListener("transitionend", onOpenEnd);
    });
  }

  private buildCard(row: HTMLTableRowElement, columns: ColumnMeta[]): HTMLElement | null {
    const card = this.options.collapsible
      ? document.createElement("details")
      : document.createElement("article");
    card.className = ["tablecardify__card", this.options.cardClassName].filter(Boolean).join(" ");
    applyCardVariables(card, this.options);

    if (this.options.collapsible && card instanceof HTMLDetailsElement) {
      card.classList.add("tablecardify__card--collapsible");
      if (this.options.detailsClassName) {
        card.classList.add(...this.options.detailsClassName.split(" ").filter(Boolean));
      }
      card.open = this.options.defaultExpanded;
    }

    const body = document.createElement("div");
    body.className = ["tablecardify__body", this.options.bodyClassName].filter(Boolean).join(" ");

    const footer = document.createElement("div");
    footer.className = "tablecardify__footer";

    let titleText = "";
    let hasVisibleContent = false;
    let hasFooterContent = false;

    Array.from(row.cells).forEach((cell, index) => {
      const column = columns[index];
      if (!column || column.isHidden) {
        return;
      }

      const cellElement = cell as HTMLTableCellElement;

      if (column.isTitle && !titleText) {
        titleText = cellElement.textContent?.trim() || "";
      }

      if (column.isActions || cellElement.dataset.tcActions !== undefined) {
        hasFooterContent = cloneChildrenInto(cellElement, footer) || hasFooterContent;
        return;
      }

      const rowBlock = document.createElement("div");
      rowBlock.className = "tablecardify__row";

      const label = document.createElement("div");
      label.className = "tablecardify__label";
      label.textContent = column.label;

      const value = document.createElement("div");
      value.className = "tablecardify__value";

      const hasClonedChildren = cloneChildrenInto(cellElement, value);
      if (!hasClonedChildren) {
        value.textContent = cellElement.textContent?.trim() || this.options.emptyCellText;
      }

      rowBlock.append(label, value);
      body.appendChild(rowBlock);
      hasVisibleContent = true;
    });

    if (!hasVisibleContent && !hasFooterContent) {
      return null;
    }

    if (!titleText) {
      const fallbackCell = Array.from(row.cells).find((cell) => cell.textContent?.trim());
      titleText = fallbackCell?.textContent?.trim() || "Riga tabella";
    }

    const title = document.createElement("h3");
    title.className = "tablecardify__title";
    title.textContent = titleText;

    const content = document.createElement("div");
    content.className = "tablecardify__content";

    const contentInner = document.createElement("div");
    contentInner.className = "tablecardify__content-inner";

    if (hasVisibleContent) {
      contentInner.appendChild(body);
    }

    if (hasFooterContent) {
      contentInner.appendChild(footer);
    }

    content.appendChild(contentInner);

    if (this.options.collapsible) {
      const toggle = document.createElement("summary");
      toggle.className = ["tablecardify__toggle", "tablecardify__header", this.options.summaryClassName]
        .filter(Boolean)
        .join(" ");

      const toggleInner = document.createElement("div");
      toggleInner.className = "tablecardify__toggle-inner";

      const chevron = document.createElement("span");
      chevron.className = "tablecardify__chevron";
      chevron.setAttribute("aria-hidden", "true");

      toggleInner.append(title, chevron);
      toggle.appendChild(toggleInner);
      card.append(toggle, content);

      if (card instanceof HTMLDetailsElement) {
        this.setupCollapsibleCard(card, toggle, content);
      }
    } else {
      const header = document.createElement("header");
      header.className = ["tablecardify__header", this.options.summaryClassName].filter(Boolean).join(" ");
      header.appendChild(title);
      card.append(header, content);
    }

    return card;
  }
}

export class TableCardify {
  private readonly tables: TableCardifyTable[];

  constructor(
    target: string | HTMLTableElement | HTMLTableElement[] | NodeListOf<HTMLTableElement>,
    options: TableCardifyOptions = {},
  ) {
    const normalizedOptions: NormalizedOptions = {
      breakpoint: normalizeBreakpoint(options.breakpoint),
      theme: options.theme ?? DEFAULT_OPTIONS.theme,
      cardClassName: options.cardClassName ?? DEFAULT_OPTIONS.cardClassName,
      detailsClassName: options.detailsClassName ?? DEFAULT_OPTIONS.detailsClassName,
      summaryClassName: options.summaryClassName ?? DEFAULT_OPTIONS.summaryClassName,
      bodyClassName: options.bodyClassName ?? DEFAULT_OPTIONS.bodyClassName,
      emptyCellText: options.emptyCellText ?? DEFAULT_OPTIONS.emptyCellText,
      collapsible: options.collapsible ?? DEFAULT_OPTIONS.collapsible,
      defaultExpanded: options.defaultExpanded ?? DEFAULT_OPTIONS.defaultExpanded,
      detailsBackgroundColor: options.detailsBackgroundColor,
      summaryBackgroundColor: options.summaryBackgroundColor,
      bodyBackgroundColor: options.bodyBackgroundColor,
      textColor: options.textColor,
      labelColor: options.labelColor,
      borderColor: options.borderColor,
      borderRadius: options.borderRadius,
    };

    const tables = this.resolveTables(target);
    this.tables = tables.map((table) => new TableCardifyTable(table, normalizedOptions));
  }

  destroy(): void {
    this.tables.forEach((table) => table.destroy());
  }

  private resolveTables(
    target: string | HTMLTableElement | HTMLTableElement[] | NodeListOf<HTMLTableElement>,
  ): HTMLTableElement[] {
    if (typeof target === "string") {
      return Array.from(document.querySelectorAll<HTMLTableElement>(target));
    }

    if (target instanceof HTMLTableElement) {
      return [target];
    }

    return Array.from(target);
  }
}

export function initTableCardify(
  selector = "[data-tablecardify]",
  options: TableCardifyOptions = {},
): TableCardify | null {
  const tables = document.querySelectorAll<HTMLTableElement>(selector);
  if (!tables.length) {
    return null;
  }

  return new TableCardify(tables, options);
}
