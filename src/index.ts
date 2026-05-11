export type TableCardifyTheme = "default" | "bootstrap";

export type TableCardifyOptions = {
  breakpoint?: number | string;
  theme?: TableCardifyTheme;
  cardClassName?: string;
  emptyCellText?: string;
};

type NormalizedOptions = {
  breakpoint: string;
  theme: TableCardifyTheme;
  cardClassName: string;
  emptyCellText: string;
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
  emptyCellText: "—",
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

  private buildCard(row: HTMLTableRowElement, columns: ColumnMeta[]): HTMLElement | null {
    const card = document.createElement("article");
    card.className = "tablecardify__card";

    const body = document.createElement("div");
    body.className = "tablecardify__body";

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

    const header = document.createElement("header");
    header.className = "tablecardify__header";

    const title = document.createElement("h3");
    title.className = "tablecardify__title";
    title.textContent = titleText;

    header.appendChild(title);
    card.appendChild(header);

    if (hasVisibleContent) {
      card.appendChild(body);
    }

    if (hasFooterContent) {
      card.appendChild(footer);
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
      emptyCellText: options.emptyCellText ?? DEFAULT_OPTIONS.emptyCellText,
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
