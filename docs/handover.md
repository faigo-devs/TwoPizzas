# Predare: Two Pizzas (actualizat 15 noiembrie 2026)

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
- În lucru: clientul, partea a doua (board, task deschis, Daily Scrum) și partea a treia (Review, Retrospective,
  rezumat, clasament).
- Nu există încă: ecranele de lucru (board, task deschis, cele patru puzzle-uri pe roluri), daily, review,
  retrospectivă, rezumat și clasament; ecranele Kanban; turul de unul singur; fluxurile de publicare; scriptul de
  verificare a build-ului (`scripts/`); proba în browser a unui joc întreg pe trei pagini.
- Nimic nu este publicat. Pe www.faigo.ro rulează site-ul firmei, din repo-ul lui.
- Primul push în `faigo-devs/TwoPizzas` este făcut (istoria locală unită cu commit-ul inițial creat de GitHub).

## Pașii următori, în ordine
1. Commit pentru ce e verificat (motor Kanban, client până la Sprint, redenumire, documente).
2. Client, partea a doua: board, task deschis cu cele patru puzzle-uri (om singur, pereche, reviewer, „info you hold”),
   schimbarea de context, Daily Scrum. Pe telefon, ce trebuie făcut apare înaintea board-ului.
3. Client, partea a treia: Sprint Review, Sprint Retrospective (note, „Nu știu ce să scriu”, voturi, acord), comparația
   celor două iterații, rezumatul tipăribil, clasamentul.
4. Ecranele Kanban (Replenishment, limite WIP, cereri care sosesc, Delivery review cu cele patru metrici și graficul).
5. O trecere de texte: formulări pentru id-urile noi din Kanban (observații, ajutor, refuzuri prin limită), fraza din
   confidențialitate despre limba și tema ținute minte în browser, variantele Kanban ale observațiilor.
6. Turul de unul singur (modul local), `scripts/check-dist.mjs`, fluxurile de publicare (fără nume de gazdă: doar din
   secrete și variabile), politica de securitate a paginii cu `wss://` pentru site.
7. Proba în browser: un joc Scrum și unul Kanban întregi, pe trei pagini, cu serverul local.
8. Evaluatorii independenți (design, română, engleză, fidelitate față de ghiduri, utilizare, securitatea serverului),
   apoi sesiunea de probă cu oameni, apoi publicarea, doar cu acordul proprietarului.

De aprobat de proprietar: textul de confidențialitate (`privacy.*` din `app/i18n`), prezentat lui pe 15 noiembrie.

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
    unealtă pentru programatori (întunecat implicit, mai colorat, mai jucăuș); FAIGO rămâne doar în subsol.
14. **Publicare.** Nimic până când versiunea aceasta e gata; până atunci pe server rămâne site-ul firmei. Ordinea: o sesiune de probă
    cu 3–6 începători reali și 3 întrebări la final → reparat ce i-a încurcat → evaluatorii 9/10 → publicare. La
    publicare se opresc cele două Worker-e vechi (`/api/contact`, `/api/scan`); codul lor rămâne în repo.

15. **Repo separat, public, open source.** Jocul se construiește în repo-ul lui, `faigo-devs/TwoPizzas`, nu în repo-ul
    site-ului. Asistentul este proprietarul tehnic și întreținătorul pe termen lung al codului și lucrează ca
    orchestrator al unei echipe de agenți.

## Ce decurge tehnic din decizii
- Clasamentul public cere ca răspunsurile să fie verificate de server: motorul rulează în Worker, iar pagina nu primește
  răspunsurile.
- Pragul 9/10 pe text se aplică la două limbi (un editor și pentru engleză), plus un evaluator de fidelitate față de
  ghidurile oficiale.
- Jocul și site-ul firmei pot urca în același director web al gazdei: un singur flux de publicare activ odată. Cât timp
  LGTM nu e publicat, fluxul de publicare de aici nu există sau e dezactivat; la publicare se dezactivează cel al
  site-ului și se opresc serviciile lui care nu mai au pagini.
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

## Rămase pe lista proprietarului
- Redenumirea folderului local, doar între sesiuni (pe GitHub repo-ul este deja `faigo-devs/TwoPizzas`).
- Secretele și variabilele de publicare în repo, înainte de publicare. Secrete: `FTP_HOST`, `FTP_USER`,
  `FTP_PASSWORD`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. Variabile: `FTP_REMOTE_DIR`, `SITE_URL`,
  `SITE_HOSTS`, iar la final `PUBLISH_ENABLED=true`. Mediul `production` se creează în setările repo-ului.
- Cine joacă sesiunea de probă (3–6 începători) și când.
- Textul de confidențialitate, înainte de publicare (îl propune echipa, îl aprobă proprietarul).
- O regulă în rețeaua din fața gazdei care scoate antetul de răspuns ce numește panoul gazdei (fișierul de
  configurare din repo nu îl mai numește, fiindcă repo-ul e public).

## Reguli de lucru convenite
- Răspunsuri scurte în chat, în română; întrebările cu mai multe variante se pun în dialogul interactiv.
- Fără nume de persoane, emailuri sau mențiuni în texte, commit-uri sau documente.
- Cel mult doi agenți odată, cu sarcini înguste; verificările deterministe se rulează direct.
- Niciun fapt inventat despre firmă; nimic despre Scrum sau Kanban care nu se sprijină pe ghidurile oficiale.
