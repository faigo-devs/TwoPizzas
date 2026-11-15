import { MissionCount } from './engine.mjs';
import { texts } from './texts.mjs';

const Entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => Entities[char]);

/**
 * Escaped text whose hyphenated words stay whole on one line.
 */
export const keep = (text) =>
  String(text)
    .split(/(\S+-\S+)/)
    .map((part, index) => (index % 2 ? `<span class="nw">${esc(part)}</span>` : esc(part)))
    .join('');

/**
 * Milliseconds as minutes and seconds, "07:05".
 */
export function formatTime(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}

const arrow = (down) =>
  `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${
    down ? 'M8 2v11M3.5 8.5 8 13l4.5-4.5' : 'M8 14V3M3.5 7.5 8 3l4.5 4.5'
  }"/></svg>`;

/**
 * The first screen: start a team or type a code.
 */
export function setupView() {
  const copy = texts.setup;
  const counts = [2, 3, 4]
    .map((count) => `<button type="button" class="btn outline" data-action="new" data-players="${count}">${keep(copy.players(count))}</button>`)
    .join('');
  return `<div class="cells two" data-screen="setup">
<section class="cell" aria-labelledby="g-new">
<h2 class="cell-title" id="g-new" tabindex="-1" data-focus>${keep(copy.newTitle)}</h2>
<p class="cell-text">${keep(copy.newText)}</p>
<div class="row">${counts}</div>
</section>
<form class="cell" data-form="join" novalidate aria-labelledby="g-join">
<h2 class="cell-title" id="g-join">${keep(copy.joinTitle)}</h2>
<label class="field-label" for="g-code">${keep(copy.codeLabel)}</label>
<input class="code-input" id="g-code" name="code" type="text" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="g-code-hint">
<p class="field-hint" id="g-code-hint" hidden><span class="mark warn" aria-hidden="true"></span><span>${keep(copy.codeHint)}</span></p>
<div class="row"><button type="submit" class="btn outline">${keep(copy.join)}</button></div>
</form>
</div>`;
}

/**
 * The team's code, the choice of a seat and the rules, before Start.
 */
export function seatView(state) {
  const copy = texts.seat;
  const seats = Array.from({ length: state.players }, (_, seat) => {
    const pressed = state.seat === seat;
    return `<button type="button" class="btn outline" data-action="seat" data-seat="${seat}" aria-pressed="${pressed}">${keep(copy.player(seat + 1))}</button>`;
  }).join('');
  const rules = copy.rules.map((rule) => `<li class="note">${keep(rule)}</li>`).join('');
  return `<div class="cells two" data-screen="seat">
<section class="cell">
<h2 class="cell-label" id="g-code-title" tabindex="-1" data-focus>${keep(copy.codeLabel)}</h2>
<p class="code">${esc(state.code)}</p>
<p class="cell-text">${keep(copy.codeText)}</p>
</section>
<section class="cell">
<h2 class="cell-title" id="g-seat">${keep(copy.title)}</h2>
<p class="cell-text">${keep(copy.text)}</p>
<div class="row" role="group" aria-labelledby="g-seat">${seats}</div>
</section>
<section class="cell full">
<h2 class="cell-title">${keep(copy.rulesTitle)}</h2>
<ul class="notes">${rules}</ul>
<div class="row">
<button type="button" class="btn" data-action="start"${state.seat === null ? ' disabled' : ''}>${keep(copy.start)}</button>
<button type="button" class="btn outline" data-action="reset">${keep(copy.back)}</button>
</div>
<p class="cell-text muted">${keep(copy.startHint)}</p>
</section>
</div>`;
}

function statusCells(entries) {
  return entries
    .map(([label, value, attrs = '']) => `<div class="status-cell"><dt>${keep(label)}</dt><dd${attrs}>${esc(value)}</dd></div>`)
    .join('');
}

