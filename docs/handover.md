# Predare: Two Pizzas (actualizat 19 noiembrie 2026, 10:05)

Stare și decizii, ca o sesiune nouă să poată continua fără istoricul conversației. Citiți în ordine: `CLAUDE.md`
(reguli de lucru), `docs/spec.md` (contractul jocului), acest fișier.

## Stare
- Jocul se numește **Two Pizzas** (redenumit din LGTM pe 15 noiembrie, seara; decizia 13). Numele e schimbat în texte,
  pagini, wordmark, logo și pe GitHub; folderul local (`repos/LGTM`) și numele interne `lgtm` / `lgtm-rooms` încă nu.
- Repo public și open source, `faigo-devs/TwoPizzas` (licență MIT; numele și logo-ul firmei nu intră sub licență).
- Există: specificația, deciziile, sursele verificate (`docs/spec.md`, secțiunea 11), jocul anterior fără server ca
  referință de portat (`reference/piesa-lipsa/`), fișierele de server ale gazdei (`public/`), logo-urile.
- Gata și verificate de orchestrator (teste, tipuri, build, capturi): fundația motorului și mașina de stări Scrum
  (`core/`, 104 teste), sistemul vizual și pagina de probă cu componentele (`app/ui`, `app/styles`, `/kit` doar în
  dezvoltare), textele în română și engleză (`app/i18n`, 22 de teste).
- Gata și verificat și serverul de camere (`worker/`: 53 de teste, tipuri, `wrangler deploy --dry-run`, o probă reală
  cu trei jucători pe `wrangler dev`) și fluxul `verify.yml`.
- Gata și verificate (15 noiembrie, seara): regulile Kanban în motor (179 de teste în total) și aplicația reală până la
  începutul Sprint-ului (`app/game`: magazin de stare, transport la distanță și local cu coechipieri simulați, start,
  lobby, cartonașe, Sprint Planning; drum local până la rezumat și probă pe trei pagini cu serverul local, capturi în
  `.qa/app`). O cameră Kanban nu poate fi încă pornită din pagină (lipsesc ecranele).
- Gata și verificat: pachetul de publicare (`scripts/check-dist.mjs` cu 46 de teste proprii, `npm run check`,
  `publish-page.yml` și `publish-server.yml` inerte până la `PUBLISH_ENABLED=true`, `connect-src` cu `wss://`).
  Nedovedit fără contul real: rutele la un deploy adevărat, încărcarea FTPS, aprobarea mediului `production`.
- Gata și verificat în mod local (16 noiembrie): Sprint Review, Sprint Retrospective cu ajutorul „Nu știu ce să
  scriu”, comparația, fișa de rezumat tipăribilă, lista publică pe ecranul de start (capturi în `.qa/review`).
  Neprobat: publicarea rezultatului pe serverul real, verdictul „escaped defect” și Sprint Goal atins pe ecran.
- Gata și verificat (16 noiembrie): board-ul, task-ul deschis cu cele patru puzzle-uri pe roluri, schimbarea de
  context, Daily Scrum; jucate local și pe trei pagini cu serverul local (capturi în `.qa/work`). Neprobat pe ecran:
  6 jucători, nota „Changes requested” pe cartonaș, variantele de informație deținută pentru order, incident și merge.
- Gata și verificat (16 noiembrie): completările din motor cerute de ecrane (192 de teste): istoricul observațiilor
  în rezumat, numărul de încălcări ale acordului, nume nou de echipă la rezumat, răspunsurile proprii din ajutor,
  Sprint Goal în vedere pe toată durata Sprint-ului, acțiunile permise pe fiecare element calculate de server,
  scriptul din timpul lucrului.
- Gata și verificat (16 noiembrie): jocul Kanban în client (Replenishment, WIP limits, cereri care sosesc, daily,
  Delivery review cu cele patru metrici și comparația rundelor, retrospectivă, rezumat), jucat local și pe trei
  pagini cu serverul local, inclusiv publicarea rezultatului în lista locală (capturi în `.qa/kanban`). Board-ul
  ia acum drepturile pe element și Sprint Goal din vederea serverului. Neprobat: parcurgere doar cu tastatura,
  contrast și ținte de 44 px măsurate, tema deschisă la 1280 px pe ecranele Kanban; jocul Scrum nu a fost rejucat până
  la rezumat după aceste schimbări.
- Gata și verificat: întărirea paginii și a fluxurilor de publicare (secțiunea de securitate, punctul 7).
- Gata și verificat (16 noiembrie): trecerea de texte după evaluarea de fidelitate, în ambele limbi (circa 125 de
  chei schimbate), textul de confidențialitate adus la zi cu codul, pluralul în română; 203 teste. Neprobat pe ecran:
  cartonașele de verdict și numărătorile 1/2/20 în română (verificate doar prin test).
- Gata și verificat (16 noiembrie): întărirea motorului și a serverului după evaluarea de securitate (203 teste la
  rădăcină, 76 în `worker/`; jucat pe trei pagini cu serverul local: scos un jucător din lobby, loc deschis în două
  file, conexiune mută). Neprobat fără contul real: limitele de cereri și memoria-tampon a listei publice.
- A doua evaluare de securitate: 7/10 (raport în `.qa/reviews/security-2026-11-16-second.md`). A confirmat reparația
  secretului și a găsit două defecte în codul nou (alarmă în buclă când un client nu mai citește; opt conexiuni goale
  țin jucătorii afară). Reparate și verificate (206 teste la rădăcină, 84 în `worker/`), plus blocarea camerei de
  către gazdă și rândul „rezultatele nu sunt verificate” pe lista publică.
