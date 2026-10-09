# `components`

Reusable presentation components shared across pages.

## Inputs/outputs
Components consume typed props and application state and render UI. Provider secrets and authorization decisions do not belong here.

`ui/` contains reusable primitives; `magicui/` contains visual effects/components.

## Impact
Changes can affect many screens. Prefer backward-compatible props and add focused tests for behavior changes.
