// Dropdowns rendered in a portal (e.g. the shared Select) carry this
// attribute. Outside-click handlers of popovers, menus and modals should
// ignore clicks inside them, since the portal sits outside their DOM tree.
export const FLOATING_LAYER_ATTR = 'data-floating-layer'

export const isInFloatingLayer = (target) =>
  !!(target && target.closest && target.closest(`[${FLOATING_LAYER_ATTR}]`))
