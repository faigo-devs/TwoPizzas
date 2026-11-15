import { Icon } from './Icon.tsx';

export interface FooterProps {
  identity: { name: string; seat: string; cif: string; regCom: string };
  byline?: string;
  labels: { cif: string; regCom: string; privacySummary: string; privacy: string[]; linksTitle: string; newTab: string };
  links: { label: string; href: string }[];
}

/**
 * Page footer: the firm's identity, the privacy text in a disclosure, and the three outbound source links.
 */
export function Footer({ identity, byline, labels, links }: FooterProps) {
  return (
    <footer class="lg-footer">
      <div class="lg-footer__inner">
        <div class="lg-footer__id">
          {byline ? <p class="lg-footer__byline">{byline}</p> : null}
          <p class="lg-footer__name">{identity.name}</p>
          <p>{identity.seat}</p>
          <p class="lg-footer__reg">
            {labels.cif} {identity.cif}
          </p>
          <p class="lg-footer__reg">
            {labels.regCom} {identity.regCom}
          </p>
        </div>
        <details class="lg-footer__privacy">
          <summary>{labels.privacySummary}</summary>
          {labels.privacy.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </details>
        <nav class="lg-footer__links" aria-label={labels.linksTitle}>
          <p class="lg-footer__links-title">{labels.linksTitle}</p>
          <ul>
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  <span>{link.label}</span>
                  <Icon name="external" size={14} />
                  <span class="lg-sr">{labels.newTab}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