- Gata și verificat (16 noiembrie): turul de unul singur (8 pași pe ecranele reale, circa 95 de secunde, parcurs și
  doar cu tastatura; capturi în `.qa/tour`), observațiile pe evenimente pe fișa de rezumat, numărul de încălcări ale
  acordului, „Alt nume” la publicare, ambele verdicte văzute pe ecran în jocul local. Neprobat pe ecran: încheierea
  retrospectivei fără acțiune, butonul „Alt nume” (cere serverul), verdictul greșit în Scrum (captura s-a pierdut).
- A treia evaluare de securitate: 8/10 (raport în `.qa/reviews/security-2026-11-16-third.md`). Toate constatările
  celei de-a doua sunt confirmate ca reparate (20 de treziri ale alarmei în 399 de secunde cu clienți blocați, față
  de circa 32 pe secundă înainte). Pentru 9/10 mai cere: configurația serverului luată din repo la publicare (făcut),
  o limită fermă pe numărul total de conexiuni ale unei camere și token-uri ținute ca hash (urmează, după ce se
  termină proba jocului întreg, fiindcă schimbă codul serverului pe care rulează proba), și o probă pe serverul real
  cu clienți blocați, care se poate face doar cu contul proprietarului.
- A doua evaluare de fidelitate: 8/10 (raport în `.qa/reviews/fidelity-2026-11-16-second.md`). Douăzeci de
  constatări confirmate ca reparate. Pentru 9/10 mai cere: nimic să nu spună că Sprint-ul „pornește” după Planning;
  textul să spună exact ce măsoară jocul la Sprint Goal (toate elementele temei, selectate și terminate corect);
  Product Owner ca membru al Scrum Team pe cartonașul de Review; nota „vine din Kanban” la propunerile cu WIP limit
  din Scrum; cartonașe mai scurte; testul de dicționar extins.
- Gata și verificat: a doua trecere de texte după evaluarea de fidelitate (220 de teste).
- **A treia evaluare de fidelitate: 9/10, pragul este atins** (raport în `.qa/reviews/fidelity-2026-11-16-third.md`).
  Din ce a mai notat, aplicate: textul „fără WIP limits” separat pentru runda 1 și pentru runda 2, standardul
  organizației la Definition of Done, „stakeholders” în loc de „customers” la Sprint Review. Rămase ca finisaj:
  un rând cu Service Level Expectation lângă media de cycle time, limită de cuvinte în testul de dicționar.
- Gata și verificat: ultimele reparații de securitate cerute la a treia evaluare (limită fermă de 64 de conexiuni
  listate pe cameră, token-uri ținute doar ca hash; 220 de teste la rădăcină, 90 în `worker/`).
- **A patra evaluare de securitate: 6/10** (raport în `.qa/reviews/security-2026-11-16-fourth.md`). Limita de 64 de
  conexiuni listate, adăugată la runda a treia, s-a dovedit o pârghie de blocare: 64 de conexiuni care nu mai citesc,
  de la o singură adresă, țin afară orice reconectare cât trăiește camera. Token-urile ca hash și fluxul de publicare
  sunt confirmate ca bune. Reparația în lucru: jucătorul care are deja loc se autentifică la deschiderea conexiunii
  și nu mai e supus niciunei limite; conexiunile închise de cameră nu se mai numără la limitele care pot refuza
  oameni. Evaluatorul a lăsat și testul pentru serverul real: `scripts/staging-check.mjs` (circa 9 minute).
- Oprite până se așază schimbările: scripturile care joacă un joc întreg pe trei pagini (`scripts/e2e/`).
- Gata și verificat (17 noiembrie): pagina de start în două zone (joc cu echipa, în galben; turul ghidat, în
  magenta, cu traseu de 14 opriri), turul lungit la 14 pași (15 în Kanban) cu lucru adevărat, doar tema închisă,
  comutatorul de temă scos (223 de teste; capturi în `.qa/tour2`). Durata turului este calculată, nu cronometrată:
  între 7 și 10 minute pentru cine citește și face tot. Neprobat: fișa de rezumat în tipărire după scoaterea temei.
- Gata și verificat (17 noiembrie): reparația după a patra evaluare de securitate. Jucătorul cu loc se autentifică
  la deschiderea conexiunii și nu mai e supus niciunei limite; conexiunile închise de cameră nu se mai numără; a
  rămas doar o plasă de 2.000 de conexiuni listate, care refuză doar străini (223 de teste la rădăcină, 96 în
  `worker/`; cu 66, 600 și 2.100 de conexiuni blocate, jucătorul revenit a intrat în 55–78 ms pe serverul local).
- Gata și verificat (17 noiembrie): tot textul românesc trecut la „tu” (278 de texte; niciun „dumneavoastră” rămas, un
  test îl interzice; 226 de teste). Câteva propoziții rămân intenționat la „voi”, fiindcă vorbesc despre echipă.
- De aprobat de proprietar: textul de confidențialitate în forma de acum (`privacy.p1`–`p6`).
- **A cincea evaluare de securitate: 8/10; 9/10 după testul pe serverul real** (raport în
  `.qa/reviews/security-2026-11-17-fifth.md`). Blocarea camerelor e reparată și confirmată. Mai rămâne o singură
  valoare de schimbat: plasa de 2.000 de conexiuni era prea mare pentru memoria unei camere în producție; e coborâtă
  la 256 (18 noiembrie).
  Testul pentru serverul real e gata: `node scripts/staging-check.mjs https://<gazda de staging>` (circa 6,5
  minute), plus trei lucruri citite din contul Cloudflare: alarmele camerei, cererile către clasament și memoria
  camerei. Nu se urmărește `wrangler tail` în producție în timpul jocurilor (ar arăta token-urile).