function reviewBody(view, mission, solved) {
  const copy = texts.review;
  const lines = view.lines
    .map(({ key, value }) => {
      const checked = solved && mission.answer.includes(key) ? ' checked' : '';
      return `<li><label class="line"><input type="checkbox" name="line" value="${esc(key)}"${checked}${solved ? ' disabled' : ''}><code>${esc(key)} = ${esc(value)}</code></label></li>`;
    })
    .join('');
  return `<fieldset class="cell full">
<legend class="cell-title">${keep(copy.legend)}</legend>
<p class="cell-text muted">${keep(copy.hint)}</p>
<ul class="lines">${lines}</ul>
</fieldset>`;
}

function orderBody(view, mission, solved) {
  const copy = texts.order;
  const clues = view.clues.map(({ before, after }) => `<li class="note">${keep(copy.clue(after, before))}</li>`).join('');
  const items = (solved ? mission.answer : view.items)
    .map(
      (name) => `<li class="order-item" data-item="${esc(name)}">
<span class="order-name">${keep(name)}</span>
<button type="button" class="btn outline icon" data-action="up" aria-label="${esc(copy.up(name))}"${solved ? ' disabled' : ''}>${arrow(false)}</button>
<button type="button" class="btn outline icon" data-action="down" aria-label="${esc(copy.down(name))}"${solved ? ' disabled' : ''}>${arrow(true)}</button>
</li>`,
    )
    .join('');
  return `<section class="cell">
<h3 class="cell-title">${keep(copy.cluesTitle)}</h3>
<ul class="notes">${clues}</ul>
</section>
<section class="cell">
<h3 class="cell-title">${keep(copy.listTitle)}</h3>
<p class="cell-text muted">${keep(copy.listHint)}</p>
<ol class="order">${items}</ol>
</section>`;
}

const condition = ({ name, value }) => `<strong>${keep(`${name}: ${value}`)}</strong>`;

function incidentBody(view, mission, solved) {
  const copy = texts.incident;
  const readings = view.readings.map((reading) => `<li class="note">${condition(reading)}</li>`).join('');
  const rules = view.rules
    .map((rule) => {
      const when = rule.conditions.length
        ? `${keep(copy.when)} ${rule.conditions.map(condition).join(` ${keep(copy.and)} `)}`
        : keep(copy.otherwise);
      return `<li class="rule"><span class="rule-no">${keep(copy.rule(rule.number))}</span><span>${when}: ${keep(rule.action)}.</span></li>`;
    })
    .join('');
  const options = mission.options
    .map((action) => {
      const checked = solved && action === mission.answer ? ' checked' : '';
      return `<li><label class="line"><input type="radio" name="action" value="${esc(action)}"${checked}${solved ? ' disabled' : ''}><span>${keep(action)}</span></label></li>`;
    })
    .join('');
  return `<section class="cell">
<h3 class="cell-title">${keep(copy.readingsTitle)}</h3>
<ul class="notes">${readings}</ul>
</section>
<section class="cell">
<h3 class="cell-title">${keep(copy.rulesTitle)}</h3>
<ul class="rules">${rules}</ul>
</section>
<fieldset class="cell full">
<legend class="cell-title">${keep(copy.optionsTitle)}</legend>
<ul class="lines">${options}</ul>
</fieldset>`;
}

