import type { ComponentChildren } from 'preact';
import { Avatar } from '../ui/Avatar.tsx';
import { BoardColumn } from '../ui/Board.tsx';
import { Button, IconButton } from '../ui/Button.tsx';
import { Callout, Stamp } from '../ui/Callout.tsx';
import { ComparisonChart, DotPlot } from '../ui/Charts.tsx';
import { ChipChoice, Segmented, TextField } from '../ui/Field.tsx';
import { Footer } from '../ui/Footer.tsx';
import { Leaderboard } from '../ui/Leaderboard.tsx';
import { PhaseCard, ScriptPanel } from '../ui/Phase.tsx';
import { GoalOption, PokerCard } from '../ui/Poker.tsx';
import {
  ConfigListing,
  InfoHeld,
  ItemWorkspace,
  MergeTable,
  OrderList,
  ReadingsRules,
  SwitchingContext,
  VerdictBar,
} from '../ui/Puzzle.tsx';
import { RetroHelper, RetroNote } from '../ui/Retro.tsx';
import { StatusMarker, type ItemStatus } from '../ui/Status.tsx';
import { Timer } from '../ui/Timer.tsx';
import { WorkItemCard } from '../ui/WorkItemCard.tsx';
import { Icon, type IconName } from '../ui/Icon.tsx';
import {
  boardColumns,
  configA,
  configB,
  footerIdentity,
  itemLabels,
  kindLabels,
  monthRows,
  players,
  statusLabels,
} from './mock.ts';

interface SpecProps {
  id: string;
  title: string;
  note?: string;
  children?: ComponentChildren;
}

function Spec({ id, title, note, children }: SpecProps) {
  return (
    <section class="lg-kit-sec" id={id} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} class="lg-kit-sec__title">
        {title}
      </h2>
      {note ? <p class="lg-kit-sec__note">{note}</p> : null}
      <div class="lg-kit-sec__body">{children}</div>
    </section>
  );
}

function Cell({ label, children, wide }: { label: string; children?: ComponentChildren; wide?: boolean }) {
  return (
    <div class={wide ? 'lg-kit-cell lg-kit-cell--wide' : 'lg-kit-cell'}>
      <p class="lg-kit-cell__label">{label}</p>
      {children}
    </div>
  );
}

const swatchGroups: { title: string; tokens: string[] }[] = [
  { title: 'Surfaces', tokens: ['bg', 'surface', 'raised', 'sunken', 'line', 'line-strong'] },
  { title: 'Text', tokens: ['text', 'text-2', 'text-3'] },
  { title: 'Accent', tokens: ['accent', 'accent-strong', 'accent-text', 'accent-soft'] },
  { title: 'Status', tokens: ['todo', 'doing', 'blocked', 'review', 'done', 'accepted', 'rejected'] },
  { title: 'Players', tokens: ['p0', 'p1', 'p2', 'p3', 'p4', 'p5'] },
];

const typeScale = [
  ['hero', 'var(--lg-t-hero)', 'Two Pizzas'],
  ['2xl', 'var(--lg-t-2xl)', 'Review board'],
  ['xl', 'var(--lg-t-xl)', 'Sprint Planning'],
  ['lg', 'var(--lg-t-lg)', 'Work item #4 merge'],
  ['md', 'var(--lg-t-md)', 'The Daily Scrum is for the Developers'],
  ['base', 'var(--lg-t-base)', 'Body text stays calm where people read and think.'],
  ['sm', 'var(--lg-t-sm)', 'Secondary text, hints and table cells'],
  ['xs', 'var(--lg-t-xs)', 'Labels and counters'],
  ['2xs', 'var(--lg-t-2xs)', 'KIND · STATE · ID'],
] as const;

const statuses: ItemStatus[] = ['todo', 'waiting', 'doing', 'blocked', 'review', 'done', 'accepted', 'rejected'];

const timer = (time: string, fraction: number, hard: boolean, overtime = false) => (
  <Timer
    label="Time left"
    time={time}
    fraction={fraction}
    hard={hard}
    overtime={overtime}
    hardLabel="Hard timebox"
    softLabel="Soft timebox"
    overtimeLabel="Overtime"
    lastFifthLabel="Last fifth"
  />
);

