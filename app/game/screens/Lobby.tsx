import { useEffect, useRef, useState } from 'preact/hooks';
import { config } from '../../../core/index.ts';
import type { PlayerView } from '../../../core/index.ts';
import type { Translate } from '../../i18n/index.ts';
import { Button } from '../../ui/Button.tsx';
import { TextField } from '../../ui/Field.tsx';
import { Panel } from '../../ui/Hero.tsx';
import { PlayerList, RoomCode } from '../../ui/Lobby.tsx';
import { act, copyCode } from '../controller.ts';
import { avatarOf, facilitatorRole, key, playerName } from '../format.ts';
import type { AppState } from '../store.ts';

export interface LobbyProps {
  view: PlayerView;
  state: AppState;
  t: Translate;
}

/**
 * The lobby: the code to share, the team name, who facilitates first, the seated players and the start.
 */
export function Lobby({ view, state, t }: LobbyProps) {
  const self = view.players.find((player) => player.id === view.selfId);
  const [name, setName] = useState(self?.name ?? '');
  const sent = useRef(self?.name ?? '');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHost = view.hostId === view.selfId;
  const seated = view.players.length;
  const free = Math.max(0, config.players.max - seated);
  const canStart = view.controls.includes('start_game');
  const facilitator = view.players.find((player) => player.id === view.facilitatorId);
  const volunteering = self !== undefined && self.role === 'facilitator' && !self.isHost;
  const kanban = view.framework === 'kanban';

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  function changeName(value: string): void {
    setName(value);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (value.trim() !== sent.current) {
        sent.current = value.trim();
        act({ type: 'lobby.set_name', name: value });
      }
    }, 450);
  }

  let startNote = t('lobby.startRule', { min: config.players.min, max: config.players.max });
  if (kanban) startNote = t('lobby.kanbanSoon');
  else if (seated < config.players.min) startNote = t('lobby.waitingForPlayers', { min: config.players.min });
  else if (!isHost) startNote = t('lobby.onlyHostStarts');

  return (
    <>
      <div class="lg-play-head">
        <div class="lg-play-head__title">
          <p class="lg-eyebrow">{t(key(`start.framework.${view.framework}`))}</p>
          <h2 tabIndex={-1} data-lg-focus>
            {t('lobby.title')}
          </h2>
        </div>
        <span class="lg-muted">
          {t('lobby.players', { count: seated, max: config.players.max })} · {t('lobby.seatsLeft', { count: free })}
        </span>
      </div>
      <div class="lg-lobby lg-lobby--game">
        <Panel title={t('lobby.roomTitle')} icon="info" class="lg-lobby__room">
          <RoomCode
            code={view.code}
            label={t('lobby.share')}
            copyLabel={t('lobby.copyCode')}
            copied={state.copied}
            copiedLabel={t('common.copied')}
            onCopy={() => void copyCode(view.code)}
          />
          <p class="lg-muted">{t('lobby.shareSteps')}</p>
          <TextField id="lobby-team" label={t('lobby.teamName')} value={view.teamName} mono disabled hint={t('lobby.teamNameHint')} />
          {isHost ? (
            <div class="lg-cluster">
              <Button variant="secondary" size="sm" icon="switch" onClick={() => act({ type: 'lobby.new_team_name' })}>
                {t('lobby.newTeamName')}
              </Button>
            </div>
          ) : null}
        </Panel>
        <Panel title={t('lobby.players', { count: seated, max: config.players.max })} icon="users" class="lg-lobby__players">
          <PlayerList
            title={t('common.players', { count: seated })}
            emptySeats={free}
            emptyLabel={t('lobby.seat')}
            rows={view.players.map((player) => ({
              player: avatarOf(player, view, t),
              status: !player.connected ? t('lobby.status.reconnecting') : player.isHost ? t('lobby.status.host') : t('lobby.status.ready'),
            }))}
          />
          <Button variant="primary" size="lg" icon="play" block disabled={!canStart} onClick={() => act({ type: 'lobby.start' })}>
            {t('lobby.start')}
          </Button>
          <p class="lg-muted" role="status">
            {startNote}
          </p>
        </Panel>
        <Panel class="lg-lobby__you">
          <TextField
            id="lobby-name"
            label={t('lobby.yourName')}
            value={name}
            maxLength={config.players.nameMax}
            hint={t('lobby.yourNameHint', { max: config.players.nameMax })}
            onInput={changeName}
          />
          <p class="lg-muted">{t(key(`lobby.facilitatorHint.${view.framework}`))}</p>
          {facilitator !== undefined ? (
            <p class="lg-lobby__fac">{t('lobby.facilitatorIs', { name: playerName(facilitator, t), role: facilitatorRole(view, t) })}</p>
          ) : null}
          <div class="lg-cluster">
            <Button
              variant="quiet"
              size="sm"
              icon="flag"
              onClick={() => act({ type: 'lobby.volunteer', volunteer: !volunteering })}
            >
              {volunteering ? t('lobby.withdraw') : t(key(`lobby.volunteer.${view.framework}`))}
            </Button>
          </div>
        </Panel>
      </div>
    </>
  );
}
