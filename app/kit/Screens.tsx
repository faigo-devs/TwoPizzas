import type { ComponentChildren } from 'preact';
import { ActionBar } from '../ui/ActionBar.tsx';
import { Button } from '../ui/Button.tsx';
import { ConfirmAction } from '../ui/Confirm.tsx';
import { createT } from '../i18n/index.ts';
import { Callout, Stamp } from '../ui/Callout.tsx';
import { BoardColumn } from '../ui/Board.tsx';
import { Footer } from '../ui/Footer.tsx';
import { Hero, Panel } from '../ui/Hero.tsx';
import { TourInvite } from '../ui/TourInvite.tsx';
import { Icon } from '../ui/Icon.tsx';
import { Leaderboard } from '../ui/Leaderboard.tsx';
import { PlayerList, RoomCode } from '../ui/Lobby.tsx';
import { GoalOption, PokerCard } from '../ui/Poker.tsx';
import { ConfigListing, InfoHeld, ItemWorkspace, VerdictBar } from '../ui/Puzzle.tsx';
import { PhaseCard, ScriptPanel } from '../ui/Phase.tsx';
import { RetroHelper, RetroNote, type RetroNoteProps } from '../ui/Retro.tsx';
import { Segmented, TextField } from '../ui/Field.tsx';
import { Timer } from '../ui/Timer.tsx';
import { TopBar } from '../ui/TopBar.tsx';
import { WorkItemCard } from '../ui/WorkItemCard.tsx';
import {
  allTimeRows,
  boardColumns,
  configA,
  configB,
  footerIdentity,
  itemLabels,
  kindLabels,
  monthRows,
  players,
  roleLabels,
  statusLabels,
} from './mock.ts';

const you = players[0]!;
const p = (index: number) => players[index]!;

function bar(scope: string, roomCode?: string, middle?: ComponentChildren) {
  return (
    <TopBar
      scope={scope}
      home="Two Pizzas"
      language="en"
      languageLegend="Language"
      roomCode={roomCode}
      roomLabel="Room"
      middle={middle}
    />
  );
}

