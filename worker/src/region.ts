/**
 * A Durable Object namespace that can be restricted to a jurisdiction.
 */
export interface Restrictable<Restricted> {
  jurisdiction(name: 'eu'): Restricted;
}

/**
 * The namespace restricted to the EU jurisdiction unless the configuration says exactly "local", the value only local development sets, so a missing or mistyped setting still keeps the data in the EU.
 */
export function inRegion<Namespace extends Restrictable<Namespace>>(namespace: Namespace, jurisdiction: string | undefined): Namespace {
  return jurisdiction === 'local' ? namespace : namespace.jurisdiction('eu');
}
