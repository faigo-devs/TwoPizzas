async (page) => {
  const Base = 'http://127.0.0.1:4392/';
  const Widths = [320, 390, 768, 1280];
  const failures = [];
  const log = [];
  const consoleErrors = [];
  const expect = (condition, message) => {
    if (!condition) failures.push(message);
  };

  const watch = (target) => {
    target.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    target.on('pageerror', (error) => consoleErrors.push(String(error)));
  };

  const overflow = async (target, label) => {
    for (const width of Widths) {
      await target.setViewportSize({ width, height: 800 });
      const wider = await target.evaluate(() => {
        const limit = document.documentElement.clientWidth;
        return [...document.querySelectorAll('body *')]
          .filter((node) => node.getBoundingClientRect().right > limit + 0.5)
          .map((node) => `${node.tagName.toLowerCase()}.${node.className}`)
          .slice(0, 3);
      });
      expect(wider.length === 0, `${label} at ${width}px: wider than the window: ${wider.join(', ')}`);
    }
    await target.setViewportSize({ width: 1280, height: 800 });
  };

  const shot = async (target, name) => {
    for (const [width, tag] of [
      [390, 'phone'],
      [1280, 'desktop'],
    ]) {
      await target.setViewportSize({ width, height: 800 });
      await target.waitForTimeout(350);
      await target.screenshot({ path: `shots/${name}-${tag}.png`, fullPage: true });
    }
    await target.setViewportSize({ width: 1280, height: 800 });
  };

  const seconds = async (target) => {
    const [minutes, rest] = (await target.locator('[data-timer]').textContent()).split(':').map(Number);
    return minutes * 60 + rest;
  };

  const solvers = {
    async review(pages) {
      const seen = new Map();
      for (const target of pages) {
        const lines = await target.locator('.line code').allTextContents();
        expect(lines.length === 10, `review: ${lines.length} lines instead of 10`);
        for (const line of lines) {
          const [key, value] = line.split(' = ');
          seen.set(key, [...(seen.get(key) ?? []), value]);
        }
      }
      const differing = [...seen].filter(([, values]) => new Set(values).size > 1).map(([key]) => key);
      for (const target of pages) {
        for (const key of differing) await target.locator(`input[name="line"][value="${key}"]`).check();
      }
      return differing.join(', ');
    },

    async order(pages) {
      const clues = [];
      for (const target of pages) {
        const texts = await target.locator('.cell:has(.notes) .note').allTextContents();
        expect(texts.length >= 2, `order: a player has ${texts.length} clues`);
        for (const text of texts) {
          const match = text.match(/„(.+?)” pornește după „(.+?)”/);
          expect(Boolean(match), `order: unreadable clue "${text}"`);
          if (match) clues.push({ after: match[1], before: match[2] });
        }
      }
      const names = await pages[0].locator('[data-item]').evaluateAll((items) => items.map((item) => item.dataset.item));
      const order = [];
      while (order.length < names.length) {
        const ready = names.filter(
          (name) => !order.includes(name) && clues.every((clue) => clue.after !== name || order.includes(clue.before)),
        );
        expect(ready.length === 1, `order: ${ready.length} components can start at step ${order.length + 1}`);
        if (ready.length === 0) break;
        order.push(ready[0]);
      }
      for (const target of pages) {
        for (let place = 0; place < order.length; place += 1) {
          const current = await target.locator('[data-item]').evaluateAll((items) => items.map((item) => item.dataset.item));
          const steps = current.indexOf(order[place]) - place;
          for (let step = 0; step < steps; step += 1) {
            await target.locator(`[data-item="${order[place]}"] [data-action="up"]`).click();
          }
        }
      }
      return order.join(' > ');
    },

    async incident(pages) {
      const readings = new Map();
      const rules = [];
      const options = await pages[0].locator('input[name="action"]').evaluateAll((inputs) => inputs.map((input) => input.value));
      expect(options.length === 6, `incident: ${options.length} actions instead of 6`);
      for (const target of pages) {
        for (const text of await target.locator('.notes .note').allTextContents()) {
          const [name, value] = text.split(': ');
          readings.set(name, value);
        }
        const found = await target.locator('.rule').evaluateAll((items) =>
          items.map((item) => ({
            number: Number(item.querySelector('.rule-no').textContent.replace(/\D/g, '')),
            conditions: [...item.querySelectorAll('strong')].map((node) => node.textContent.split(': ')),
            text: item.textContent,
          })),
        );
        rules.push(...found);
      }
      expect(readings.size === 5, `incident: ${readings.size} readings instead of 5`);
      expect(rules.length === 6, `incident: ${rules.length} rules instead of 6`);
      rules.sort((a, b) => a.number - b.number);
      const first = rules.find((rule) => rule.conditions.every(([name, value]) => readings.get(name) === value));
      const action = options.find((option) => first.text.endsWith(`: ${option}.`));
      expect(Boolean(action), 'incident: the action of the fitting rule is not among the options');
      for (const target of pages) await target.locator(`input[name="action"][value="${action}"]`).check();
      return `regula ${first.number}: ${action}`;
    },

    async merge(pages) {
      const tables = [];
      let rule = null;
      for (const target of pages) {
        tables.push(
          await target.locator('.merge tbody tr').evaluateAll((rows) =>
            rows.map((row) => ({
              key: row.querySelector('th').textContent,
              base: Number(row.children[1].textContent),
              mine: row.children[2].querySelector('strong') ? Number(row.children[2].textContent) : null,
            })),
          ),
        );
        const text = await target.locator('.cell:has(.merge) + .cell .cell-text').textContent();
        const held = !(await target.locator('.cell:has(.merge) + .cell .cell-text.muted').count());
        if (held) {
          expect(rule === null, 'merge: two players hold the rule');
          rule = text.includes('valoarea mai mare') ? 'max' : text.includes('valoarea mai mică') ? 'min' : text.includes('numărul mai mic') ? 'low' : 'high';
        }
      }
      expect(rule !== null, 'merge: no player holds the rule');
      const finals = tables[0].map((line, index) => {
        const changes = tables.map((table) => table[index].mine).filter((value) => value !== null);
        if (changes.length === 0) return line.base;
        if (changes.length === 1) return changes[0];
        return { max: Math.max(...changes), min: Math.min(...changes), low: changes[0], high: changes[changes.length - 1] }[rule];
      });
      for (const target of pages) {
        const inputs = target.locator('input[name="final"]');
        for (let index = 0; index < finals.length; index += 1) await inputs.nth(index).fill(String(finals[index]));
      }
      return `${rule}: ${finals.join(', ')}`;
    },
  };

  const play = async (players, shots) => {
    const context = page.context();
    const pages = [page];
    for (let seat = 1; seat < players; seat += 1) {
      const other = await context.newPage();
      watch(other);
      pages.push(other);
    }
    for (const target of pages) {
      await target.goto(Base);
      await target.evaluate(() => sessionStorage.clear());
      await target.goto(Base);
    }

    expect((await page.locator('a, area').count()) === 0, 'the page has a link');
    expect((await page.locator('h1').count()) === 1, 'the page does not have exactly one h1');
    await overflow(page, 'setup');
    if (shots) await shot(page, 'setup');

    await page.locator('#g-code').fill('abc');
    await page.locator('form[data-form="join"] button').click();
    expect(await page.locator('#g-code-hint').isVisible(), 'a wrong code shows no hint');
    if (shots) await shot(page, 'setup-wrong-code');

    await page.locator(`[data-action="new"][data-players="${players}"]`).click();
    const code = (await page.locator('.code').textContent()).trim();
    expect(/^[BCDFGHJKLMNPRSTVWXZ]{4}[234]$/.test(code) && Number(code[4]) === players, `unexpected code ${code}`);
    for (const other of pages.slice(1)) {
      await other.locator('#g-code').fill(` ${code.toLowerCase()} `);
      await other.locator('form[data-form="join"] button').click();
      expect((await other.locator('.code').textContent()).trim() === code, 'a typed code does not open the same team');
    }
    expect(await page.locator('[data-action="start"]').isDisabled(), 'Start is enabled before a seat is chosen');
    await overflow(page, 'seat');
    for (const [seat, target] of pages.entries()) {
      expect((await target.locator('[data-action="seat"]').count()) === players, 'the seats do not match the number of players');
      await target.locator(`[data-action="seat"][data-seat="${seat}"]`).click();
    }
    if (shots) await shot(page, 'seat');
    for (const target of pages) await target.locator('[data-action="start"]').click();

    for (let mission = 0; mission < 4; mission += 1) {
      const kind = ['review', 'order', 'incident', 'merge'][mission];
      for (const target of pages) {
        const status = await target.locator('.status dd').first().textContent();
        expect(status === `${mission + 1} din 4`, `mission ${mission + 1}: the status says "${status}"`);
      }
      expect((await page.locator('a, area').count()) === 0, `mission ${mission + 1} has a link`);
      await overflow(page, `mission ${kind}`);
      if (shots) await shot(pages[mission % players], `mission-${kind}`);

      if (mission === 0) {
        const before = await seconds(page);
        await page.locator('[data-action="check"]').click();
        const feedback = await page.locator('[data-feedback]').textContent();
        expect(feedback.includes('30 de secunde'), 'a wrong answer shows no message');
        expect((await seconds(page)) - before >= 29, 'a wrong answer does not add 30 seconds');
        if (shots) await shot(page, 'mission-review-wrong');
      }

      if (mission === 1) {
        await pages[0].reload();
        const status = await pages[0].locator('.status dd').first().textContent();
        expect(status === '2 din 4', 'a reload loses the mission');
      }

      if (mission === 2) {
        await page.locator('[data-action="check"]').click();
        const feedback = await page.locator('[data-feedback]').textContent();
        expect(feedback.includes('Alegeți o acțiune'), 'checking without an action shows no hint');
      }

      const answer = await solvers[kind](pages);
      log.push(`${players} players, ${kind}: ${answer}`);
      for (const target of pages) {
        await target.locator('[data-action="check"]').click();
        const solved = await target.locator('[data-action="next"]').count();
        expect(solved === 1, `mission ${kind}: the pooled answer was refused`);
        if (!solved) return;
      }
      await overflow(page, `mission ${kind} solved`);
      if (shots) await shot(page, `mission-${kind}-solved`);
      if (mission === 3) {
        const stopped = await seconds(page);
        await page.waitForTimeout(1600);
        expect((await seconds(page)) === stopped, 'the clock runs after the last mission');
      }
      for (const target of pages) await target.locator('[data-action="next"]').click();
    }

    for (const target of pages) {
      expect((await target.locator('[data-screen="end"]').count()) === 1, 'the last screen is not the retrospective');
      expect((await target.locator('.retro li').count()) === 5, 'the retrospective does not have 5 questions');
    }
    const mistakes = await page.locator('.status dd').nth(1).textContent();
    expect(mistakes === '1', `the first player has ${mistakes} wrong answers instead of 1`);
    await overflow(page, 'end');
    if (shots) await shot(page, 'end');

    await page.reload();
    expect((await page.locator('[data-screen="end"]').count()) === 1, 'a reload loses the last screen');
    await page.locator('[data-action="reset"]').click();
    expect((await page.locator('[data-screen="setup"]').count()) === 1, 'a new game does not return to the first screen');
    for (const other of pages.slice(1)) await other.close();
  };

  watch(page);
  await play(2, true);
  await play(3, false);
  await play(4, false);

  await page.locator('#theme-toggle').click();
  expect(await page.evaluate(() => document.documentElement.classList.contains('dark')), 'the theme does not switch');
  await page.locator('[data-action="new"][data-players="2"]').click();
  await shot(page, 'dark-seat');
  await page.locator('[data-action="seat"][data-seat="0"]').click();
  await page.locator('[data-action="start"]').click();
  await shot(page, 'dark-mission-review');
  await page.locator('[data-action="quit"]').click();
  expect((await page.locator('[data-screen="mission"]').count()) === 1, 'one press leaves the game');
  await page.locator('[data-action="quit"]').click();
  expect((await page.locator('[data-screen="setup"]').count()) === 1, 'two presses do not leave the game');
  await shot(page, 'dark-setup');
  await page.locator('#theme-toggle').click();
  expect(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`);

  const missing = await page.goto(`${Base}pagina-inexistenta/`);
  expect(missing.status() === 404, `a missing address answers ${missing.status()}`);
  await page.waitForURL(Base);

  return { passed: failures.length === 0, failures, log };
}
