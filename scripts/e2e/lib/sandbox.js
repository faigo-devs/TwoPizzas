const esc = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactText = (value) => new RegExp('^\\s*' + esc(value) + '\\s*$');
const itemIdText = (id) => new RegExp('^\\s*' + esc(id) + '\\s*$');
const cellOf = (id) => page.locator('.lg-cell').filter({ has: page.locator('.lg-item__id', { hasText: itemIdText(id) }) });
const pullOf = (id) => page.locator('li.lg-pull').filter({ has: page.locator('.lg-item__id', { hasText: itemIdText(id) }) });
const buttonIn = (scope, name) => (scope || page).getByRole('button', { name: new RegExp('^\\s*' + esc(name) + '(?::.*)?\\s*$', 's') });
const clickButton = async (scope, name) => {
  await buttonIn(scope, name).click({ timeout: 10000 });
  return true;
};
const chooseOption = async (inputName, value) => {
  await page
    .locator('label')
    .filter({ has: page.locator('input[name=' + JSON.stringify(inputName) + '][value=' + JSON.stringify(value) + ']') })
    .first()
    .click({ timeout: 10000 });
  return true;
};
const snapshotDom = () =>
  page.evaluate(() => {
    const active = document.activeElement;
    const workspace = document.querySelector('.lg-ws__body');
    const main = document.querySelector('main');
    return {
      url: location.href,
      lang: document.documentElement.lang,
      text: document.body.innerText,
      mainText: main ? main.innerText : '',
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      active: active
        ? { tag: active.tagName, id: active.id, lg: active.hasAttribute('data-lg-focus'), text: (active.innerText || '').slice(0, 80) }
        : null,
      workspaceText: workspace ? workspace.innerText : null,
      partTexts: workspace
        ? ['.lg-code__lines', '.lg-clues', '.lg-rules', '.lg-merge__table tbody'].flatMap((selector) =>
            [...workspace.querySelectorAll(selector)].map((node) => node.innerText),
          )
        : [],
      heldBodies: [...document.querySelectorAll('.lg-info__item')].map((node) => ({
        itemId: (node.querySelector('.lg-info__id') || { innerText: '' }).innerText.trim(),
        text: (node.querySelector('.lg-info__text') || { innerText: '' }).innerText,
      })),
      sheetText: (document.querySelector('.lg-sheet') || { innerText: null }).innerText,
      numberBoxes: Object.fromEntries(
        ['.lg-stats', '.lg-metrics', '.lg-sheet__table', '.lg-sheet__score', '.lg-verdicts', '.lg-sum-note']
          .map((selector) => [selector, [...document.querySelectorAll(selector)].map((node) => node.innerText).join('\n')])
          .filter((entry) => entry[1] !== ''),
      ),
    };
  });
const enterAnswer = async (response, labels) => {
  if (response.kind === 'review') {
    for (const key of response.keys) {
      await page.locator('button.lg-code__mark[aria-label=' + JSON.stringify(labels.mark[key]) + ']').first().click({ timeout: 8000 });
    }
    return true;
  }
  if (response.kind === 'order') {
    for (let guard = 0; guard < 80; guard += 1) {
      const current = await page.locator('.lg-order__name').allTextContents();
      const at = current.findIndex((name, index) => name !== response.order[index]);
      if (at < 0) return true;
      await buttonIn(null, labels.moveUp[response.order[at]]).click({ timeout: 8000 });
      await page.waitForTimeout(60);
    }
    return false;
  }
  if (response.kind === 'incident') {
    await page
      .locator('label.lg-chip')
      .filter({ has: page.locator('.lg-chip__face', { hasText: exactText(labels.action) }) })
      .first()
      .click({ timeout: 8000 });
    return true;
  }
  for (let index = 0; index < response.values.length; index += 1) {
    await page.locator('input[aria-label=' + JSON.stringify(labels.mergeInputs[index]) + ']').fill(String(response.values[index]), { timeout: 8000 });
  }
  return true;
};
const chooseLabel = async (text) => {
  await page.locator('label').filter({ hasText: exactText(text) }).first().click({ timeout: 10000 });
  return true;
};
const fillLabeled = async (text, value) => {
  await page.getByLabel(text).first().fill(value, { timeout: 10000 });
  return true;
};
const chooseValue = async (value) => {
  await page
    .locator('label')
    .filter({ has: page.locator('input[type=radio][value=' + JSON.stringify(value) + ']') })
    .first()
    .click({ timeout: 10000 });
  return true;
};