export function Gallery() {
  const ex = players[0]!;
  const pl = (index: number) => players[index]!;
  return (
    <div class="lg-kit-gallery">
      <Spec id="tokens" title="Tokens" note="Every colour below is a custom property.">
        {swatchGroups.map((group) => (
          <Cell key={group.title} label={group.title} wide>
            <ul class="lg-kit-swatches">
              {group.tokens.map((token) => (
                <li key={token} class="lg-kit-swatch">
                  <span class="lg-kit-swatch__chip" style={{ background: `var(--lg-${token})` }} />
                  <code>--lg-{token}</code>
                </li>
              ))}
            </ul>
          </Cell>
        ))}
        <Cell label="Type scale (IBM Plex Sans, IBM Plex Mono for ids)" wide>
          <ul class="lg-kit-type">
            {typeScale.map(([name, size, sample]) => (
              <li key={name}>
                <code>{name}</code>
                <span style={{ fontSize: size }} class={name === 'hero' || name === '2xs' ? 'lg-mono' : undefined}>
                  {sample}
                </span>
              </li>
            ))}
          </ul>
        </Cell>
        <Cell label="Spacing">
          <ul class="lg-kit-space">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <li key={n}>
                <code>s-{n}</code>
                <span style={{ width: `var(--lg-s-${n})` }} />
              </li>
            ))}
          </ul>
        </Cell>
        <Cell label="Radii and elevation">
          <div class="lg-kit-boxes">
            {['xs', 'sm', 'md', 'lg'].map((r) => (
              <span key={r} class="lg-kit-box" style={{ borderRadius: `var(--lg-r-${r})` }}>
                {r}
              </span>
            ))}
            {[1, 2, 3].map((n) => (
              <span key={n} class="lg-kit-box lg-kit-box--lift" style={{ boxShadow: `var(--lg-shadow-${n})` }}>
                {n}
              </span>
            ))}
          </div>
        </Cell>
        <Cell label="Motion (reduced motion removes all of it)">
          <ul class="lg-kit-motion">
            <li>
              <code>fast</code> 120 ms: hover, press
            </li>
            <li>
              <code>base</code> 220 ms: cards lifting
            </li>
            <li>
              <code>slow</code> 560 ms: card turn, stamp
            </li>
          </ul>
        </Cell>
      </Spec>

      <Spec id="buttons" title="Buttons and icon buttons">
        {(['primary', 'secondary', 'quiet', 'danger', 'approve'] as const).map((variant) => (
          <Cell key={variant} label={variant}>
            <div class="lg-cluster">
              <Button variant={variant} size="sm">
                Small
              </Button>
              <Button variant={variant}>Medium</Button>
              <Button variant={variant} size="lg" icon="play">
                Large
              </Button>
              <Button variant={variant} disabled>
                Disabled
              </Button>
              <Button variant={variant} busy busyLabel="Working">
                Busy
              </Button>
            </div>
          </Cell>
        ))}
        <Cell label="icon buttons">
          <div class="lg-cluster">
            <IconButton icon="up" label="Move up" variant="secondary" />
            <IconButton icon="down" label="Move down" variant="secondary" disabled />
            <IconButton icon="x" label="Close" />
            <IconButton icon="copy" label="Copy" variant="primary" />
          </div>
        </Cell>
        <Cell label="icons">
          <div class="lg-cluster lg-kit-icons">
            {(['check', 'x', 'plus', 'lock', 'clock', 'bug', 'users', 'eye', 'stop', 'info', 'warning', 'bulb', 'switch', 'flag', 'play', 'vote', 'diff', 'link', 'trophy', 'offline', 'external'] as IconName[]).map((name) => (
              <span key={name} title={name}>
                <Icon name={name} />
              </span>
            ))}
          </div>
        </Cell>
      </Spec>

      <Spec id="fields" title="Fields and toggles">
        <Cell label="text field, plain / counter / error">
          <div class="lg-fields">
            <TextField id="g-plain" label="Name (optional)" value="" placeholder="Player 3" maxLength={20} hint="At most 20 characters." />
            <TextField id="g-near" label="Note" value="Ask for review before starting a new item and then keep going" maxLength={70} />
            <TextField id="g-error" label="Room code" value="BK" mono uppercase maxLength={5} error="A room code has five letters." />
          </div>
        </Cell>
        <Cell label="textarea with counter">
          <TextField id="g-area" label="What went well?" value="Pairing worked." multiline rows={3} maxLength={140} />
        </Cell>
        <Cell label="toggle: language, framework">
          <div class="lg-cluster">
            <Segmented
              legend="Language"
              name="g-lang"
              compact
              value="ro"
              options={[
                { value: 'ro', label: 'RO' },
                { value: 'en', label: 'EN' },
              ]}
            />
            <Segmented
              legend="Framework"
              name="g-fw"
              value="kanban"
              options={[
                { value: 'scrum', label: 'Scrum' },
                { value: 'kanban', label: 'Kanban' },
              ]}
            />
          </div>
        </Cell>
        <Cell label="chip choice">
          <ChipChoice legend="Action" name="g-chips" value="restart" options={[{ value: 'restart', label: 'restart' }, { value: 'scale', label: 'scale up' }, { value: 'page', label: 'page on-call' }]} />
        </Cell>
      </Spec>

      <Spec id="people" title="Status markers and avatars" note="Every status has its own shape and a label, so colour is never the only signal.">
        <Cell label="status markers" wide>
          <div class="lg-cluster lg-kit-statuses">
            {statuses.map((status) => (
              <StatusMarker key={status} status={status} label={statusLabels[status]} />
            ))}
          </div>
        </Cell>
        <Cell label="icon only (label for screen readers)">
          <div class="lg-cluster">
            {statuses.map((status) => (
              <StatusMarker key={status} status={status} label={statusLabels[status]} iconOnly />
            ))}
          </div>
        </Cell>
        <Cell label="avatars: number, initials, facilitator, you, disconnected, empty" wide>
          <div class="lg-cluster">
            <Avatar name="Player 2" number={2} colour={1} size="lg" showName />
            <Avatar name="Player 3" initials="P3" colour={2} />
            <Avatar {...ex} size="lg" showName />
            <Avatar {...pl(4)} showName />
            <Avatar name="Open seat" empty showName />
            <Avatar name="Player 6" number={6} colour={5} size="sm" />
            <Avatar name="Player 5" number={5} colour={4} showName awayLabel="away until 21:45" />
          </div>
        </Cell>
      </Spec>

      <Spec id="items" title="Work item cards" note="All eight states. A card with an open button is clickable as a whole and keyboard focusable through its title.">
        <div class="lg-kit-cards">
          <WorkItemCard id="#1" kind="review" kindLabel={kindLabels.review} subject="payments-api" value={8} estimate={8} status="todo" statusLabel={statusLabels.todo} labels={itemLabels} onOpen={() => {}} />
          <WorkItemCard id="#2" kind="merge" kindLabel={kindLabels.merge} subject="invoice-export" value={5} status="waiting" statusLabel={statusLabels.waiting} workers={[pl(1)]} pairSlotLabel="Needs a second worker" labels={itemLabels} />
          <WorkItemCard id="#3" kind="order" kindLabel={kindLabels.order} subject="auth-gateway" value={4} estimate={3} status="doing" statusLabel={statusLabels.doing} workers={[pl(1), pl(2)]} labels={itemLabels} age="2:10" />
          <WorkItemCard id="#4" kind="incident" kindLabel={kindLabels.incident} subject="search-index" value={6} estimate={5} status="blocked" statusLabel={statusLabels.blocked} note="Blocked: needs info from the team" workers={[pl(3)]} labels={itemLabels} />
          <WorkItemCard id="#5" kind="order" kindLabel={kindLabels.order} subject="checkout-svc" value={3} estimate={2} status="review" statusLabel={statusLabels.review} workers={[pl(1)]} reviewer={pl(5)} labels={itemLabels} />
          <WorkItemCard id="#6" kind="review" kindLabel={kindLabels.review} subject="orders-db" value={2} estimate={1} status="done" statusLabel={statusLabels.done} workers={[pl(3)]} reviewer={pl(1)} labels={itemLabels} stamp={<Stamp size="sm" />} />
          <WorkItemCard id="#7" kind="review" kindLabel={kindLabels.review} subject="notify-worker" value={5} estimate={5} status="accepted" statusLabel={statusLabels.accepted} workers={[pl(2), pl(3)]} reviewer={pl(5)} labels={itemLabels} stamp={<Stamp size="sm" caption="accepted" />} />
          <WorkItemCard id="#8" kind="merge" kindLabel={kindLabels.merge} subject="billing-sync" value={6} estimate={3} status="rejected" statusLabel={statusLabels.rejected} note="Escaped defect: LGTM on a wrong answer, no value" workers={[pl(1), pl(4)]} reviewer={pl(2)} labels={itemLabels} />
        </div>
      </Spec>

      <Spec id="columns" title="Board columns, WIP limit" note="The count and the limit are text, the exceeded state also changes shape (warning icon) and shows a line of text.">
        <div class="lg-kit-cols">
          <BoardColumn id="g-c1" title="In Progress" count={2} tone="doing" wip={3}>
            <WorkItemCard id="#3" kind="order" kindLabel={kindLabels.order} subject="auth-gateway" value={4} estimate={3} status="doing" statusLabel={statusLabels.doing} workers={[pl(1)]} labels={itemLabels} />
            <WorkItemCard id="#9" kind="incident" kindLabel={kindLabels.incident} subject="queue-worker" value={3} status="doing" statusLabel={statusLabels.doing} workers={[pl(2)]} labels={itemLabels} />
          </BoardColumn>
          <BoardColumn id="g-c2" title="In Progress" count={4} tone="doing" wip={3} wipLabel="WIP limit" exceededLabel="Over the limit: finish something before starting more">
            <WorkItemCard id="#3" kind="order" kindLabel={kindLabels.order} subject="auth-gateway" value={4} status="doing" statusLabel={statusLabels.doing} workers={[pl(1)]} labels={itemLabels} />
          </BoardColumn>
          <BoardColumn id="g-c3" title="Ready" count={0} tone="todo" emptyLabel="Nothing here yet" />
        </div>
      </Spec>

      <Spec id="timers" title="Timers" note="A hard timebox ends on time (lock icon, thick border). Soft ones may be overrun (clock icon, dashed track) and the overrun is shown.">
        <div class="lg-kit-timers">
          <Cell label="hard, normal">{timer('02:41', 0.67, true)}</Cell>
          <Cell label="hard, last fifth">{timer('00:36', 0.15, true)}</Cell>
          <Cell label="soft, normal">{timer('03:12', 0.8, false)}</Cell>
          <Cell label="soft, last fifth">{timer('00:48', 0.19, false)}</Cell>
          <Cell label="soft, overtime">{timer('00:42', 0, false, true)}</Cell>
        </div>
      </Spec>

      <Spec id="phase" title="Phase card and facilitator script">
        <Cell label="English" wide>
          <PhaseCard
            eyebrow="Sprint 1 · event 2 of 5"
            title="Sprint Planning"
            purpose="Sprint Planning initiates the Sprint by laying out the work to be performed."
            purposeLabel="Purpose"
            timebox="6 min"
            timeboxLabel="Timebox"
            endsLabel="Soft: it may run over, and the overrun is recorded."
            rolesLabel="Who does what"
            roles={[
              { who: 'Product Owner (the game)', what: 'Offers two Sprint Goals and the ordered backlog.' },
              { who: 'Scrum Master', what: 'Keeps the event inside its timebox and begins it.' },
              { who: 'Developers', what: 'Pick the goal, estimate and commit to items.' },
            ]}
            scaleNote="The minutes in this game are a scale model of a one-month Sprint, where Planning takes at most eight hours."
            beginLabel="Begin Sprint Planning"
            canBegin
          />
        </Cell>
        <Cell label="waiting player" wide>
          <PhaseCard
            eyebrow="Sprint 1 · event 3 of 5"
            title="Daily Scrum"
            purpose="To inspect progress toward the Sprint Goal and adapt the Sprint Backlog as necessary."
            purposeLabel="Purpose"
            timebox="2 min"
            timeboxLabel="Timebox"
            endsLabel="Soft."
            rolesLabel="Who does what"
            roles={[{ who: 'Developers', what: 'Walk the board from the right, any of you may end it.' }]}
            waitingLabel="Waiting for the Scrum Master to begin."
          />
        </Cell>
        <Cell label="script panel, step 2 of 4 current" wide>
          <ScriptPanel
            title="Facilitator script"
            badge="Scrum Master"
            current={1}
            stepLabel="Step"
            doneLabel="done"
            steps={[
              { text: 'Say the purpose of the event aloud.' },
              { text: 'Start the clock and ask who has a blocked item.' },
              { text: 'Let the Developers re-plan, do not run it for them.' },
              { text: 'End the event when the Developers say so or at the timebox.' },
            ]}
            footer={
              <Button variant="secondary" size="sm" icon="check">
                Step done
              </Button>
            }
          />
        </Cell>
      </Spec>

      <Spec id="poker" title="Planning poker" note="Click the cards in the reveal row to turn them. In the game a face-down card carries no value at all; the demo row holds values only to show the turn.">
        <Cell label="reveal row (click to turn)" wide>
          <div class="lg-poker-table" data-kit-flip>
            <PokerCard value={5} faceDown owner="Player 1" ownerNumber={1} label="Player 1" />
            <PokerCard value={8} faceDown owner="Player 2" ownerNumber={2} label="Player 2" />
            <PokerCard value={5} faceDown owner="Player 3" ownerNumber={3} label="Player 3" />
            <PokerCard value={3} owner="Player 4" ownerNumber={4} label="Player 4: 3" />
          </div>
        </Cell>
        <Cell label="hand: face up, chosen" wide>
          <div class="lg-poker-hand" role="group" aria-label="Your cards">
            {[1, 2, 3, 5, 8, 13].map((value) => (
              <PokerCard key={value} value={value} selectable chosen={value === 3} label={`Vote ${value}`} />
            ))}
          </div>
        </Cell>
        <Cell label="Sprint Goal options" wide>
          <div class="lg-stack">
            <GoalOption name="g-goal" value="a" title="Finish every item of the Payments theme" description="One theme, every item done." bonus="+5 value" checked />
            <GoalOption name="g-goal" value="b" title="Finish every item of the Search theme" description="The other offer." bonus="+5 value" checked={false} />
          </div>
        </Cell>
      </Spec>

      <Spec id="retro" title="Retrospective note, helper, observations, stamp">
        <Cell label="notes: voted, mine, plain, private" wide>
          <ul class="lg-kit-notes">
            <RetroNote text="Pairing on the big items worked" column="well" votes={3} voted hiddenLabel="Private" voteLabel="Vote" votesLabel="votes" />
            <RetroNote text="Nobody knew item #5 needed info from someone else" column="slow" votes={2} mine hiddenLabel="Private" voteLabel="Vote" votesLabel="votes" />
            <RetroNote text="Limit WIP to two items" column="try" votes={0} hiddenLabel="Private" voteLabel="Vote" votesLabel="votes" voteDisabled />
            <RetroNote text="" column="slow" votes={0} hidden hiddenLabel="Private until revealed" voteLabel="Vote" votesLabel="votes" />
          </ul>
        </Cell>
        <Cell label="helper, closed and open" wide>
          <div class="lg-kit-two">
            <RetroHelper buttonLabel="I don't know what to write" title="" questions={[]} proposalsLabel="" proposals={[]} useLabel="Use" open={false} />
            <RetroHelper
              buttonLabel="I don't know what to write"
              title="Two questions about your Sprint"
              questions={['What did four open items do to your reviews?', 'Which item waited longest?']}
              proposalsLabel="Proposals, edit them freely"
              proposals={['Finish a review before taking a new item']}
              useLabel="Use"
              open
            />
          </div>
        </Cell>
        <Cell label="observation callouts" wide>
          <div class="lg-kit-two">
            <Callout tone="good" tag="inspect.goalMet" title="The Sprint Goal was met">
              Both Payments items were accepted.
            </Callout>
            <Callout tone="watch" tag="work.wipHigh" title="Four items were open at once">
              Each switch cost 8 seconds.
            </Callout>
          </div>
        </Cell>
        <Cell label="LGTM stamp: sm, md, lg, with caption">
          <div class="lg-cluster lg-kit-stamps">
            <Stamp size="sm" />
            <Stamp />
            <Stamp size="lg" animate />
            <Stamp size="lg" caption="reviewed by 2" />
          </div>
        </Cell>
      </Spec>

      <Spec id="puzzle" title="Puzzle workspace frames">
        <Cell label="config listing, markable lines" wide>
          <div class="lg-kit-two">
            <ConfigListing file="payments-api / copy A" lines={configA.map((l, i) => ({ ...l, marked: i === 1 }))} markLabel={(k) => `Mark ${k}`} markedLabel="different" />
            <ConfigListing file="payments-api / copy B (read only)" lines={configB.map((l, i) => ({ ...l, marked: i === 1 || i === 4 }))} markLabel={(k) => `Mark ${k}`} markedLabel="different" readOnly />
          </div>
        </Cell>
        <Cell label="ordering list with move buttons">
          <OrderList
            legend="Start order, first to start at the top"
            items={[
              { id: 'db', label: 'database' },
              { id: 'cache', label: 'cache' },
              { id: 'api', label: 'payments-api' },
              { id: 'web', label: 'web-frontend' },
            ]}
            moveUpLabel={(l) => `Move ${l} up`}
            moveDownLabel={(l) => `Move ${l} down`}
          />
        </Cell>
        <Cell label="readings, numbered rules, choice of action" wide>
          <ReadingsRules
            title="Readings"
            readings={[
              { key: 'cpu', value: '92%' },
              { key: 'queue.depth', value: '58' },
              { key: 'errors/min', value: '14' },
            ]}
            rulesTitle="Rules, first fit wins"
            rules={[
              { n: 1, when: 'cpu > 95 → page on-call' },
              { n: 2, when: 'queue.depth > 40 → scale up' },
              { n: 3, when: 'errors/min > 10 → restart' },
            ]}
            actionLegend="Which action fires first?"
            actions={['page on-call', 'scale up', 'restart', 'do nothing']}
            chosen="scale up"
            name="g-act"
          />
        </Cell>
        <Cell label="merge table" wide>
          <MergeTable
            caption="Merge"
            columns={{ line: 'Line', base: 'Base', ours: 'Side A', theirs: 'Side B', result: 'Result' }}
            resultLabel={(n) => `Result for line ${n}`}
            rows={[
              { n: 1, base: 'timeout=30', ours: 'timeout=45', value: 'timeout=45' },
              { n: 2, base: 'retries=3', theirs: 'retries=5', value: '' },
              { n: 3, base: 'mode=safe', ours: 'mode=fast', theirs: 'mode=strict', value: '' },
              { n: 4, base: 'region=eu', value: 'region=eu' },
            ]}
          />
        </Cell>
        <Cell label="switching context" wide>
          <SwitchingContext label="Switching context…" detail="Nothing of the item is shown while you switch. Fewer open items mean fewer switches." remaining="5 s left" fraction={0.4} />
        </Cell>
        <Cell label="verdict bar, in a workspace frame" wide>
          <ItemWorkspace
            id="#5"
            subject="checkout-svc"
            kindLabel={kindLabels.order}
            status="review"
            statusLabel={statusLabels.review}
            closeLabel="Close item"
            roleNote="You are the reviewer: you did not work on this item."
          >
            <OrderList
              legend="Submitted order"
              items={[
                { id: 'db', label: 'database' },
                { id: 'api', label: 'checkout-svc' },
              ]}
              moveUpLabel={(l) => `Move ${l} up`}
              moveDownLabel={(l) => `Move ${l} down`}
            />
            <VerdictBar prompt="Is this answer right?" note="The game does not say. Your LGTM is a promise." lgtmLabel="LGTM" changesLabel="Request changes" />
          </ItemWorkspace>
        </Cell>
        <Cell label="info you hold">
          <InfoHeld
            title="Info you hold"
            hint="Only you can see this."
            itemLabel="For item"
            items={[
              { itemId: '#5', subject: 'search-index', text: <p>Rule 3 applies only when queue depth is above 40.</p> },
              { itemId: '#8', subject: 'billing-sync', text: <p>On a conflict, the newer change wins.</p> },
            ]}
          />
        </Cell>
      </Spec>

      <Spec id="charts" title="Charts and leaderboard">
        <Cell label="two iterations compared">
          <ComparisonChart
            title="Sprint 1 and Sprint 2"
            firstLabel="Sprint 1"
            secondLabel="Sprint 2"
            summary="Throughput rose from 4 to 6 items, cycle time fell from 82 to 51 seconds, highest WIP fell from 5 to 2."
            groups={[
              { label: 'Throughput (items)', first: 4, second: 6 },
              { label: 'Average cycle time', first: 82, second: 51, unit: ' s' },
              { label: 'Highest WIP', first: 5, second: 2 },
            ]}
          />
        </Cell>
        <Cell label="cycle times, dot plot">
          <DotPlot
            title="Cycle time per finished item"
            max={160}
            unit="s"
            medianLabel="median"
            summary="Round 1 median 70 seconds, round 2 median 45 seconds."
            rows={[
              { label: 'Round 1', values: [32, 48, 55, 70, 74, 92, 120, 148], median: 72 },
              { label: 'Round 2', values: [28, 31, 38, 44, 46, 52, 58, 61, 66], median: 46 },
            ]}
          />
        </Cell>
        <Cell label="leaderboard" wide>
          <Leaderboard title="Scrum, this month" columns={boardColumns} rows={monthRows.map((r, i) => ({ ...r, highlight: i === 1 }))} emptyLabel="No results yet." highlightLabel="your team" />
        </Cell>
      </Spec>

      <Spec id="ro" title="Romanian sample: long words and diacritics" note="ă â î ș ț in text, in a button, in a field, in a card and in a table.">
        <Cell label="paragraph, button, field" wide>
          <div class="lg-kit-two">
            <div class="lg-stack">
              <h3 class="lg-section-title">Responsabilitățile echipei de dezvoltare</h3>
              <p>
                Planificarea Sprintului stabilește munca ce urmează a fi realizată. Dezvoltatorii estimează împreună, fără a se grăbi către o cifră, iar răspunderea pentru Sprint Goal aparține întregii echipe. Interdependențele dintre elemente se discută înainte de angajament.
              </p>
              <div class="lg-cluster">
                <Button variant="primary">Începeți planificarea</Button>
                <Button variant="secondary">Cereți o altă denumire</Button>
                <Button variant="danger" icon="x">Cereți modificări</Button>
              </div>
            </div>
            <div class="lg-fields">
              <TextField id="g-ro" label="Observație (maximum 140 de caractere)" value="Șapte elemente deschise odată, schimbarea contextului ne-a încetinit" maxLength={140} />
              <WorkItemCard
                id="#12"
                kind="incident"
                kindLabel="Incident"
                subject="serviciu-confirmare-plăți"
                value={6}
                estimate={5}
                status="blocked"
                statusLabel="Blocat"
                note="Blocat: așteaptă informații de la ceilalți membri ai echipei"
                labels={{ value: 'Valoare', estimate: 'Estimare', workers: 'Lucrează', reviewer: 'Verificator', noEstimate: 'fără' }}
              />
            </div>
          </div>
        </Cell>
      </Spec>

      <Spec id="footer" title="Footer">
        <Cell label="privacy in a disclosure, three outbound links" wide>
          <div class="lg-kit-footer">
            <Footer {...footerIdentity} />
          </div>
        </Cell>
      </Spec>
    </div>
  );
}