- **Gata și verificat (pasul 7): proba jocului întreg pe trei pagini, cu serverul local.** Un joc Scrum întreg (21 de
  minute, 6.172 de verificări) și un joc Kanban întreg (21 de minute, 7.229 de verificări) au trecut, plus turul
  ghidat. Niciun defect al jocului găsit: fără erori în consolă, fără încălcări ale politicii paginii, fără scurgeri
  de răspunsuri între pagini, reîncărcare și a doua filă bune, rezultatul publicat apare în listă. Comenzile:
  `node scripts/e2e/run.mjs scrum`, `… kanban`, `… tour` (detalii în `scripts/e2e/README.md`).
- Pasul 8, evaluatorii (18 noiembrie): **limbă: română 7/10, engleză 8/10** (raport în
  `.qa/reviews/language-2026-11-18.md`); **design 7,5/10, utilizare 6,5/10** (raport în
  `.qa/reviews/design-usability-2026-11-18.md`; niciun blocaj; contrast AA peste tot; nicio depășire pe ecrane
  înguste). Din design: tema elementelor nu se vede nicăieri deși Sprint Goal o numește; două butoane „Step done”
  pe același ecran; în retrospectivă „Încheie” e butonul principal, nu „Alege acțiunea”; focusul se pierde după
  trimitere; pe un laptop butonul de acțiune e des sub marginea ecranului; turul arată observații de la un Planning
  care n-a avut loc.
- Gata și verificat (18 noiembrie): reparațiile de limbă, în ambele limbi (236 de teste; un joc Scrum întreg prin
  proba pe trei pagini a trecut după ele). Textul de confidențialitate are cele patru clarificări (adresa IP, ce
  cere echipa, „nici alte date”, „cât timp fila e deschisă”).
- Gata și verificat (18 noiembrie): reparațiile de design și utilizare, cu interfața mai puțin încărcată și
  principiile lui Krug (236 de teste; probele jocului întreg au trecut din nou: Scrum 5.263, Kanban 7.659, turul 125
  de verificări; capturi în `.qa/design-fix`). Rămase: textele lungi din Lobby, rezumat și Kanban nu au fost tăiate
  la jumătate peste tot.
- Evaluarea GDPR (18 noiembrie): **5/10 acum, 8/10 după punctele obligatorii** (raport în
  `.qa/reviews/gdpr-2026-11-18.md`). Codul e prietenos cu datele; textul nu e încă suficient (operator, temeiuri,
  împuterniciți, drepturi, plângere la ANSPDCP, ce păstrează gazda și Cloudflare). Pe lista proprietarului, în afara
  codului: registrul de prelucrări, contractele de prelucrare cu gazda și Cloudflare, testul de interes legitim
  pentru adresa IP, întrebarea către Cloudflare despre ce rămâne după ștergere, confirmarea unui avocat pe punctele
  marcate.
- Urmează, în ordine: pauza personală (decizia 22) împreună cu schimbările GDPR din cod și text (decizia 24, date
  ținute în UE, textul nou); micro-learning în joc (decizia 19); un test de utilizare cu jucători simulați fără nicio
  cunoștință de Agile (testul „trunk”, gândire cu voce tare), cu reparațiile lui; a doua trecere a evaluatorilor de
  limbă, design și fidelitate; proba jocului întreg din nou.
- Gata: favicon-ul Two Pizzas (svg și ico).
- De aprobat de proprietar: textul de confidențialitate, în forma nouă (`privacy.p1`–`p6` din `app/i18n`).
- După ele: o trecere prin Review, Retrospective și rezumat care folosește restul câmpurilor noi din motor.
- De reparat la trecerea de texte: pluralul în română din propunerile ajutorului („1 elemente acceptate”).
- Nu există încă: ecranele de lucru (board, task deschis, cele patru puzzle-uri pe roluri), daily, review,
  retrospectivă, rezumat și clasament; ecranele Kanban; turul de unul singur; fluxurile de publicare; scriptul de
  verificare a build-ului (`scripts/`); proba în browser a unui joc întreg pe trei pagini.
- Nimic nu este publicat. Pe www.faigo.ro rulează site-ul firmei, din repo-ul lui.
- Primul push în `faigo-devs/TwoPizzas` este făcut (istoria locală unită cu commit-ul inițial creat de GitHub).

## Progres și sarcini rămase (19 noiembrie, 18:40)

Ce există și e verificat: jocul Scrum și Kanban cap-coadă (motor, server, client); turul ghidat de 14 pași (15 în
Kanban); pagina de start în două zone; doar tema închisă; textele în română „tu” și în engleză; micro-learning (un
obiectiv pe fiecare cartonaș, o întrebare după fiecare eveniment, scorul pe fișa de rezumat); pauza personală de 1–15
minute; în Scrum se pot lua elemente din Product Backlog în timpul Sprint-ului, iar facilitatorul poate încheia
jumătatea devreme; textul de confidențialitate cu rândul despre operator; datele camerelor în UE; favicon-ul Two Pizzas;
adresa `twopizzas.faigo.ro`; verificarea build-ului; fluxurile de publicare inerte. 280 de teste la rădăcină, 101 în
`worker/`; probele jocului întreg pe trei pagini (`node scripts/e2e/run.mjs scrum|kanban|tour`) trec toate.

Notele evaluatorilor (pragul: cel puțin 9/10 la fiecare; rapoartele în `.qa/reviews/`, de mutat în repo la final):