const timer = (time: string, fraction: number, hard: boolean, overtime = false) => (
  <Timer
    label="Time left in this phase"
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

export function StartScreen() {
  return (
    <div class="lg-screen">
      {bar('s1')}
      <div class="lg-page lg-main">
        <div class="lg-start">
          <Hero
            scope="s1"
            badge="Play with your team"
            tagline="Learn Scrum or Kanban by doing the work: two short iterations with your team, each on your own device."
            facts="3 to 6 players · 45 to 60 minutes"
            note="3 to 6 players, each on their own device."
            tourLink="Alone? Take the 10-minute guided tour"
            frameworkLegend="Framework"
            frameworks={[
              { value: 'scrum', label: 'Scrum' },
              { value: 'kanban', label: 'Kanban' },
            ]}
            framework="scrum"
            createLabel="Create a room"
            joinTitle="Join a room"
            codeLabel="Room code"
            codeHint="Five letters, from the player who created the room."
            code="BKNRT"
            joinLabel="Join"
          />
          <TourInvite
            badge="Solo tour"
            title="Not enough people yet? Take the guided tour"
            text="Work on a real board with scripted teammates."
            facts="About 10 minutes · alone · no account"
            routeLabel="The stops of the tour"
            stops={['The idea', 'The board', 'Take an item', 'Solve an item', 'Two people, one item', 'Review with LGTM']}
            startLabel="Start the guided tour"
          />
        </div>
        <div class="lg-start-lower">
          <Leaderboard
            title="Scrum, this month"
            columns={boardColumns}
            rows={monthRows}
            emptyLabel="No results yet."
          />
          <Leaderboard title="Scrum, all time" columns={boardColumns} rows={allTimeRows} emptyLabel="No results yet." />
        </div>
      </div>
      <Footer {...footerIdentity} />
    </div>
  );
}

export function LobbyScreen() {
  return (
    <div class="lg-screen">
      {bar('s2', 'BKNRT')}
      <div class="lg-page lg-main">
        <div class="lg-play-head">
          <div class="lg-play-head__title">
            <p class="lg-eyebrow">Scrum</p>
            <h2 tabIndex={-1}>Lobby</h2>
          </div>
          <span class="lg-muted">5 players, 1 seat left. You can start with 3 to 6 players.</span>
        </div>
        <div class="lg-lobby">
          <Panel title="Room" icon="info">
            <RoomCode code="BKNRT" label="Share this code with your team" copyLabel="Copy code" />
            <div class="lg-fields">
              <Segmented
                legend="Framework"
                name="s2-framework"
                value="scrum"
                options={[
                  { value: 'scrum', label: 'Scrum' },
                  { value: 'kanban', label: 'Kanban' },
                ]}
              />
              <TextField id="s2-team" label="Team name" value="brave-otter" mono hint="Generated for you. Ask for another one if you like." />
              <div class="lg-cluster">
                <Button variant="secondary" size="sm" icon="switch">
                  Another team name
                </Button>
                <Button variant="quiet" size="sm" icon="flag">
                  Volunteer as Scrum Master
                </Button>
              </div>
            </div>
          </Panel>
          <Panel title="Players (5 of 6)" icon="users">
            <PlayerList
              title="Players"
              emptySeats={1}
              emptyLabel="Open seat"
              rows={[
                { player: you, status: 'Host' },
                { player: p(1), status: 'Ready' },
                { player: p(2), status: 'Ready' },
                { player: p(3), status: 'Joining' },
                { player: p(4), status: 'Reconnecting' },
              ]}
            />
            <Button variant="primary" size="lg" icon="play" block>
              Start the game
            </Button>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export function PlanningScreen() {
  const nextScript = (
    <Button variant="secondary" size="sm" icon="check">
      Step done
    </Button>
  );
  return (
    <div class="lg-screen">
      {bar('s3', 'BKNRT', timer('03:42', 0.62, false))}
      <div class="lg-page lg-main">
        <div class="lg-play-head">
          <div class="lg-play-head__title">
            <p class="lg-eyebrow">Sprint 1 · Sprint Planning</p>
            <h2 tabIndex={-1}>Estimate the next item</h2>
          </div>
          <span class="lg-muted">Step 2 of 3 · estimation</span>
        </div>
        <div class="lg-plan">
          <div class="lg-stack lg-stack--lg">
            <Panel title="Sprint Goal" icon="flag">
              <GoalOption name="s3-goal" value="a" title="Finish every item of the Payments theme" description="The Product Owner's offer, one theme, all items done." bonus="+5 value" checked />
              <GoalOption name="s3-goal" value="b" title="Finish every item of the Search theme" description="The Product Owner's other offer." bonus="+5 value" checked={false} />
            </Panel>
            <Panel title="Planning poker" icon="vote">
              <div class="lg-plan__current">
                <WorkItemCard
                  id="#4"
                  kind="merge"
                  kindLabel={kindLabels.merge}
                  subject="invoice-export"
                  value={5}
                  status="todo"
                  statusLabel={statusLabels.todo}
                  labels={itemLabels}
                />
                <Button variant="secondary" size="sm" icon="eye">
                  Reveal
                </Button>
              </div>
              <div class="lg-poker-table" aria-label="Cards on the table">
                <PokerCard value={5} owner="Player 1" ownerNumber={1} label="Player 1: 5" revealing />
                <PokerCard value={8} owner="Player 2" ownerNumber={2} label="Player 2: 8" revealing />
                <PokerCard value={5} owner="Player 3" ownerNumber={3} label="Player 3: 5" revealing />
                <PokerCard faceDown owner="Player 4" ownerNumber={4} label="Player 4: voted, face down" />
                <PokerCard faceDown owner="Player 6" ownerNumber={6} label="Player 6: voted, face down" />
              </div>
              <div class="lg-poker-hand" role="group" aria-label="Your cards">
                {[1, 2, 3, 5, 8, 13].map((value) => (
                  <PokerCard key={value} value={value} selectable chosen={value === 5} label={`Vote ${value}`} />
                ))}
              </div>
            </Panel>
          </div>
          <div class="lg-stack">
            <ScriptPanel
              title="Facilitator script"
              badge="Scrum Master"
              current={1}
              stepLabel="Step"
              doneLabel="done"
              steps={[
                { text: 'Read the Sprint Goal aloud and ask whether it is clear to everyone.' },
                { text: 'Ask each player to vote, then reveal all cards together.' },
                { text: 'If the cards differ a lot, let the highest and the lowest explain, then vote once more.' },
                { text: 'Record the estimate and move to the next item.' },
              ]}
              footer={nextScript}
            />
            <div class="lg-sum" role="status">
              <span>Sum of estimates</span>
              <strong>13</strong>
            </div>
            <Callout tone="watch" tag="plan.overtime" title="Estimation is taking longer than planned">
              Estimates are a conversation, not a vote to win. Stop when the team has enough to commit.
            </Callout>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BoardScreen() {
  const stamp = <Stamp size="sm" animate />;
  return (
    <div class="lg-screen">
      {bar('s4', 'BKNRT', timer('01:12', 0.18, true))}
      <div class="lg-page lg-main">
        <div class="lg-play-head">
          <div class="lg-play-head__title">
            <p class="lg-eyebrow">Sprint 1 · Sprint</p>
            <h2 tabIndex={-1}>Board</h2>
          </div>
          <span class="lg-muted">You have 1 item open: #2 checkout-svc</span>
        </div>
        <div class="lg-board">
          <BoardColumn id="s4-c1" title="Sprint Backlog" count={2} tone="todo">
            <WorkItemCard id="#6" kind="order" kindLabel={kindLabels.order} subject="auth-gateway" value={4} estimate={3} status="todo" statusLabel={statusLabels.todo} labels={itemLabels} onOpen={() => {}} />
            <WorkItemCard
              id="#7"
              kind="merge"
              kindLabel={kindLabels.merge}
              subject="invoice-export"
              value={5}
              estimate={5}
              status="waiting"
              statusLabel={statusLabels.waiting}
              workers={[p(1)]}
              pairSlotLabel="Needs a second worker"
              labels={itemLabels}
            />
          </BoardColumn>
          <BoardColumn id="s4-c2" title="In Progress" count={2} tone="doing">
            <WorkItemCard
              id="#3"
              kind="review"
              kindLabel={kindLabels.review}
              subject="payments-api"
              value={8}
              estimate={8}
              status="doing"
              statusLabel={statusLabels.doing}
              workers={[you, p(2)]}
              labels={itemLabels}
            />
            <WorkItemCard
              id="#5"
              kind="incident"
              kindLabel={kindLabels.incident}
              subject="search-index"
              value={6}
              estimate={5}
              status="blocked"
              statusLabel={statusLabels.blocked}
              note="Needs info from the team"
              workers={[p(3)]}
              labels={itemLabels}
            />
          </BoardColumn>
          <BoardColumn id="s4-c3" title="Review" count={1} tone="review">
            <WorkItemCard
              id="#2"
              kind="review"
              kindLabel={kindLabels.review}
              subject="checkout-svc"
              value={3}
              estimate={2}
              status="review"
              statusLabel={statusLabels.review}
              workers={[p(1)]}
              reviewer={you}
              labels={itemLabels}
              selected
              onOpen={() => {}}
            />
          </BoardColumn>
          <BoardColumn id="s4-c4" title="Done" count={1} tone="done">
            <WorkItemCard
              id="#1"
              kind="review"
              kindLabel={kindLabels.review}
              subject="orders-db"
              value={2}
              estimate={1}
              status="done"
              statusLabel={statusLabels.done}
              workers={[p(3)]}
              reviewer={p(1)}
              labels={itemLabels}
              stamp={stamp}
            />
          </BoardColumn>
        </div>
        <div class="lg-play-lower">
          <ItemWorkspace
            id="#2"
            subject="checkout-svc"
            kindLabel={kindLabels.review}
            status="review"
            statusLabel={statusLabels.review}
            closeLabel="Close item"
            roleNote="You are the reviewer: you did not work on this item. Both copies and the submitted answer are shown."
            footer={
              <VerdictBar
                prompt="Is the submitted answer right?"
                note="The game does not say. Your LGTM is a promise."
                lgtmLabel="LGTM"
                changesLabel="Request changes"
              />
            }
          >
            <div class="lg-two">
              <ConfigListing
                file="checkout-svc / copy A"
                lines={configA.map((line, index) => ({ ...line, marked: index === 3 }))}
                markLabel={(key) => `Mark ${key}`}
                markedLabel="different"
                readOnly
              />
              <ConfigListing
                file="checkout-svc / copy B"
                lines={configB.map((line, index) => ({ ...line, marked: index === 1 }))}
                markLabel={(key) => `Mark ${key}`}
                markedLabel="different"
                readOnly
              />
            </div>
          </ItemWorkspace>
          <div class="lg-stack">
            <InfoHeld
              title="Info you hold"
              hint="Only you can see this. Pass it to the team when they need it."
              itemLabel="For item"
              items={[
                {
                  itemId: '#5',
                  subject: 'search-index',
                  text: (
                    <p>
                      Rule 3 only applies when <code>queue.depth &gt; 40</code>.
                    </p>
                  ),
                },
              ]}
            />
            <ScriptPanel
              title="Facilitator script"
              badge="Scrum Master"
              current={0}
              stepLabel="Step"
              doneLabel="done"
              steps={[
                { text: 'Keep the Sprint inside its timebox.' },
                { text: 'Ask what is waiting for review.' },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function RetroScreen() {
  const note = (text: string, column: 'well' | 'slow' | 'try', votes: number, extra: Partial<RetroNoteProps> = {}) => (
    <RetroNote
      key={text}
      text={text}
      column={column}
      votes={votes}
      hiddenLabel="Private until revealed"
      voteLabel="Vote"
      votesLabel="votes"
      {...extra}
    />
  );
  return (
    <div class="lg-screen">
      {bar('s5', 'BKNRT', timer('02:05', 0.42, false))}
      <div class="lg-page lg-main">
        <div class="lg-play-head">
          <div class="lg-play-head__title">
            <p class="lg-eyebrow">Sprint 1 · Sprint Retrospective</p>
            <h2 tabIndex={-1}>Retrospective</h2>
          </div>
          <span class="lg-muted">Step 2 of 3 · vote · 1 of 2 votes left</span>
        </div>
        <div class="lg-retro">
          <section class="lg-retro__col lg-retro__col--well" aria-labelledby="s5-well">
            <h3 id="s5-well" class="lg-retro__head">
              <Icon name="check" size={18} />
              <span>Went well</span>
            </h3>
            <ul class="lg-retro__notes">
              {note('Pairing on the big items worked', 'well', 3, { voted: true })}
              {note('Reviews were quick once we asked', 'well', 1)}
            </ul>
          </section>
          <section class="lg-retro__col lg-retro__col--slow" aria-labelledby="s5-slow">
            <h3 id="s5-slow" class="lg-retro__head">
              <Icon name="stop" size={18} />
              <span>Slowed us down</span>
            </h3>
            <ul class="lg-retro__notes">
              {note('Four items open at once, we kept switching', 'slow', 4, { voted: true })}
              {note('Nobody knew #5 needed information from someone else', 'slow', 2, { mine: true })}
              {note('Planning ran over', 'slow', 0, { voteDisabled: true })}
            </ul>
          </section>
          <section class="lg-retro__col lg-retro__col--try" aria-labelledby="s5-try">
            <h3 id="s5-try" class="lg-retro__head">
              <Icon name="bulb" size={18} />
              <span>We will try</span>
            </h3>
            <ul class="lg-retro__notes">
              {note('Limit work in progress to two items', 'try', 5, { voteDisabled: true })}
              {note('', 'try', 0, { hidden: true })}
            </ul>
          </section>
        </div>
        <div class="lg-retro__below">
          <Panel title="Your note" icon="info">
            <TextField id="s5-note" label="What would you add?" value="Ask for review before starting a new item" maxLength={140} multiline rows={2} />
            <RetroHelper
              buttonLabel="I don't know what to write"
              title="Two questions about your Sprint"
              questions={['Four items were In Progress at the same time. What did that do to your reviews?', 'Which item waited longest, and what was it waiting for?']}
              proposalsLabel="Proposals, edit them freely"
              proposals={['Finish a review before taking a new item', 'Ask for help as soon as an item is blocked']}
              useLabel="Use"
              open
            />
          </Panel>
          <div class="lg-stack">
            <Callout tone="watch" tag="work.wipHigh" title="Up to four items were open at once">
              Each switch cost 8 seconds. Fewer open items finish sooner.
            </Callout>
            <Callout tone="good" tag="inspect.goalMet" title="The Sprint Goal was met">
              Both Payments items were accepted by the Product Owner.
            </Callout>
            <TextField id="s5-action" label="One action for the next Sprint" value="At most two items In Progress" maxLength={140} hint="A working agreement the game can track." />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FinishScreen({ lang }: { lang: 'en' | 'ro' }) {
  const t = createT(lang);
  const closed = (
    <ConfirmAction
      variant="secondary"
      size="lg"
      icon="play"
      label={t('work.endEarly.kanban')}
      prompt={t('work.endEarly.confirm.kanban.2')}
      confirmLabel={t('work.endEarly.yes')}
      cancelLabel={t('common.cancel')}
      hint={t('work.endEarly.hint.kanban')}
      onConfirm={() => {}}
    />
  );
  const asking = (
    <ConfirmAction
      variant="secondary"
      size="lg"
      icon="play"
      label={t('work.endEarly.kanban')}
      prompt={t('work.endEarly.confirm.kanban.2')}
      confirmLabel={t('work.endEarly.yes')}
      cancelLabel={t('common.cancel')}
      hint={t('work.endEarly.hint.kanban')}
      initialAsking
      onConfirm={() => {}}
    />
  );
  return (
    <div class="lg-screen">
      <div class="lg-page lg-main">
        <section class="lg-next" aria-labelledby={`finish-${lang}`}>
          <h3 id={`finish-${lang}`} class="lg-next__title">
            <Icon name="flag" size={18} />
            <span>{t('work.next.title')}</span>
          </h3>
          <p class="lg-next__main">{t('work.next.waitArrivals', { count: 2, label: t('work.endEarly.kanban') })}</p>
        </section>
        <ActionBar>{closed}</ActionBar>
        <ActionBar>{asking}</ActionBar>
      </div>
    </div>
  );
}
