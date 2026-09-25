/* enhed.js — enhedsvalget huskes fra side til side (L60, udvidet af JPK
   1. sep 2026: "gennemgaaende paa hele websiden, og valget skal huskes").

   P0 (assets/katalog.js:1-17) staar uroert:

     "Uden JavaScript er siden SAND, men statisk. Med JavaScript bliver den
      PRAECIS. JavaScript maa forbedre sandheden; den maa aldrig vaere
      forudsaetningen for den."

   Konkret her: SELVE SKIFTET er ren CSS. `.enhedsskift__boks` er en rigtig
   <input type="checkbox">, og `.typeskilt .enhedsskift__boks:checked ~ *
   .enhedsvis--imperial` bytter figurerne ud uden en linje JavaScript. Slaar
   man JS fra, virker omskifteren stadig paa den side, man staar paa - den
   husker bare ikke til naeste side. Denne fil tilfoejer UDELUKKENDE
   hukommelsen. Den maa aldrig blive det, der faar tallene til at skifte.

   INGEN NETVAERKSKALD, ingen cookies, ingen tredjepart - samme forudsaetning
   som resten af sitet (siden skal kunne aabnes med file://). Valget ligger i
   localStorage, som er pr. browser og pr. oprindelse og aldrig forlader
   maskinen.

   INDLAEST SYNKRONT, umiddelbart efter kontakten (se robot.mjs'
   enhedsHukommelse()). Det er med vilje: koerte filen med `defer`, ville
   browseren naa at tegne de metriske tal, og en laeser med imperialt valg
   ville se siden blinke. Her er kontakten i DOM'en, og resten af siden er
   ikke tegnet endnu. */
(function () {
  'use strict';

  var NOEGLE = 'quad.enhed';
  var IMPERIAL = 'imperial';
  var METRISK = 'metrisk';

  /* localStorage kaster i Safaris private tilstand og naar en browser er sat
     til at blokere lager - ikke returnerer null, KASTER. Et ubeskyttet opslag
     ville stoppe hele filen, og med den enhver senere linje. Begge veje er
     derfor pakket ind, og begge falder tilbage til "husk ingenting": siden er
     stadig sand, den er bare ikke laengere praecis. */
  function laes() {
    try { return window.localStorage.getItem(NOEGLE); } catch (fejl) { return null; }
  }
  function skriv(v) {
    try { window.localStorage.setItem(NOEGLE, v); } catch (fejl) { /* husker ikke */ }
  }

  var boks = document.getElementById('enhedsskift');
  if (!boks) return;

  // Den gemte tilstand saettes FOER browseren tegner tallene. Kun 'imperial'
  // taender: enhver anden vaerdi - null, en aeldre nogle, noget haandredigeret
  // - lander paa metrisk, som er sidens standardtilstand og den, HTML'en
  // allerede staar i. En ukendt vaerdi maa aldrig kunne vise en tilstand,
  // ingen har valgt.
  if (laes() === IMPERIAL) boks.checked = true;

  boks.addEventListener('change', function () {
    skriv(boks.checked ? IMPERIAL : METRISK);
  });

  /* Samme valg i to faneblade. `storage` fyrer KUN i de ANDRE faneblade paa
     samme oprindelse - aldrig i det, der skrev - saa der er ingen sloejfe at
     bryde. Uden den ville to aabne robotsider vise hver sin enhed, indtil den
     ene blev genindlaest, og laeseren ville have to modstridende svar paa
     skaermen samtidig. */
  window.addEventListener('storage', function (h) {
    if (h.key !== NOEGLE) return;
    boks.checked = h.newValue === IMPERIAL;
  });
}());