| Evaluare | Ultima notă | Ce mai lipsește |
|---|---|---|
| Fidelitate față de ghiduri | **9** (evaluarea finală, după grilă) | niciun blocaj, nicio majoră; tot conținutul nou e fidel; 7 minore opționale pe lista de după versiunea 1, cu text în `.qa/reviews/fidelity-2026-11-19-final.md` |
| Securitate | **9** pe cod, 9 per total provizoriu (evaluarea finală, după grilă) | niciun blocaj, nicio majoră; 7 minore pe lista de după versiunea 1 (limita pe IPv6 /64, închiderea socket-ului după abuz repetat, testul de scurgeri mai strict, `persist-credentials` în CI, `X-Content-Type-Options` pe răspunsurile JSON); verificările la publicare rămân ale proprietarului |
| GDPR | **9** pe cod și text, 8 per total (evaluarea finală, după grilă) | pe cod și text nimic nu blochează; per total singura majoră e a proprietarului: contractele cu furnizorii, răspunsul scris al furnizorului despre copiile de recuperare și locul datelor în UE (textele `privacy.p3` și `privacy.p6` le afirmă); cu ele, 9 |
| Limbă: română / engleză | **9 / 9** după reparația singurei majore (evaluarea finală, după grilă: 8,5 / 8,7 înainte) | `tour.right.text` legase „gata” de Request changes; reparat cu textul evaluatorului; minorele (formele cu „-ul”, „ședințe” față de „întâlniri”, câteva titluri) pe lista de după versiunea 1, cu textul exact în `.qa/reviews/language-2026-11-19-final.md` |
| Design / utilizare | 8,9 / 8,9 (a cincea trecere) | singurul blocaj: pliul „Ce s-a întâmplat în …” nu avea săgeata de deschidere (reparat de orchestrator în `app/styles/polish.css`); confirmarea vine în ultima trecere |
| Calitatea codului / mentenanță / arhitectură | **9** / 8 / **9** (a doua și ultima trecere, după grilă) | singura majoră: arborele necommis (53 de fișiere, 12 noi); se închide cu commitul de după probe; minorele (chei de text dinamice fără verificare, fără error boundary, ordinea din `load()`, `plan.pull` dublat, D-id-uri citate doar în 7 teste) pe lista de după versiunea 1 |
| Trei utilizatori (începător, facilitator, developer sceptic) | după ce interfața e gata | nu condiționează versiunea 1 (decizia 26); înlocuiesc testul simulat, care a dat 7 |

În lucru acum (19 noiembrie, 23:20): probele jocului întreg trec toate trei după ultimele reparații (tur; Kanban 8041
verificări; Scrum 7287 verificări; 0 eșecuri). Runda finală până acum: securitate 9 pe cod, GDPR 9 pe cod și text, limbă
9 / 9 (după reparația singurei majore), fidelitate 9, cod 9 / mentenanță 8 / arhitectură 9 (mentenanța urcă la 9 după commit).
După probe: comanda de commit (cu normalizarea finalurilor de rând), apoi **orchestratorul așteaptă confirmarea
proprietarului că a făcut commitul** înainte să meargă mai departe (cererea proprietarului, 19 noiembrie, 22:38).

Sarcini rămase, în ordine (regula de oprire: decizia 27; grila: decizia 28):
1. Gata și verificate: granița Scrum/Kanban, întărirea motorului și a serverului, testele pentru client, reparațiile
   după a patra și a cincea evaluare de design, confirmarea GDPR (9 pe cod și text), pachetul din verificarea
   cerințelor (D-102–D-105; raport `.qa/reviews/requirements-2026-11-19.md`: 199 de cerințe, 181 cu dovezi la prima
   trecere), cei trei utilizatori și reparațiile după începător (D-106–D-108). Probele jocului întreg trec (18:35).
   Commit local de siguranță la 18:13, fără push.
2. Reparațiile după facilitator și după developer: gata (D-109–D-116).
3. Probele tur, Kanban și Scrum trec (19 noiembrie, 23:20). În lucru: comanda de commit (cu `.gitattributes` și
   normalizarea finalurilor de rând, D-117) și așteptarea confirmării proprietarului.
4. Runda finală, după grila din decizia 28: gata securitate (9 pe cod), GDPR (9 pe cod și text), limbă (9 / 9),
   fidelitate (9), cod (9 / 8 / 9; mentenanța urcă la 9 după commit); rămas designul, după confirmarea commitului
   (30 min), apoi reparațiile doar pentru blocaje și majore, dacă apar.
5. A doua verificare a listei de cerințe, scurtă: doar cele 11 parțiale de la prima trecere (30 min).
6. Final: `reference/piesa-lipsa/` șters, rapoartele mutate din `.qa/` în `docs/reviews/`, comanda de commit și push
   (cu `worker/.dev.vars`), reclonarea în `repos/TwoPizzas` (30 min).

Estimare: 2–3 ore de lucru ale agenților, cu pauzele de la limitele de credite.

Pe lista proprietarului (în afara codului): subdomeniul `twopizzas.faigo.ro` pe gazdă și în Cloudflare; secretele și
variabilele din repo (`SITE_URL`, `SITE_HOSTS`, `FTP_REMOTE_DIR` etc.); testul pe serverul de staging
(`scripts/staging-check.mjs`, circa 6,5 minute) și citirile din contul Cloudflare (alarme, cereri la clasament,
memoria camerei, jurisdicția UE, antetele răspunsurilor); întrebarea scrisă către Cloudflare despre copiile de recuperare
după ștergere; datele firmei verificate la Registrul Comerțului; o adresă de contact pe domeniul firmei (recomandat);
registrul de prelucrări, contractele de prelucrare cu gazda și Cloudflare, procedurile pentru drepturi și incidente,
confirmarea avocatului pe punctele marcate în raportul GDPR; sesiunea de probă cu 3–6 începători; publicarea, doar cu
acordul lui. Commit-ul nu e făcut încă: la primul punct sigur, orchestratorul dă comanda.

## Decizii ale proprietarului (15 noiembrie 2026, de nu redeschis fără el)
Stabilite într-o sesiune de întrebări și confirmate de el la final.

1. **Pentru cine.** Începători (oameni care n-au lucrat în Agile). „Să învețe prin joc”: după o sesiune pot spune scopul,
   durata și greșeala tipică a fiecărui event și au trecut prin fiecare o dată.
2. **Format.** 3–6 jucători, 45–60 de minute, fiecare pe dispozitivul lui. Vocea merge prin aplicația de apel a
   echipei; apelul audio în pagină nu se construiește acum (ar cere microfon, un releu de rețea și cost neverificat).