function mergeBody(view, mission, solved) {
  const copy = texts.merge;
  const rows = view.lines
    .map(({ key, base, mine }, line) => {
      const value = solved ? mission.answer[line] : base;
      const changed = mine === null ? `<span class="muted">${keep(copy.none)}</span>` : `<strong>${esc(mine)}</strong>`;
      return `<tr>
<th scope="row"><code>${esc(key)}</code></th>
<td data-label="${esc(copy.base)}"><code>${esc(base)}</code></td>
<td data-label="${esc(copy.mine)}">${changed}</td>
<td data-label="${esc(copy.final)}"><input class="value-input" type="text" inputmode="numeric" maxlength="5" autocomplete="off" name="final" value="${esc(value)}" aria-label="${esc(copy.finalFor(key))}"${solved ? ' disabled' : ''}></td>
</tr>`;
    })
    .join('');
  const rule = view.rule === null ? `<p class="cell-text muted">${keep(copy.ruleElsewhere)}</p>` : `<p class="cell-text">${keep(copy.rules[view.rule])}</p>`;
  return `<section class="cell full">
<h3 class="cell-title">${keep(copy.tableTitle)}</h3>
<table class="merge">
<thead><tr><th scope="col">${keep(copy.setting)}</th><th scope="col">${keep(copy.base)}</th><th scope="col">${keep(copy.mine)}</th><th scope="col">${keep(copy.final)}</th></tr></thead>
<tbody>${rows}</tbody>
</table>
</section>
<section class="cell full">
<h3 class="cell-title">${keep(copy.ruleTitle)}</h3>
${rule}
</section>`;
}

const Bodies = { review: reviewBody, order: orderBody, incident: incidentBody, merge: mergeBody };

/**
 * One mission as the player in `state.seat` sees it; a solved one shows the answer, locked.
 */
export function missionView(state, mission, elapsedMs) {
  const copy = texts.missions[state.mission];
  const last = state.mission === MissionCount - 1;
  const status = statusCells([
    [texts.status.mission, texts.status.missionOf(state.mission + 1, MissionCount)],
    [texts.status.time, formatTime(elapsedMs), ' class="timer" data-timer'],
    [texts.status.seat, texts.status.seatOf(state.seat + 1, state.players)],
    [texts.status.code, state.code],
  ]);
  const feedback = state.solved
    ? `<span class="mark ok" aria-hidden="true"></span><span><strong>${keep(texts.play.right)}</strong> ${keep(last ? texts.play.rightLast : texts.play.rightNext)}</span>`
    : '';
  const main = state.solved
    ? `<button type="button" class="btn" data-action="next" data-focus>${keep(last ? texts.play.finish : texts.play.next)}</button>`
    : `<button type="button" class="btn" data-action="check">${keep(texts.play.check)}</button>`;
  return `<div class="cells two" data-screen="mission">
<dl class="cell full status">${status}</dl>
<section class="cell full">
<h2 class="cell-title big" id="g-mission" tabindex="-1"${state.solved ? '' : ' data-focus'}>${keep(copy.name)}</h2>
<p class="cell-text">${keep(copy.brief)}</p>
</section>
${Bodies[mission.kind](mission.views[state.seat], mission, state.solved)}
<section class="cell full">
<p class="feedback" role="status" data-feedback>${feedback}</p>
<div class="row spread">
${main}
<button type="button" class="btn outline sm" data-action="quit">${keep(texts.play.quit)}</button>
</div>
</section>
</div>`;
}

/**
 * The last screen: the team's time and the questions of the retrospective.
 */
export function endView(state, elapsedMs) {
  const copy = texts.end;
  const status = statusCells([
    [copy.time, formatTime(elapsedMs), ' class="timer"'],
    [texts.status.mistakes, state.mistakes],
    [texts.status.seat, texts.status.seatOf(state.seat + 1, state.players)],
    [texts.status.code, state.code],
  ]);
  const questions = [...texts.missions.map((mission) => mission.retro), copy.closing]
    .map((question) => `<li>${keep(question)}</li>`)
    .join('');
  return `<div class="cells two" data-screen="end">
<section class="cell full">
<h2 class="cell-title big" id="g-end" tabindex="-1" data-focus>${keep(copy.title)}</h2>
<p class="cell-text">${keep(copy.text)}</p>
</section>
<dl class="cell full status">${status}</dl>
<section class="cell full">
<ol class="retro">${questions}</ol>
</section>
<section class="cell full">
<div class="row"><button type="button" class="btn" data-action="reset">${keep(copy.again)}</button></div>
</section>
</div>`;
}
