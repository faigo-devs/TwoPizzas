# Two Pizzas

A free browser game in which a team of 3–6 beginners learns Scrum or Kanban by playing: two short iterations of real
cooperative work, with Sprint Planning, the Daily Scrum, the Sprint Review and the Sprint Retrospective around them (or
their Kanban counterparts). Romanian and English.

A guided tour of about ten minutes lets someone alone try it first. The game will live at twopizzas.faigo.ro; it is
not published yet. The rules are in `docs/spec.md`; the state of the work and the owner's decisions are in
`docs/handover.md`; working rules are in `CLAUDE.md`.

```bash
npm install                       # and once in worker/
npm run dev                       # the page; the room server runs with `npm run dev` in worker/
npm test                          # engine and copy tests (cd worker && npm test for the room server)
npm run build && npm run check    # the static page and its output check
node scripts/e2e/run.mjs scrum    # a whole game on three pages in real browsers (also: kanban, tour)
```

## Licence and sources

The code and the game's own texts are under the MIT licence (`LICENSE`). The FAIGO name and logo (`app/assets/`) are
not covered by it.

The game teaches from three primary sources and links to them: the Scrum Guide (CC BY-SA), the Kanban Guide (Creative
Commons) and the Agile Manifesto. Short quotes carry their attribution; `docs/spec.md`, section 11, lists what each
source says and what the game adds as common practice.