3. **Framework.** Se alege la început: Scrum sau Kanban, amândouă în prima versiune. Alte cadre: niciunul numit.
4. **Munca.** Un backlog de circa 10 tasks din cele patru tipuri (code review, deploy order, incident, merge), în trei
   mărimi, fiecare cu o valoare; mai multe decât încap într-un sprint. Se lucrează în perechi, în paralel; unele tasks se
   blochează până vine o informație de la altă pereche.
5. **Scrum, două sprinturi.** Sprint Planning (Sprint Goal, planning poker cu cărți dezvăluite odată, capacitate; în
   sprintul 2 se planifică după velocity) → Daily Scrum la mijlocul sprintului (ceasul sprintului se oprește, 2–3
   minute, mers pe board spre goal, nu cele trei întrebări) → Sprint Review (jocul acceptă doar ce respectă Definition
   of Done, de exemplu „verificat de un coleg din afara perechii”; o reacție a clienților reordonează backlogul) →
   Sprint Retrospective (coloane „A mers bine”, „Ne-a încetinit”, „Încercăm”; 2 voturi de fiecare; o singură acțiune,
   dintr-o listă de reguli pe care jocul le poate urmări sau scrisă liber; la finalul sprintului 2 se vede dacă a fost
   respectată și cum s-au schimbat cifrele).
6. **Roluri.** Jocul este Product Owner. Un jucător este Scrum Master, cu scenariu pe ecranul lui, rotit în sprintul 2.
   Daily Scrum îl conduc Developers; Scrum Master are grijă doar să aibă loc și să se încadreze în timp.
7. **Kanban, două runde.** Prima fără WIP limits, a doua cu; un grafic compară cât de repede ies tasks (cycle time, throughput, WIP, work item age). Întâlniri
   simulate: zilnică la board, reaprovizionare, revizuirea livrării, retrospectivă.
8. **Cum învață.** Înainte de fiecare event un cartonaș de 15 secunde (scop, durată); în timpul lui, pași ghidați; după,
   o observație din ce a făcut echipa. Jocul nu aude apelul: observațiile vin doar din ce se vede pe board (timp
   depășit, blocker rămas fără ajutor, plan neschimbat). La final, o fișă de rezumat care se poate salva sau tipări.
   Cine intră singur primește un tur ghidat de 2 minute.
9. **Texte scrise de jucători.** Libere, cel mult 140 de caractere, nume opțional. Butonul „Nu știu ce să scriu” pune
   2–3 întrebări scurte și propune notițe de schimbat; întrebările și propunerile vin din reguli și din datele jocului,
   nu de la un model AI. Camera și tot ce conține se șterg când pleacă ultimul jucător sau după 2 ore; nimic în
   jurnale; un text scurt de confidențialitate pe pagină.
10. **Limbi.** Română și engleză pe aceeași pagină, alese de fiecare jucător (comutator; la prima vizită limba
    browserului, altfel româna). Termenii de specialitate și cuvintele tehnice rămân mereu în engleză, în ambele limbi.
    Numele oficiale ale evenimentelor (Sprint Planning, Daily Scrum, Sprint Review, Sprint Retrospective), cu cel uzual
    pomenit o dată.
11. **Server și linkuri.** Un server de camere în timp real în Cloudflare (de același tip ca Durable Object-ul
    din repo-ul site-ului); pe gazdă rămâne o singură pagină. Regula „fără niciun link” devine „niciun link către alte
    pagini ale site-ului”: sunt permise trei linkuri către surse primare (Ghidul Scrum, Ghidul Kanban, Manifestul
    Agile), deschise în filă nouă, în română unde există traducere oficială.
12. **Clasament public.** Doar dacă echipa alege la final („Publicați rezultatul”). Nume de echipă generate de joc (două
    cuvinte, cu „altul” până place), nu scrise liber. Măsoară valoarea livrată; primele 10 din luna curentă și recordul
    din toate timpurile; separat pentru Scrum și Kanban. Se păstrează doar numele generat, mărimea echipei, scorul, data.
13. **Nume și stil.** Jocul se numește **Two Pizzas** (o echipă cât pentru două pizze: 3–6 jucători), cu o linie
    explicativă sub nume, în limba aleasă. Numele inițial, LGTM, a fost abandonat de proprietar pe 15 noiembrie (are și
    alte sensuri printre developeri); LGTM rămâne doar ștampila de la code review. Stil vizual nou, de
    unealtă pentru programatori (întunecat implicit, mai colorat, mai jucăuș); Din 16 noiembrie, la cererea proprietarului, pagina nu mai are
    rândul „joc realizat de” și nici blocul cu datele firmei (nume, sediu, CIF, Nr. Reg. Com.); subsolul ține doar
    confidențialitatea și cele trei surse.
14. **Publicare.** Nimic până când versiunea aceasta e gata; până atunci pe server rămâne site-ul firmei. Ordinea: o sesiune de probă
    cu 3–6 începători reali și 3 întrebări la final → reparat ce i-a încurcat → evaluatorii 9/10 → publicare. La
    publicare se opresc cele două Worker-e vechi (`/api/contact`, `/api/scan`); codul lor rămâne în repo.

15. **Repo separat, public, open source.** Jocul se construiește în repo-ul lui, `faigo-devs/TwoPizzas`, nu în repo-ul
    site-ului. Asistentul este proprietarul tehnic și întreținătorul pe termen lung al codului și lucrează ca
    orchestrator al unei echipe de agenți.

16. **Registrul în română.** Prietenos, cu „tu” către jucător și „voi” către echipă, niciodată „dumneavoastră”
    (16 noiembrie, seara: forma de politețe suna prea rigid). Termenii tehnici rămân în engleză.

