import { useEffect, useRef, useState } from 'preact/hooks';
import { config, sessionAgenda } from '../../../core/index.ts';
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

function Agenda({ view, t }: { view: PlayerView; t: Translate }) {
  const { entries, totalMinutes } = sessionAgenda();
  const iteration = (n: number) => t(key(`iteration.${view.framework}`), { n });
  return (
    <details class="lg-obs lg-obs--fold lg-agenda">
      <summary>{t('lobby.agenda.title')}</summary>
      <p class="lg-muted">{t('lobby.agenda.note')}</p>
      <p class="lg-muted lg-agenda__legend">{t('lobby.agenda.legend', { first: iteration(1), second: iteration(2) })}</p>
      <ol class="lg-agenda__list">
        {entries.map((entry) => {
          const name = t(key(`phase.${view.framework}.${entry.event}.name`));
          const same = entry.minutes.every((minutes) => minutes === entry.minutes[0]);
          return (
            <li key={`${entry.event}-${entry.half ?? 0}`}>
              <span>{entry.half === null ? name : t('lobby.agenda.half', { name, n: entry.half })}</span>
              <span class="lg-mono">{t('lobby.agenda.row', { minutes: same ? String(entry.minutes[0]) : entry.minutes.join(' / ') })}</span>
            </li>
          );
        })}
      </ol>
      <p class="lg-agenda__total">{t('lobby.agenda.total', { minutes: totalMinutes })}</p>
      <p class="lg-muted">{t('lobby.agenda.talk')}</p>
    </details>
  );
}

/**
 * The lobby: the code to share, the team name, who facilitates first, the seated players and the start.
 */
export function Lobby({ view, state, t }: LobbyProps) {
  const self = view.players.find((player) => player.id === view.selfId);
  const [name, setName] = useState(self?.name ?? '');
  const sent = useRef(self?.name ?? '');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const isHost = view.hostId === view.selfId;
  const seated = view.players.length;
  const free = Math.max(0, config.players.max - seated);
  const canStart = view.controls.includes('start_game');
  const canRemove = view.controls.includes('kick_player');
  const canLock = view.controls.includes('lock_room');
  const canUnlock = view.controls.includes('unlock_room');
  const facilitator = view.players.find((player) => player.id === view.facilitatorId);
  const volunteering = self !== undefined && self.role === 'facilitator' && !self.isHost;

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
  if (seated < config.players.min) startNote = t('lobby.waitingForPlayers', { min: config.players.min });
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
          {state.mode === 'remote' ? (
            <>
              <RoomCode
                code={view.code}
                label={t('lobby.share')}
                copyLabel={t('lobby.copyCode')}
                copied={state.copied}
                copiedLabel={t('common.copied')}
                onCopy={() => void copyCode(view.code)}
              />
              <p class="lg-muted">{t('lobby.shareSteps')}</p>
            </>
          ) : null}
          <TextField id="lobby-team" label={t('lobby.teamName')} value={view.teamName} mono disabled hint={t('lobby.teamNameHint')} />
          {isHost ? (
            <div class="lg-cluster">
              <Button variant="secondary" size="sm" icon="switch" onClick={() => act({ type: 'lobby.new_team_name' })}>
                {t('lobby.newTeamName')}
              </Button>
            </div>
          ) : null}
          <Agenda view={view} t={t} />
        </Panel>
        <Panel title={t('lobby.players', { count: seated, max: config.players.max })} icon="users" class="lg-lobby__players">
          <PlayerList
            title={t('common.players', { count: seated })}
            emptySeats={free}
            emptyLabel={t('lobby.seat')}
            rows={view.players.map((player) => ({
              player: avatarOf(player, view, t),
              status: !player.connected ? t('lobby.status.reconnecting') : player.isHost ? t('lobby.status.host') : t('lobby.status.ready'),
              removal:
                canRemove && player.id !== view.selfId
                  ? {
                      label: t('lobby.kickAria', { name: playerName(player, t) }),
                      confirmText: t('lobby.kickConfirm', { name: playerName(player, t) }),
                      confirmLabel: t('lobby.kickYes'),
                      cancelLabel: t('common.cancel'),
                      confirming: confirming === player.id,
                      onAsk: () => setConfirming(player.id),
                      onConfirm: () => {
                        setConfirming(null);
                        act({ type: 'lobby.kick', targetId: player.id });
                      },
                      onCancel: () => setConfirming(null),
                    }
                  : undefined,
            }))}
          />
          <Button variant="primary" size="lg" icon="play" block disabled={!canStart} onClick={() => act({ type: 'lobby.start' })}>
            {t('lobby.start')}
          </Button>
          <p class="lg-muted" role="status">
            {startNote}
          </p>
          {canLock || canUnlock ? (
            <div class="lg-cluster">
              <Button variant="quiet" size="sm" icon="lock" onClick={() => act({ type: 'lobby.lock', locked: canLock })}>
                {canLock ? t('lobby.lock') : t('lobby.unlock')}
              </Button>
            </div>
          ) : null}
          {view.locked ? (
            <p class="lg-muted" role="status">
              {t('lobby.lockedNote')}
            </p>
          ) : null}
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
