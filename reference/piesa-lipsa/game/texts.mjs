export const texts = {
  title: 'Piesa lipsă',
  metaTitle: 'Piesa lipsă: joc de echipă pentru programatori | FAIGO',
  metaDescription:
    'Un joc de echipă pentru 2–4 programatori. Fiecare vede doar o parte din informație, iar rezolvarea iese numai vorbind.',
  intro:
    'Un joc de echipă pentru 2–4 programatori. Fiecare vede doar o parte din informație, iar rezolvarea iese numai vorbind.',
  noScript: 'Jocul are nevoie de JavaScript. Porniți JavaScript în browser și reîncărcați pagina.',
  themeToggle: 'Comutați între modul luminos și cel întunecat',
  footerNote: 'Jocul rulează numai în browserul dumneavoastră și nu trimite date nimănui.',
  notFoundTitle: 'Pagina nu există',
  notFoundMessage: 'Adresa aceasta nu duce nicăieri. Deschidem prima pagină.',

  howTitle: 'Cum se joacă',
  how: [
    {
      title: 'Cod comun',
      text: 'Un coleg pornește o echipă nouă și spune codul. Ceilalți îl introduc, fiecare pe dispozitivul lui.',
    },
    {
      title: 'Patru misiuni',
      text: 'Revizie, ordine de lansare, incident, integrare. Nimeni nu vede tot: întrebați, spuneți, confirmați.',
    },
    {
      title: 'Retrospectivă',
      text: 'La final comparați timpii și discutați ce a mers și ce ați schimba.',
    },
  ],

  setup: {
    newTitle: 'Echipă nouă',
    newText: 'Câți jucați? Fiecare joacă pe dispozitivul lui, în aceeași cameră sau în același apel.',
    players: (count) => `${count} jucători`,
    joinTitle: 'Aveți deja un cod?',
    codeLabel: 'Codul echipei',
    codeHint: 'Codul are patru litere și o cifră, de exemplu KTRM3.',
    join: 'Intrați în echipă',
  },

  seat: {
    codeLabel: 'Codul echipei',
    codeText: 'Spuneți codul colegilor. Fiecare îl introduce pe dispozitivul lui.',
    title: 'Locul dumneavoastră',
    text: 'Fiecare jucător alege alt loc.',
    player: (number) => `Jucătorul ${number}`,
    rulesTitle: 'Regulile jocului',
    rules: [
      'Sunt patru misiuni. În fiecare, toți jucătorii dau același răspuns, fiecare pe dispozitivul lui.',
      'Nimeni nu vede tot. Nu vă arătați ecranele: întrebați, spuneți, confirmați.',
      'Un răspuns greșit adaugă 30 de secunde la timpul echipei.',
      'Treceți la misiunea următoare împreună.',
    ],
    start: 'Start',
    back: 'Înapoi',
    startHint: 'Alegeți un loc, apoi apăsați Start toți odată.',
  },

  status: {
    mission: 'Misiunea',
    missionOf: (number, total) => `${number} din ${total}`,
    time: 'Timp',
    seat: 'Loc',
    seatOf: (number, total) => `Jucătorul ${number} din ${total}`,
    code: 'Cod',
    mistakes: 'Răspunsuri greșite',
  },

  missions: [
    {
      name: 'Revizia',
      brief:
        'Fiecare jucător are o copie a aceluiași fișier de configurare. Câteva rânduri diferă de la o copie la alta. Găsiți rândurile acestea vorbind și bifați, fiecare pe copia lui, pe cele care diferă. Ordinea rândurilor nu este aceeași la toți.',
      retro: 'La revizie: ați confirmat fiecare rând cu voce tare sau ați presupus că este la fel?',
    },
    {
      name: 'Ordinea de lansare',
      brief:
        'Componentele pornesc pe rând și există o singură ordine corectă. Fiecare jucător are câteva reguli; nimeni nu le are pe toate. Adunați regulile și așezați componentele în ordinea de pornire, de sus în jos.',
      retro: 'La ordinea de lansare: cine a ținut evidența întregului și de unde ați știut că nu lipsește nicio regulă?',
    },
    {
      name: 'Incidentul',
      brief:
        'Sistemul are o problemă. Indicatorii și regulile de intervenție sunt împărțite între jucători. Se aplică prima regulă care se potrivește, în ordinea numerelor. Stabiliți împreună ce este de făcut și alegeți toți aceeași acțiune.',
      retro: 'La incident: ați adunat întâi toți indicatorii sau ați ales prima regulă care părea potrivită?',
    },
    {
      name: 'Integrarea',
      brief:
        'Toți jucătorii au pornit de la același fișier și fiecare a modificat câteva valori. O modificare făcută de un singur jucător intră în fișierul final. Când doi jucători au modificat același rând, decide regula de integrare, pe care o vede un singur jucător. Scrieți valorile finale.',
      retro: 'La integrare: și-a spus fiecare modificările înainte să scrie cineva rezultatul?',
    },
  ],

  review: {
    legend: 'Copia dumneavoastră',
    hint: 'Bifați rândurile care diferă de la o copie la alta.',
  },

  order: {
    cluesTitle: 'Regulile dumneavoastră',
    clue: (after, before) => `„${after}” pornește după „${before}”.`,
    listTitle: 'Ordinea de pornire',
    listHint: 'Prima componentă care pornește stă sus.',
    up: (name) => `Mutați mai sus: ${name}`,
    down: (name) => `Mutați mai jos: ${name}`,
  },

  incident: {
    readingsTitle: 'Indicatorii dumneavoastră',
    rulesTitle: 'Regulile dumneavoastră',
    rule: (number) => `Regula ${number}`,
    when: 'Dacă',
    and: 'și',
    otherwise: 'Dacă nu se potrivește nicio altă regulă',
    optionsTitle: 'Acțiunea echipei',
    choose: 'Alegeți o acțiune, apoi verificați.',
  },

  merge: {
    tableTitle: 'Fișierul și modificările dumneavoastră',
    setting: 'Setare',
    base: 'La pornire',
    mine: 'Modificarea dumneavoastră',
    none: 'nemodificat',
    final: 'Valoarea finală',
    finalFor: (key) => `Valoarea finală pentru ${key}`,
    ruleTitle: 'Regula de integrare',
    rules: {
      max: 'Când doi jucători au modificat același rând, rămâne valoarea mai mare dintre cele două.',
      min: 'Când doi jucători au modificat același rând, rămâne valoarea mai mică dintre cele două.',
      lowSeat: 'Când doi jucători au modificat același rând, rămâne modificarea jucătorului cu numărul mai mic.',
      highSeat: 'Când doi jucători au modificat același rând, rămâne modificarea jucătorului cu numărul mai mare.',
    },
    ruleElsewhere: 'Regula de integrare este la alt jucător. Întrebați cine o are.',
    fill: 'Scrieți o valoare în fiecare rând, apoi verificați.',
  },

  play: {
    check: 'Verificați',
    wrong: 'Nu este răspunsul corect. S-au adăugat 30 de secunde. Mai treceți o dată prin informații, împreună.',
    right: 'Corect.',
    rightNext: 'Ajutați colegii care încă lucrează, apoi treceți împreună mai departe.',
    rightLast: 'Ajutați colegii care încă lucrează, apoi încheiați împreună.',
    next: 'Misiunea următoare',
    finish: 'Încheiați jocul',
    quit: 'Renunțați',
    quitConfirm: 'Apăsați din nou ca să renunțați',
  },

  end: {
    title: 'Retrospectivă',
    text: 'Comparați timpii, apoi luați întrebările pe rând. Fiecare jucător răspunde înainte să treceți la următoarea.',
    time: 'Timpul echipei',
    closing: 'Ce ați face la fel mâine, la lucru?',
    again: 'Joc nou',
  },
};