17. **Turul individual.** Anunțat ca „circa 10 minute”, nu 2 (16 noiembrie, seara): mai lung și cu lucru adevărat,
    iar pe pagina de start are zona lui, cu o culoare distinctă de butonul principal și cu un aspect care duce cu
    gândul la un tur. Înlocuiește „tur ghidat de 2 minute” din decizia 8.

18. **Doar tema închisă.** Fără temă deschisă și fără comutator de temă (16 noiembrie, seara). Doar fișa de rezumat
    tipărită rămâne deschisă, fiindcă e hârtie. Înlocuiește „întunecat implicit” din decizia 13.

19. **Micro-learning în joc** (18 noiembrie). Fiecare eveniment spune la început un singur obiectiv („după acest
    eveniment vei ști…”) și se încheie cu o întrebare de verificare de 10–20 de secunde, cu trei variante; fișa de
    rezumat arată câte răspunsuri corecte ai avut. Lecții scurte separate: nu acum, poate după sesiunea de probă.

20. **UX pe primul loc** (18 noiembrie). De UX depind cât se învață, obiceiurile formate și recomandarea către alții.
    Interfața nu e încărcată; se aplică principiile din „Don't Make Me Think” (Steve Krug); utilizarea se testează
    (jucători simulați înainte de sesiunea de probă, oameni reali în ea). Favicon-ul este semnul Two Pizzas.

21. **Adresa: `twopizzas.faigo.ro`** (18 noiembrie). Jocul se publică pe subdomeniul lui, nu în locul site-ului
    firmei; repo-ul rămâne `faigo-devs/TwoPizzas`. Înlocuiește partea din deciziile 11 și 14 care spunea că jocul
    ia locul site-ului de pe www.faigo.ro și că la publicare se opresc Worker-ele vechi: site-ul firmei rămâne cum e.

22. **Pauză personală de până la 15 minute** (18 noiembrie). Un jucător apasă „Pauză” și alege cât lipsește, între 1
    și 15 minute (implicit 5): elementele și rolul îi rămân rezervate atât timp, colegii văd până când lipsește, ceasul echipei merge
    mai departe. O cameră goală se șterge după 15 minute, nu după 5.
23. **Textul de confidențialitate aprobat** de proprietar (18 noiembrie), cu cele 15 minute de mai sus; îl revizuiește
    și un evaluator de GDPR înainte de publicare.
24. **Operatorul datelor, în textul de confidențialitate** (18 noiembrie, după evaluarea GDPR). Un singur rând în
    textul pliat din subsol: FAIGO SRL, sediul, CIF, Nr. Reg. Com. și adresa de contact a firmei, aleasă de
    proprietar pentru cereri despre date și scrisă doar în `app/i18n/identity.ts`. Restul paginii rămâne fără datele
    firmei.
25. **Orchestratorul este Scrum Master-ul echipei virtuale** (19 noiembrie). Toată comunicarea trece prin el: dă
    pachetele de lucru, primește livrările, le verifică, spune evaluatorilor ce s-a schimbat, ține lista de sarcini în
    această fișă și raportează proprietarului la fiecare tură. Agenții nu vorbesc între ei.
26. **Trei evaluatori cu rol de utilizatori** (19 noiembrie): începătorul fără Agile, pe telefon, în română;
    facilitatorul care conduce o sesiune pentru echipa lui; developerul cu experiență, sceptic, pe laptop, în engleză.
    Sunt critici când e cazul și nu citesc documentația internă. Orchestratorul analizează fiecare critică și trece la
    acțiune doar pentru ce e real: se reproduce, încurcă învățarea sau mersul sesiunii și nu contrazice o decizie a
    proprietarului. Restul se notează fără acțiune. Notele lor nu condiționează versiunea 1. Înlocuiesc testul de
    utilizare simulat.
27. **Versiunea 1 e gata când toată lista de cerințe e făcută și toți ceilalți evaluatori dau cel puțin 9** (19
    noiembrie). Lista de cerințe: deciziile proprietarului din această fișă și contractul din `docs/spec.md`; fiecare
    cerință are o dovadă (test, probă de joc întreg sau captură), verificată de un evaluator independent. Evaluatorii:
    fidelitate, limbă română și engleză, design, utilizare, calitatea codului, mentenanță, arhitectură, securitate,
    GDPR. Fără buclă infinită:
    fiecare evaluator mai are cel mult două treceri; ce rămâne sub 9 după ele ajunge la proprietar, cu lista, și el
    decide. Se repară doar ce spune evaluatorul că blochează 9; „ar fi frumos” trece pe lista de după versiunea 1.
    Securitatea și GDPR ating 9 întreg doar după pașii proprietarului (testul pe staging, avocatul, contractele);
    pentru „verificat local” contează 9 pe partea de cod, restul rămâne pe lista proprietarului.
28. **Grila de note, aceeași pentru toți evaluatorii** (propusă de orchestrator și aprobată de proprietar pe 19
    noiembrie, „deocamdată”: o va revedea; textul întreg în `docs/spec.md`, secțiunea 9). Blocaj: un începător nu poate termina sesiunea, date,
    securitate sau lege expuse, jocul învață ceva ce ghidurile contrazic, o verificare e stricată. Major: încurcă sau
    încetinește mulți începători pe drumul principal, o cerință e făcută doar parțial, o regulă a domeniului e încălcată
    pe unele ecrane, lățimi sau într-o limbă, sau face probabile defectele. Minor: restul. Nota: 10 fără nicio
    constatare; 9 fără blocaj și fără major, toate cerințele domeniului cu dovezi; 8 fără blocaj, 1–3 majore; 7 mai multe
    majore; 5–6 cel puțin un blocaj; 3–4 mai multe blocaje; 1–2 inutilizabil, nesigur sau ilegal. Înainte de versiunea
    1 se repară doar blocajele și majorele. Runda finală notează toți evaluatorii după grila asta.

