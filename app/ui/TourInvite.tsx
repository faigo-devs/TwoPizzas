import { Button } from './Button.tsx';
import { Icon } from './Icon.tsx';

export interface TourInviteProps {
  badge: string;
  title: string;
  text: string;
  facts: string;
  routeLabel: string;
  stops: string[];
  startLabel: string;
  busy?: boolean;
  onStart?: () => void;
}

/**
 * The solo-tour zone of the start screen: what the visitor will do, the route with numbered stops, the facts and the button.
 */
export function TourInvite({ badge, title, text, facts, routeLabel, stops, startLabel, busy = false, onStart }: TourInviteProps) {
  const rows = Math.ceil(stops.length / 2);
  return (
    <section id="lg-tour" class="lg-zone lg-zone--tour" aria-labelledby="lg-tour-title">
      <p class="lg-zone__badge lg-zone__badge--tour">
        <Icon name="flag" size={14} />
        <span>{badge}</span>
      </p>
      <h2 id="lg-tour-title" class="lg-zone__title">
        {title}
      </h2>
      <p class="lg-zone__text">{text}</p>
      <ol class="lg-route" aria-label={routeLabel} style={{ '--lg-rows': rows }}>
        {stops.map((stop, index) => (
          <li key={stop} class={index === rows - 1 || index === stops.length - 1 ? 'lg-route__stop is-end' : 'lg-route__stop'}>
            <span class="lg-route__n" aria-hidden="true">
              {index + 1}
            </span>
            <span class="lg-route__t">{stop}</span>
          </li>
        ))}
      </ol>
      <p class="lg-zone__facts lg-zone__facts--tour">{facts}</p>
      <div class="lg-cluster">
        <Button variant="tour" size="lg" icon="play" disabled={busy} onClick={onStart}>
          {startLabel}
        </Button>
      </div>
    </section>
  );
}
