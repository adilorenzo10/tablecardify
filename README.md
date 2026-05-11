# tablecardify

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Build: tsup](https://img.shields.io/badge/build-tsup-FF6B6B)
![Status: Experimental](https://img.shields.io/badge/status-experimental-F59E0B)

Turn HTML tables into responsive cards below a configurable breakpoint, without rewriting your desktop markup.

`tablecardify` is designed for the common case where wide tables become hard to use on mobile, especially in Bootstrap dashboards, admin panels, and backoffice interfaces.

## Status

This package is currently in an early stage (`0.1.0`), with the goal of being extracted into a dedicated public repository.

## Tech stack

- Language: TypeScript
- Runtime target: modern browsers
- Build tool: tsup

## License

This package is open source and released under the [MIT License](./LICENSE), a permissive license that allows private use, modification, distribution, and commercial use.

## Goals

- Progressive enhancement: the table remains the source of truth.
- Configurable breakpoint.
- Works with plain HTML and Bootstrap-based projects.
- Support for hidden columns, row titles, and action cells.
- No runtime dependencies.

## Installation

```bash
npm install tablecardify
```

## Quick start

```ts
import { TableCardify } from "tablecardify";
import "tablecardify/styles.css";

new TableCardify(".table", {
  breakpoint: 992,
  theme: "bootstrap",
});
```

## HTML example

```html
<table class="table" data-tablecardify>
  <thead>
    <tr>
      <th data-tc-title>Employee</th>
      <th>Date</th>
      <th>Status</th>
      <th data-tc-actions>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Mario Rossi</td>
      <td>05/11/2026</td>
      <td>Submitted</td>
      <td>
        <button type="button">Open</button>
      </td>
    </tr>
  </tbody>
</table>
```

## Supported attributes

- `data-tablecardify`: enables auto-init through a custom selector.
- `data-tc-title`: uses this column as the card title.
- `data-tc-label="..."`: overrides the label shown in the card view.
- `data-tc-hide`: hides the column in card view.
- `data-tc-actions`: moves the cell into the card actions footer.

## Initial API

```ts
type TableCardifyOptions = {
  breakpoint?: number | string;
  theme?: "default" | "bootstrap";
  cardClassName?: string;
  emptyCellText?: string;
};
```

## MVP roadmap

- Public demo with before/after examples.
- Optional mutation observation for dynamic tables.
- Better support for complex cells with form controls.
- Dedicated Bootstrap 5 theme package.
- Automated tests for header parsing and responsive rebuild behavior.

## Development

```bash
npm install
npm run build
```
