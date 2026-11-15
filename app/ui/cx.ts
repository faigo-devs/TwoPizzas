export type ClassValue = string | false | null | undefined;

/**
 * Joins the truthy class names into one attribute value.
 */
export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
