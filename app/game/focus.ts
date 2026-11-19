const Focusable = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';

export interface FocusTrail {
  element: Element;
  places: { container: Element; index: number }[];
}

function visible(element: Element): boolean {
  return (element as HTMLElement).offsetParent !== null || getComputedStyle(element).position === 'fixed';
}

/**
 * Notes where the focused control sits in each of its enclosing lists, so focus can be put back near it if the control goes away.
 */
export function trailOf(element: Element): FocusTrail {
  const places: FocusTrail['places'] = [];
  let container = element.parentElement;
  while (container !== null && container.tagName !== 'MAIN' && container !== document.body && places.length < 6) {
    const list = [...container.querySelectorAll(Focusable)];
    const index = list.indexOf(element);
    if (index >= 0) places.push({ container, index });
    container = container.parentElement;
  }
  return { element, places };
}

/**
 * The control that took the place of the one that disappeared: same index in the nearest enclosing list that still exists.
 */
export function successorOf(trail: FocusTrail): HTMLElement | null {
  for (const { container, index } of trail.places) {
    if (!container.isConnected) continue;
    const list = [...container.querySelectorAll<HTMLElement>(Focusable)].filter(visible);
    if (list.length === 0) continue;
    return list[Math.min(index, list.length - 1)] ?? null;
  }
  return null;
}