## Ce decurge tehnic din decizii
- Clasamentul public cere ca răspunsurile să fie verificate de server: motorul rulează în Worker, iar pagina nu primește
  răspunsurile.
- Pragul 9/10 pe text se aplică la două limbi (un editor și pentru engleză), plus un evaluator de fidelitate față de
  ghidurile oficiale.
- Jocul are directorul web al subdomeniului `twopizzas.faigo.ro`, separat de cel al site-ului firmei: cele două fluxuri
  de publicare pot fi active amândouă. Pe gazdă trebuie creat subdomeniul și directorul lui (proprietarul), iar în
  rețeaua din fața gazdei subdomeniul trebuie să treacă prin aceeași zonă, ca rutele `/api/room*` ale serverului de
  camere să-l prindă.
- Secretele de publicare se adaugă în acest repo de către proprietar, înainte de publicare. Repo-ul fiind public,
  niciun nume de gazdă, cont sau furnizor nu se scrie în cod, în documente sau în fluxuri: vin doar din secrete și
  variabile.

## Planul de construcție (pachete de lucru)
1. Motor: tipuri și protocol, generatoarele de tasks, nume de echipă (`core/`), cu teste.
2. Motor: mașina de stări Scrum, vederile pe jucător, observațiile, scorul.
3. Motor: regulile Kanban în aceeași mașină.
4. Server: `Room`, `Leaderboard`, limite, teste, workflow de deploy.
5. Design: sistemul vizual și componentele, cu o pagină de probă.
6. Client: conexiune, lobby, i18n, mod local; apoi ecranele Scrum; apoi ecranele Kanban; apoi turul, rezumatul,
   clasamentul, textul de confidențialitate și linkurile.
7. Verificări: joc întreg în browser pe trei pagini, evaluatorii, documentația.
8. Sesiunea de probă cu oameni reali (proprietarul), apoi evaluatorii 9/10, apoi publicarea.

## Evaluarea de securitate a serverului (16 noiembrie 2026): 5/10 la prima trecere

Punctele 1–3, 5 și 6 de mai jos sunt reparate și verificate (deciziile sunt în `docs/spec.md`, secțiunea 10); a doua
evaluare este în curs.

Făcută de un evaluator independent pe `worker/`, `core/`, antetele paginii și fluxurile de publicare. Fără scurgeri în
vederile jucătorilor la 540.000 de acțiuni aleatoare; parserul, identitatea locurilor, ștergerea camerelor și jurnalele
au fost găsite corecte. De reparat înainte de a doua evaluare (pragul este 9/10):

1. **Grav: seed-ul camerei are 32 de biți și se poate afla din numele echipei**, iar din seed ies toate răspunsurile
   (dovedit: 126 de secunde pe 8 fire). Decizie: secret de cel puțin 128 de biți generat de server, derivare cu
   SHA-256 pentru fiecare element (flux de numere din hash cu contor, nu generator de 32 de biți), nume de echipă
   dintr-o valoare aleatoare separată.
2. **Codul camerei e singura protecție și ghicirea lui nu e limitată.** Decizie: limită de conexiuni WebSocket pe
   adresă, conexiunile fără `hello` se închid după câteva secunde și nu ocupă locuri, gazda poate scoate un jucător
   din lobby. Codul rămâne de cinci litere (se spune cu voce tare).
3. **Cost:** mesajele refuzate rescriu starea; clasamentul trece de fiecare dată printr-un singur obiect. Decizie: se
   scrie doar când starea s-a schimbat; lista se ține 60 de secunde în memorie.
4. **Un singur om poate juca toate locurile și urca un scor.** Decizie: acceptat și spus deschis; clasamentul e de
   plăcere, nu dovedește nimic despre câți oameni au jucat. Verificatorul vede tot puzzle-ul fiindcă asta îi e rolul.
5. **Mărimea se vede parțial înainte de planning poker** (câți lucrători cere un element). Decizie: numărul de
   lucrători se arată abia după ce elementul a fost început.
6. **Mărunte:** două file pe același loc se înlocuiesc la nesfârșit (clientul nu se mai reconectează la codul 4000);
   fără ping, un loc rămâne „conectat” până la două ore; verificarea lungimii înainte de citire; caractere invizibile
   în nume; `ALLOWED_ORIGINS` implicit gol; jurnalele platformei oprite explicit.
7. **Pagină și publicare** (reparat și verificat, 16 noiembrie): politica fără `'unsafe-inline'`, cu hash-uri
   calculate la build (jucat în browser sub politica nouă, fără nicio încălcare); fluxurile separă build-ul (fără
   secrete) de publicare. Fluxurile nu au rulat încă pe GitHub.
8. **Textul de confidențialitate nu se potrivește cu codul în trei locuri:** lista publică ține și framework-ul,
   defectele scăpate și cycle time; limba și tema stau în `localStorage`; adresa e folosită pentru limita de cereri.
   Se corectează la trecerea de texte, apoi îl aprobă proprietarul.

## Evaluarea de fidelitate față de ghiduri (16 noiembrie 2026): 7/10

Făcută de un evaluator independent pe toate textele și pe regulile jocului, față de Scrum Guide (2020), Kanban Guide
(v2025.5) și Manifestul Agile. Duratele și scopurile evenimentelor sunt corecte; raportul întreg este în
`.qa/reviews/fidelity-2026-11-16.md`. Acceptate toate, de aplicat la trecerea de texte:

1. **Sprint-ul apare doar ca faza de lucru.** În ghid, Sprint-ul conține toate celelalte evenimente. Cartonașul se
   reformulează, iar Sprint-ul intră și pe fișa de rezumat.
2. **„Soft timebox: puteți depăși.”** În Scrum un eveniment se încheie în timebox; textul spune că doar jocul lasă
   ceasul să meargă.
3. **Product Owner „acceptă sau respinge”.** Ghidul nu are un pas de acceptare. Mecanica rămâne, dar e numită a
   jocului: „Răspuns corect” / „Răspuns greșit (escaped defect)”. Se spune o dată că în viața reală Product Owner e
   un om, prezent în Sprint și la Retrospective.
4. **„Trei roluri”** devine „trei accountabilities”, cum le numește ghidul.
5. **Kanban, runda 1 „fără limite”** se prezintă ca imaginea de „înainte”, pusă intenționat; Kanban cere controlul WIP.
6. **Practici nespuse la locul lor:** nota „nu e în ghid” iese din zona pliată și apare pe ecranul de planning poker,
   la velocity și la acordul cu WIP limit în Scrum; rolurile din Kanban și ceasul rundei sunt numite ale jocului;
   „demo” nu mai e dat ca nume al Sprint Review.
7. **Formulări vechi:** „commit” devine „selectat”; „pull” în Scrum devine „select”.
8. **Simplificări de încadrat:** Sprint Goal este un obiectiv, nu o listă (se reformulează și se spune că lista e felul
   jocului de a-l măsura); Definition of Done se explică în cuvintele jocului; Scrum Master apasă butoanele pentru
   deciziile Developers; Daily Scrum are loc zilnic în viața reală.
9. **Kanban:** se adaugă cele trei practici, definirea fluxului de către echipă și Service Level Expectation; textele
   metricilor urmează definițiile ghidului.

## După versiunea 1 (minore notate de evaluatori, nereparate intenționat, decizia 27)
- Securitate (`.qa/reviews/security-2026-11-19-final.md`): limitele pe adresă cu cheie IPv6 /64; închiderea unui
  socket după încălcări repetate ale ritmului; testul de scurgeri din joc aleator mai strict (rezultatul pe element,
  metricile de dinainte de dezvăluire); `persist-credentials: false` și urmărirea dependențelor în CI;
  `X-Content-Type-Options` pe răspunsurile JSON ale serverului.
- Design (`.qa/reviews/design-usability-2026-11-19-fifth.md`): Pauza și Ieșirea pe desktop arată ca text simplu;
  „Ia” e scurt în română; spațiere sub „Greșeala tipică” la retrospectivă.
- Utilizatori (`.qa/reviews/user-triage-2026-11-19.md`): „Înainte” apare doar în bara de jos după sarcină; backlogul
  grupat pe teme; link de cameră pe lângă cod; durata rundelor Kanban, de urmărit în sesiunea cu oameni.
- Mărimea paginii: JS 451 kB față de bugetul de 455 kB (D-116); împărțirea pachetului JS.
- Fidelitate (`.qa/reviews/fidelity-2026-11-19-final.md`, cu text EN și RO): nota din agenda lobby-ului pentru Kanban;
  regula verificării în turul Scrum; glosele Sprint Backlog și Increment; „oricine poate selecta”; cine alege Sprint
  Goal pe cardul de planificare; „ar trebui” la practicile Kanban; exemplul de acțiune din turul Scrum.
- Cod (`.qa/reviews/code-architecture-2026-11-19-final.md`): `key()` fără verificare pentru 82 de chei dinamice; un
  error boundary în client și `try/catch` în transporturile locale; `RoomHandler.load` marchează încărcat înainte de
  citire; `plan.pull`/`plan.unpull` scrise de două ori; bugetele de timp din benchmark; ciornele șterse și la
  înlocuirea transportului; D-id-uri în mai multe teste.
- Limbă (`.qa/reviews/language-2026-11-19-final.md`, cu textul exact): formele cu „-ul” în câteva chei, „ședințele” în
  `kanban.metric.age.text`, `tour.limit.title`, `tour.showTask`, `lobby.agenda.note` în română, „datelor date de tine” în
  `privacy.p7`, două formulări redundante în engleză.

## Rămase pe lista proprietarului
- Redenumirea folderului local, doar între sesiuni (pe GitHub repo-ul este deja `faigo-devs/TwoPizzas`).
- Secretele și variabilele de publicare în repo, înainte de publicare. Secrete: `FTP_HOST`, `FTP_USER`,
  `FTP_PASSWORD`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. Variabile: `FTP_REMOTE_DIR`, `SITE_URL`,
  `SITE_HOSTS`, iar la final `PUBLISH_ENABLED=true`. Mediul `production` se creează în setările repo-ului.
- Cine joacă sesiunea de probă (3–6 începători) și când.
- Textul de confidențialitate, înainte de publicare (îl propune echipa, îl aprobă proprietarul).
- O regulă în rețeaua din fața gazdei care scoate antetul de răspuns ce numește panoul gazdei (fișierul de
  configurare din repo nu îl mai numește, fiindcă repo-ul e public).

## La final: reclonare în `repos/TwoPizzas`
Proprietarul reclonează repo-ul în `repos/TwoPizzas` (lângă `repos/LGTM`) când totul e gata, testat și notat cu cel puțin
9/10 de toți evaluatorii. Înainte: testul pentru serverul real și rapoartele finale ale evaluatorilor se mută din
`.qa/` (ignorat de git) în repo (`scripts/` și `docs/reviews/`); tot se commite și se face push; se verifică pe GitHub
ultimul commit; abia apoi reclonare, `npm install` la rădăcină și în `worker/`, și ștergerea folderului vechi.

## Reguli de lucru convenite
- Răspunsuri scurte în chat, în română; întrebările cu mai multe variante se pun în dialogul interactiv.
- Fără nume de persoane, emailuri sau mențiuni în texte, commit-uri sau documente.
- Cel mult doi agenți odată, cu sarcini înguste; verificările deterministe se rulează direct.
- Niciun fapt inventat despre firmă; nimic despre Scrum sau Kanban care nu se sprijină pe ghidurile oficiale.
