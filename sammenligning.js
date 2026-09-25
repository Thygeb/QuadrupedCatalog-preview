/* sammenligning.js — felt-for-felt-tabel til /sammenligning/.
   FORBEDRER kun: uden JS staar tegnforklaringen, "Vaelg robotter"-linket til
   kataloget og en flad robotliste med links (server-renderet i
   tools/skabelon/sammenligning.mjs). Med JS erstattes den flade liste af en
   dynamisk felt-for-felt-tabel - samme "skjult, indtil JS taender det"-
   idiom som katalog.js' soegefelt.

   SPOR/SAML2 (JPK 1. sep 2026): filen havde foer sin EGEN vaelger
   (afkrydsningsfelter + soegefelt, samme .filtre-sprog som katalogets
   facetter). Den er FJERNET - kataloget er nu det ene sted, man vaelger
   robotter. Denne fil laeser stadig udvalget fra localStorage
   (`SAML_NOEGLE`, delt med katalogets samlknapper), men SKRIVER det ikke
   laengere: siden er ren visning, ikke betjening. Se `udvalgtSlugs()` og
   `fraKataloget()` nedenfor for de to mekanismer, der traadte i stedet.

   Data laeses fra et <script type="application/json"> i selve dokumentet,
   ALDRIG med fetch() - se tools/skabelon/sammenligning.mjs' begrundelse:
   file://-CORS ville braekke netop denne side, som skal virke uden en
   server. Ingen cookies, ingen netvaerkskald, ingen tredjepart. */
(function () {
  'use strict';

  var app = document.querySelector('[data-sammenligning]');
  var dataEl = document.getElementById('sammenligning-data');
  if (!app || !dataEl) return;

  var DATA;
  try { DATA = JSON.parse(dataEl.textContent); } catch (fejl) { return; }
  if (!DATA || !DATA.robotter || !DATA.robotter.length) return;

  var lang = document.documentElement.lang === 'en' ? 'en-GB' : 'da-DK';
  var nf = (window.Intl && Intl.NumberFormat) ? new Intl.NumberFormat(lang, { maximumFractionDigits: 3 }) : null;
  function fmt(n) { return nf ? nf.format(n) : String(n); }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function robotAf(slug) {
    for (var i = 0; i < DATA.robotter.length; i++) {
      if (DATA.robotter[i].slug === slug) return DATA.robotter[i];
    }
    return null;
  }

  // spor/hjultype (25. sep 2026, L147/S-H4): FELT_ANTAL var FoeR et fast tal
  // (33) for ALLE typer. En type med et applies=false-felt (fx
  // humanoid_wheeled, trappetrin_kontinuerlig) har en LAVERE naevner -
  // DATA.naevnerPrType[type] baerer den, bygget server-side af
  // naevnerForType() (samme kilde som robotsidens taethedsblok). Falder
  // tilbage til det gamle, faste tal, naar typen mangler i kortet (aeldre
  // JSON, eller en type uden gyldighedsdata - fail open, samme regel som
  // resten af sitet).
  var FELT_ANTAL_FALDBACK = Object.keys(DATA.feltNavne).length;
  function feltAntalFor(robottype) {
    var pr = DATA.naevnerPrType || {};
    return (robottype && pr[robottype] !== undefined) ? pr[robottype] : FELT_ANTAL_FALDBACK;
  }
  function taethedTekst(a, robottype) {
    return String(DATA.tekst.taethed_skabelon).replace('{a}', a).replace('{b}', feltAntalFor(robottype));
  }

  /* INTERIM UDEN synligt maerke (JPK 27. aug 2026): samme rettelse som
     side.mjs' fnote() - teksten staar stadig i title OG i .kunskaerm, kun
     den altid-synlige stjerne er fjernet, indtil D14's gyldigheds-niveauer
     er flettet og et designet maerke kan saettes ind. */
  function fnote(tekst) {
    return '<abbr class="forbehold--skjult" title="' + esc(tekst) + '">'
      + '<span class="kunskaerm">' + esc(DATA.tekst.advarsel) + ': ' + esc(tekst) + '</span></abbr>';
  }

  /* Talvaerdien: operator (set OG hoert - regel 4), figur, enhed, og et
     samlet forbeholdstegn af ved_last + advarsel (samme sammenlaegning som
     side.mjs' tal() bruger til den kompakte visning, som mockuppens egen
     sammenligningstabel ogsaa bruger - se sammenligning.mjs' filhoved). */
  /** Figuren som TEKST - ét tal eller et interval. Den samme form, side.mjs'
      tal() bygger (`nformat(min)–nformat(maks)`), og derfor ogsaa den form,
      `imperialPost()`s `kildeform` er skrevet i: samme en-tankestreg, samme
      Intl-indstillinger (maximumFractionDigits: 3). Det er dét, der lader
      "omregnet"-maerkets forklaring nedenfor bygges her i stedet for at skulle
      sendes med i JSON'en for hvert af de 565 felter. */
  function figurAf(v, min, maks) {
    return (min !== null && min !== undefined)
      ? fmt(min) + '–' + fmt(maks)
      : (typeof v === 'number' ? fmt(v) : String(v));
  }

  function vaerdiSpan(figur, enhed, nul, op) {
    return '<span class="v v-tal' + (nul ? ' v-nul' : '') + '">' + op
      + '<b class="num">' + esc(figur) + '</b>'
      + (enhed ? '<span class="enhed">' + esc(enhed) + '</span>' : '')
      + '</span>';
  }

  /* Maerket, der skiller VORES omregning fra producentens eget imperiale tal
     (regel 2). Ordret samme opbygning som side.mjs' omregningsMaerke():

       - producentens eget tal (`imp.egen`, 30 felter i datasaettet) faar
         INTET synligt maerke, kun en linje til skaermlaeseren. Det sjaeldne
         skal ikke vaere det umaerkede, men et maerke paa 535 af 565 felter
         ville drukne matricen; fravaeret forklares i omskifterens egen note.
       - vores omregning fik indtil 3. sep 2026 `.omregnet` med ordet
         "omregnet"/"converted" synligt i cellen. DET MAERKE ER VAEK (JPK:
         "forklaringslinjen oeverst goer det alene"). Maalt foer: 11 synlige
         maerker i matricen ved tre plader i imperial visning.

     DET ER IKKE EN NY BESLUTNING - det er den samme, JPK traf 2. sep 2026 i
     spor/uifix punkt 2, som robotsiden allerede har udfoert: se
     tools/skabelon/side.mjs' omregningsMaerke(), hvor det synlige maerke er
     erstattet af en .kunskaerm-linje af noejagtig samme form som
     imp.egen-grenen. Maerkeklassen staar 0 gange paa en bygget robotside og
     bevogtes af test 62.2.a. Matricen blev bare ikke rettet med.
     (Klassenavnet skrives med vilje IKKE ordret her: denne fil kopieres
     raat til dist/, saa et grep efter maerket i den byggede side ville
     ellers finde min kommentar og melde 1 i stedet for 0.)

     BEGGE grene er nu .kunskaerm, saa en skaermlaeser hoerer praecis som foer,
     hvilken oprindelse tallet har. Haard begraensning 2 mister ingenting:
     forskellen mellem producentens tal og vores omregning staar stadig i
     forklaringslinjen over matricen (enhed_skift_forklaring) og i hver
     enkelt celles skjulte tekst.

     Forklaringen bygges af det METRISKE felt - "33,8 kg" - som er praecis
     det, `imperialPost()` server-side kalder `kildeform`. */
  function omregnetHTML(f, imp) {
    if (imp.egen) return '<span class="kunskaerm">' + esc(DATA.tekst.imperial_forklaring || '') + '</span>';
    var kilde = (figurAf(f.vaerdi, f.min, f.maks) + ' ' + (f.enhed || '')).replace(/\s+$/, '');
    var forklaring = String(DATA.tekst.enhed_omregnet_forklaring || '').replace('{figur}', kilde);
    return '<span class="kunskaerm">' + esc(forklaring) + '</span>';
  }

  function renderTal(f) {
    var op = '';
    if (f.operator && DATA.operatorer[f.operator]) {
      var o = DATA.operatorer[f.operator];
      op = '<span class="op" aria-hidden="true">' + esc(o.vis) + '</span>'
        + '<span class="kunskaerm">' + esc(o.laest) + ' </span>';
    }
    var noter = [];
    if (f.ved_last) {
      if (f.ved_last.ukendt) noter.push(DATA.tekst.ved_last_ukendt);
      else noter.push((DATA.tekst.ved_last + ' ' + fmt(f.ved_last.vaerdi) + ' ' + (f.ved_last.enhed || '')).trim());
    }
    if (f.forbehold) noter.push(f.forbehold);
    // Forbeholdstegnet staar UDEN FOR begge enhedstvillinger og bliver derfor
    // staaende i begge tilstande. Det er den rigtige adfaerd og gratis her,
    // hvor side.mjs maa foere `ved_last` over i sit rekursive kald: et
    // forbehold om selve MAALINGEN ("ved last 20 kg") gaelder tallet, ikke
    // den enhed, det er skrevet i.
    var noteHTML = noter.length ? fnote(noter.join(' · ')) : '';

    var metrisk = vaerdiSpan(figurAf(f.vaerdi, f.min, f.maks), f.enhed, f.tilstand === 'nul', op);
    // spor/enheder (K9) omregner visse felter til sidens faelles enhed;
    // `f.kildeform` (sat i sammenligning.mjs' dataBlok()) er producentens
    // egen figur+enhed. Samme title, samme i18n-noegle, samme placering
    // (uden om et eventuelt forbeholdstegn) som robot.mjs allerede bruger -
    // genbrugt moenster, ikke et nyt, se robot.mjs's kommentar ved
    // "original-enhed".
    //
    // REGEL 3: den saettes ALDRIG paa den imperiale tvilling. Dér ville
    // "Producenten skrev: 1100 mm" staa som forklaring paa VORES omregning,
    // og en omregning har ingen kilde. Samme `!__imperial`-vagt som
    // side.mjs:1151.
    if (f.kildeform) {
      var titel = String(DATA.tekst.kilde_original_form || '').replace('{figur}', f.kildeform);
      metrisk = '<span class="original-enhed" title="' + esc(titel) + '">' + metrisk + '</span>';
    }

    /* --- de to figurer (spor/samlenhed) ---------------------------------
       `f.imp` er FORUDBEREGNET af tools/skabelon/sammenligning.mjs gennem
       side.mjs' `imperialPost()` - den samme funktion, robotsiden bruger.
       Denne fil regner IKKE: der er ingen omregningstabel her, ingen kopi af
       afrundingsreglen, og ingen kopi af regel 1 ("producentens eget tal
       vinder"). Se skabelonens `imperialFelt()` for hvorfor den vej blev
       valgt frem for en tabel i browseren.

       Begge figurer staar i markup'en; CSS viser én ad gangen, praecis som
       paa robotsiden (`.enhedsvis{display:contents}`). Matricen behoever
       derfor ikke tegnes om, naar laeseren skifter enhed - og den METRISKE
       visning er noejagtig den, der stod her foer, fordi `display:contents`
       ikke laegger en kasse ind.

       NUL-TILSTANDEN AFGOERES PAA NY for den imperiale figur: 0 °C er 32 °F.
       Otte felter i datasaettet er `temp_min: 0 °C`, og `v-nul` paa "32 °F"
       ville baade vaere forkert og laese som nul-tilstanden (haard
       begraensning 5). Samme udledning som side.mjs' `post.vaerdi === 0`,
       taget paa den post, der faktisk vises. */
    if (!f.imp) return metrisk + noteHTML;
    var imp = f.imp;
    var impFigur = figurAf(imp.vaerdi, imp.min, imp.maks);
    var imperial = vaerdiSpan(impFigur, imp.enhed, imp.vaerdi === 0, op) + omregnetHTML(f, imp);
    return '<span class="enhedsvis enhedsvis--metrisk">' + metrisk + '</span>'
      + '<span class="enhedsvis enhedsvis--imperial">' + imperial + '</span>'
      + noteHTML;
  }

  /* Ét felt, de samme fire datatilstande som resten af sitet
     (system.css §8) - kun bygget her af JS i stedet for af side.mjs' egne
     tal()/tilstand(). Se tools/skabelon/sammenligning.mjs' feltVisning(). */
  function renderFelt(f) {
    if (!f) f = { tilstand: 'ikke_oplyst' };
    var forbeholdHTML = f.forbehold ? fnote(f.forbehold) : '';
    switch (f.tilstand) {
      case 'nej':
        return '<span class="v v-nej"><i class="mrk"></i>' + esc(DATA.tekst.nej) + '</span>' + forbeholdHTML;
      case 'ja':
        return '<span class="v v-ja"><i class="mrk"></i>' + esc(DATA.tekst.ja) + '</span>' + forbeholdHTML;
      case 'kun_billede':
        return '<span class="v v-billede"><i class="mrk"></i><span class="ord">' + esc(DATA.tekst.kun_billede) + '</span></span>' + forbeholdHTML;
      case 'tekst': {
        var ud = '<span class="v v-tekst">' + esc(f.tekst) + '</span>';
        if (f.min !== null && f.min !== undefined) {
          // `imp` foeres med: et tekstfelt med et maalbart interval ved siden
          // af (Spots "ureguleret DC 35-58,8 V") skal skifte enhed som ethvert
          // andet interval. MAALT 1. sep 2026: NUL af de 565 omregnelige
          // felter staar i tilstanden 'tekst' i dag - linjen er der, for at
          // det ikke er en tavs mangel, den dag et af dem gOEr.
          ud += ' ' + renderTal({ tilstand: 'tal', vaerdi: null, min: f.min, maks: f.maks, enhed: f.enhed, operator: null, imp: f.imp });
        }
        return ud + forbeholdHTML;
      }
      case 'tal':
      case 'nul':
        return renderTal(f);
      case 'ikke_oplyst':
      default:
        return '<span class="v v-ikke"><i class="mrk"></i>' + esc(DATA.tekst.ikke_oplyst) + '</span>' + forbeholdHTML;
    }
  }

  /* Aa54: matricen er en RIGTIG tabel, ikke et div-gitter.
     Foer stod hver vaerdi i et <div class="saml-raekke__celle"> uden nogen
     relation til robotnavnet i toppen. En skaermlaeser fik 90 loese
     tekstklumper; "1,5 m/s" kunne ikke knyttes til hverken feltet eller
     robotten. Sammenligning ER sidens kerneopgave, saa den relation er ikke
     pynt - den er indholdet.

     TO TING GOER DET IKKE-TRIVIELT, og begge er loest her:

     1. UDSEENDET MAA IKKE FLYTTE SIG (D15 laaste paletten, L40 valgte
        INSTRUMENT). Layoutet er et CSS-grid via --n. Loesningen er derfor
        rigtige tabelelementer, hvor CSS'en saetter display:grid/block
        ovenpaa - samme gitter, ny semantik. Se generator.css.

     2. AT AENDRE `display` PAA ET TABELELEMENT FJERNER DETS ROLLE i
        browserens tilgaengelighedstrae. Det er den klassiske faelde ved
        "display:grid paa en <table>": markup'en ser rigtig ud i kilden, og
        skaermlaeseren faar alligevel ingen tabel. Derfor staar de eksplicitte
        ARIA-roller (role="table"/"rowgroup"/"row"/"columnheader"/
        "rowheader"/"cell") ved siden af de native elementer - baelte OG
        seler. De koster ~1,2 KB i den tegnede streng og er den eneste maade
        at gaa god for semantikken paa uden en styrbar browser at maale i.
        Af samme grund har <caption> et id, som <table aria-labelledby>
        peger paa: caption->navn-relationen er lige saa udsat som resten. */
  var CAPTION_ID = 'saml-tabel-caption';

  /* Enhedskontaktens id. SAMME streng som tools/skabelon/sammenligning.mjs'
     ENHED_ID, robot.mjs' ENHED_ID og opslaget i assets/enhed.js - det er den
     ene noegle, der lader valget foelge laeseren fra en robotside hertil.
     tests/dele/44-samlenhed.mjs holder de fire steder sammen. */
  var ENHED_ID = 'enhedsskift';
  var enhedsBoks = document.getElementById(ENHED_ID);
  var sidsteOmregnelige = 0;

  /* Specimen-raekken: signaturelementet mockuppen viser oeverst (de valgte
     robotter side om side, foer laeseren ser et eneste tal). Fotografiet er
     UDELADT her (dokumenteret afvigelse, fund/arkiv/2026-08/FUND-lysbyg.md) - at indlejre
     alle 62 robotters billedmarkup (picture/source/alt/delt-maerke) i den
     samme JSON-blok var uforholdsmaessigt for et JS-lag, der kun forbedrer
     en side, som allerede virker uden det.

     Aa54: raekken er nu tabellens <thead>, og hvert specimen-kort er et
     <th scope="col">. Robotnavnet er dermed det, en skaermlaeser laeser op
     som kolonneoverskrift foran hver eneste vaerdi nedenunder.
     Hjoernecellen er et TOMT <td> (ikke et <th>): et <th> uden indhold
     ville taelle med som en kolonneoverskrift uden kolonne. */
  /* Maerkatfotoet i kolonnehovedet. Data er stier + alt-tekst, sat af
     sammenligning.mjs' fotoPost() - se dens kommentar for hvorfor der ikke
     ligger faerdig markup i JSON'en.

     `object-fit:contain` i CSS'en, ikke cover: chippen er 74x56, og et
     produktfoto i et andet sideforhold ville faa poter og sensorer skaaret
     af. Her er intet at vinde ved beskaering - fotoet skal kun sige HVILKEN
     maskine spalten er.

     Mangler fotoet, tegnes den stiplede ikke-oplyst-plade i stedet for en
     tom kasse: en tom kasse ser ud som en indlaesningsfejl, og
     "ingen brugbar optagelse" er en aerlig tilstand (maalt: 1 af 77).

     DEN TOMME PLADE, IKKE EN TOM STIPLET FIRKANT (spor/da6-rettelser R7d,
     24. sep 2026). DA6 saa MOVENEW P2's chip som "en tom stiplet firkant
     uden tekst": en moerk flade med stiplet kant, ordet skjult. Nu er det
     sitets egen komponent (DESIGN.md «Den tomme plade»), i 404-sidens og
     samlingskortets variant uden .hoved: lys --tom-flade, stiplet ramme og
     det skraverede ikon - samme tegn som paa katalogkortet. Ordet bliver
     skaermlaeserens; paa 74 x 56 er der ikke plads til det i skriftgulvet. */
  function fotofeltHTML(r) {
    var f = r.foto;
    if (!f) {
      return '<span class="saml-fotofelt saml-fotofelt--uoplyst"><span class="intetfoto">'
        + '<span class="plade" aria-hidden="true"></span>'
        + '<span class="saml-fotofelt__ord">' + esc(DATA.tekst.billede_intet) + '</span></span></span>';
    }
    var kilder = '';
    for (var i = 0; i < (f.kilder || []).length; i++) {
      kilder += '<source srcset="' + esc(f.kilder[i][0]) + '" type="' + esc(f.kilder[i][1]) + '">';
    }
    return '<span class="saml-fotofelt"><picture>' + kilder
      + '<img src="' + esc(f.src) + '" alt="' + esc(f.alt || '') + '"'
      + ' width="74" height="56"'
      + ' loading="lazy" decoding="async"></picture></span>';
  }

  /* Jigraekken (Aa54 uroert): tabellens <thead>, hvert kolonnehoved et
     <th scope="col">. Robotnavnet er dermed det, en skaermlaeser laeser op
     foran hver eneste vaerdi nedenunder.

     NYT (spor/samlbyg, compens form): hovedet er OGSAA betjeningen. Foer
     rullede robotnavnene vaek, og raekke 25 blev laest uden at vide, hvilken
     spalte der var hvem; nu klaeber raekken (CSS: position:sticky), baerer
     robottens foto, og hver spalte har sit eget "Vaelg robotter"-link ned
     til vaelgeren. Skiftet sker altsaa DER, hvor man opdager, at man kigger
     paa den forkerte maskine.

     `.specimen`-klasserne er BEVIDST beholdt: tests/dele/29-tabelsemantik.mjs
     laeser <span class="specimen__navn"> for at bevise, at captionen naevner
     de robotter, der faktisk staar i tabellen. At doebe dem om ville have
     braekket et krav, der maaler noget rigtigt.

     Hjoernecellen er stadig et TOMT <td> hvad angaar tabelrollen (et <th>
     uden kolonne ville taelle med som en kolonneoverskrift uden kolonne) -
     men den baerer nu noeglen til svarmaerket, som ellers stod uforklaret. */
  function specimenHoved(robotter, n) {
    var celler = robotter.map(function (r) {
      return '<th scope="col" role="columnheader" class="specimen">'
        + '<span class="specimen__top">' + fotofeltHTML(r)
        + '<span class="specimen__id">'
        // TYPEMAERKET (spor/typekatalog, DESIGN.md "Typemaerket" + "Mærket
        // på mørk flade", 23. sep 2026). `r.typeMrk` er allerede den
        // FAERDIGE etikettekst eller null (tools/skabelon/sammenligning.mjs'
        // dataBlok) - klienten oversaetter intet selv. `.kort__mrk` er samme
        // klasse som katalogkortets stempel (ingen ny komponent); `--moerk`
        // er tokenskiftet for `--fod`-fladen (generator.css). Foerste barn
        // af `.specimen__id` (display:block), saa `.kort__mrk`s `float:right`
        // virker praecis som i katalog.mjs' kort__tekst.
        + (r.typeMrk ? '<span class="kort__mrk kort__mrk--moerk">' + esc(r.typeMrk) + '</span>' : '')
        // Robotnavnet linker til robotsiden (JPK 15. sep 2026: "der skal
        // laves et link ved tryk på den enkelte robot"). `r.url` er
        // `url.robot(r.slug)`, samme funktion SSR-fallbackens <dt><a>
        // allerede kalder (tools/skabelon/sammenligning.mjs:650) - genbrugt
        // sti, ikke en ny. `<a>` INDE i `<th scope="col">` er fint (regel
        // ovenfor); `scope`/`role` på selve `<th>` er UROERT.
        + '<span class="specimen__navn"><a href="' + esc(r.url) + '">' + esc(r.navn) + '</a></span>'
        + '<span class="specimen__meta">' + esc(r.producent) + '</span>'
        + '</span></span>'
        // FJERN-KNAPPEN (spor/saml3, JPK 2. sep 2026: "Choose robot knappen
        // skal vaek og der skal istedet vaere en under hver robot").
        //
        // Den staar dér, hvor spor/saml2 fjernede `.specimen__skift`, og
        // dens begrundelse er den kommentar, der stod her indtil nu: "Tre
        // identiske links til samme sted er stoej, ikke betjening." Den
        // indvending er stadig rigtig, og derfor er DENNE knap ikke et link
        // til kataloget. Den virker paa SIN EGEN kolonne: den fjerner netop
        // den robot fra sammenligningen, og matricen tegnes om med de
        // resterende. Tre knapper, tre forskellige virkninger - det er
        // betjening, ikke stoej.
        //
        // L73 ("ét sted at vaelge") staar uroert: man kan stadig kun
        // TILFOEJE en robot fra kataloget. Invitationen dertil staar ét
        // sted, i den ledige plads over matricen, aldrig pr. kolonne - se
        // invitationHTML() nedenfor.
        //
        // FORMEN er sitets knapprimitiv i den OMRIDSEDE vaegt paa MOERK
        // flade: kolonnehovedet staar paa --fod. `-moerk` i variantnavnet er
        // ikke pynt - det er vaernet mod praecis den fejl, foerste udgave af
        // denne knap lavede (1,16:1, se generator.css' egen note). Efter
        // L77 er valget nu ét ord i stedet for en 15-linjers udredning:
        // paafod paa fod = 12,72:1.
        //
        // KLASSEORDENEN: `specimen__fjern` staar stadig foerst, fordi det er
        // den klasse, generator.css' to-selektor-regel haenger paa. Ordenen
        // er IKKE laengere et hensyn til tests/dele/57's detektor - den
        // splitter class-strengen paa mellemrum og ser alle led (kun dens
        // JS-side havde graense-bug'en, og den blev rettet 1. sep).
        //
        // NAVNET, en skaermlaeser faar, er det LANGE: det korte ord er
        // aria-hidden, og .kunskaerm baerer "Fjern Spot fra sammenligningen".
        // Tre knapper, der alle bare hed "Fjern", ville vaere tre ens navne
        // paa tre forskellige handlinger.
        + '<span class="specimen__fod">'
        + '<span class="specimen__taethed figur">' + esc(taethedTekst(r.taethedAntal, r.robottype)) + '</span>'
        + '<button type="button" class="specimen__fjern knap knap--kant-moerk" data-saml-fjern="' + esc(r.slug) + '">'
        + '<span aria-hidden="true">' + esc(DATA.tekst.fjern_kort || '') + '</span>'
        + '<span class="kunskaerm">'
        + esc(String(DATA.tekst.fjern_navn || '').replace('{navn}', r.navn)) + '</span>'
        + '</button>'
        + '</span>'
        + '</th>';
    }).join('');
    // `--n` (antal valgte) blev sat her, saa CSS'en kunne bygge et
    // grid-template med N spalter. Den er FJERNET sammen med grid-formen
    // 31. aug 2026: matricen er en rigtig tabel igen, og en tabel taeller
    // selv sine spalter. Ingen CSS-regel laeser var(--n) laengere (maalt: 0
    // forekomster i baade generator.css og system.css), og et attribut,
    // ingen bruger, er en paastand om kode der ikke findes.
    return '<thead class="specimen-hoved" role="rowgroup">'
      + '<tr class="specimen-hoved__raekke" role="row">'
      + '<td class="specimen-hoved__hjoerne" role="cell">'
      + '<span class="saml-hjoerne__ord">' + esc(DATA.tekst.alle_felter) + '</span>'
      + '<span class="saml-hjoerne__note">' + esc(feltNaevnerTekst(robotter[0] && robotter[0].robottype)) + '</span>'
      + '</td>' + celler
      + '</tr></thead>';
  }

  /** "Ud af skemaets 30 felter ..." - naevneren, hjoernecellen staar for.
   *  spor/hjultype (25. sep 2026, L147/S-H4): samme typeafhaengige naevner
   *  som taethedTekst() - FELT_ANTAL fandtes ikke laengere efter omdoebningen
   *  til FELT_ANTAL_FALDBACK, se feltAntalFor()s kommentar. */
  function feltNaevnerTekst(robottype) {
    return String(DATA.tekst.felter_naevner || '').replace('{b}', feltAntalFor(robottype));
  }

  /* Svartaellingen: hvor mange af de viste plader der oplyser DETTE felt.
     Det er en TAELLING, ikke en score - samme maalestok som sidens "N af 30
     felter oplyst", vendt 90 grader. Det er derfor heller ikke en
     vindermarkering: den siger hvem der SVARER, aldrig hvem der svarer BEDST
     (haard begraensning 6).

     DET GRAFISKE ER FJERNET (JPK 2. sep 2026, ordret: "Disse bokse der
     angiver felter oplyste skal ikke vaere der"). Foer stod der under hvert
     feltnavn en raekke smaa firkanter - én pr. plade, fyldt = svarer,
     stiplet = tier - tegnet i CSS. De er vaek sammen med deres tre
     CSS-regler i generator.css, saa der ikke staar en doed klasse tilbage
     (Aa102: projektet har 66 doede klasser, netop fordi hvert spor holdt sig
     inden for sit eget).

     TAELLINGEN BLIVER. Maerkeraekken bar `aria-hidden="true"` - den var en
     GRAFISK opsummering af celler, skaermlaeseren alligevel laeser én for én
     lige nedenunder - mens selve tallet altid har staaet som tekst i
     `.kunskaerm`. Kun det aria-skjulte er altsaa fjernet; en skaermlaeser
     hoerer noejagtig det samme som foer. Havde begge dele vaeret fjernet,
     var det en tilgaengelighedsregression, ikke en oprydning.

     `svarer` bruges desuden stadig af tabelHTML() til `.saml-raekke--tavs`
     (raekker, hvor ingen plade svarer, traeder tilbage som helhed) - den
     returneres derfor uaendret. */
  function svarHTML(robotter, feltNavn) {
    var svarer = 0;
    for (var i = 0; i < robotter.length; i++) {
      var f = robotter[i].felter[feltNavn];
      if (f && f.tilstand !== 'ikke_oplyst') svarer++;
    }
    var taelling = String(DATA.tekst.svar_taeller || '')
      .replace('{a}', svarer).replace('{b}', robotter.length);
    return {
      svarer: svarer,
      html: '<span class="kunskaerm">' + esc(taelling) + '</span>',
    };
  }

  /* Fotokreditten - PR. KOLONNE, ikke laengere én saetning under hele
     tabellen. JPK 3. sep 2026, ordret: "Fodnoter til foto skal vaere i deres
     respektive kollonner." Han OPHAEVER dermed foerste halvdel af den gamle
     begrundelse, som stod her indtil nu:

       "Fotokreditten. Staar UDEN FOR <table> (et <p> efter den), fordi den
       handler om siden, ikke om en raekke eller en spalte - og fordi en
       tekstblok inde i en tabel ville staa i en celle, den ikke hoerer til."

     Det er netop forkert: et foto hoerer til PRAECIS én robot, altsaa
     PRAECIS én spalte, og <tfoot> er elementet HTML har til indhold pr.
     kolonne under en tabel - ikke en tekstblok, der laender sig op ad
     tabellen udefra. Anden halvdel af den gamle begrundelse staar VED MAGT
     og er uaendret et krav: kun de faktisk viste fotos krediteres, med
     producentnavn og hentedato, saa foden er sand for netop den trio,
     laeseren har valgt. En robot uden fabrikantfoto faar en TOM celle, ikke
     en opfundet kredit - og er ingen af de viste fotos fabrikantens, udebliver
     hele <tfoot>, praecis som den gamle <p> udeblev ved samme betingelse.

     Den FAELLES indledning ("Manufacturer's own photo.") hoerer stadig kun
     ét sted: gentaget i hver kolonne ville den vaere stoej, og den peger ikke
     paa nogen bestemt robot. Den staar derfor fortsat som sit eget <p>, nu
     LIGE EFTER tabellen (samme klasse, samme plads som foer) - kun den
     UDEFINERBARE del (hvem, hvornaar) er flyttet ind i tabellen. */
  function fotoFodHTML(robotter) {
    var harFabrikantfoto = false;
    var celler = robotter.map(function (r) {
      var f = r.foto;
      if (!f || f.ophav !== 'fabrikant') {
        return '<td class="saml-fotofod__celle" role="cell"></td>';
      }
      harFabrikantfoto = true;
      var tekst = r.producent + (f.hentet ? ' (' + DATA.tekst.hentet + ' ' + f.hentet + ')' : '');
      return '<td class="saml-fotofod__celle" role="cell">' + esc(tekst) + '</td>';
    }).join('');
    if (!harFabrikantfoto) return '';
    // Hjoernecellen foelger samme moenster som specimenHoved()s: et TOMT
    // <td>, ikke et <th> uden kolonne (linje 309-311 ovenfor forklarer
    // hvorfor). role="cell" er baelte-og-seler til det semantiske <td>.
    return '<tfoot class="saml-fotofod" role="rowgroup">'
      + '<tr class="saml-fotofod__raekke" role="row">'
      + '<td class="saml-fotofod__hjoerne" role="cell"></td>'
      + celler
      + '</tr></tfoot>';
  }

  /* Den faelles indledning, se begrundelsen i fotoFodHTML() ovenfor. Samme
     betingelse som foden: ingen fabrikantfoto blandt de viste, ingen saetning. */
  function fotoIndledningHTML(robotter) {
    var harFabrikantfoto = robotter.some(function (r) {
      return r.foto && r.foto.ophav === 'fabrikant';
    });
    if (!harFabrikantfoto) return '';
    return '<p class="saml-fotoophav">' + esc(DATA.tekst.foto_ophav) + '</p>';
  }

  /* Prisens USD-note (L66/JPK 15. sep 2026, "priser skal opgives i USD").
     Samme betingelse-moenster som fotoIndledningHTML() lige ovenfor: vises
     KUN naar mindst én af de viste robotter faktisk fik sin pris omregnet
     (`kildeform` sat af tools/skabelon/sammenligning.mjs' prisTilUSD()) - en
     note om en omregning, der ikke er sket paa nogen af de tre viste kort,
     ville forklare noget, laeseren ikke ser (samme regel som robot.mjs'
     `!hul`-vagt paa dens tilsvarende note).
     `DATA.tekst.pris_forklaring`/`kurs_kilde` er RAA moenstre ("{basis}" osv,
     genbrugt ordret fra i18n - se sammenligning.mjs), og `DATA.prisKurs`
     baerer de faktiske vaerdier. Samme flet-idiom som omregnetHTML() bruger
     for "{figur}" ovenfor - ingen ny substitutionsmekanik. */
  function prisKursHTML(robotter) {
    var harOmregnetPris = robotter.some(function (r) {
      return r.felter.pris && r.felter.pris.kildeform;
    });
    if (!harOmregnetPris) return '';
    var k = DATA.prisKurs || {};
    var forklaring = String(DATA.tekst.pris_forklaring || '')
      .replace('{basis}', k.basis).replace('{dato}', k.dato);
    var kildeTekst = String(DATA.tekst.kurs_kilde || '')
      .replace('{udgiver}', k.udgiver).replace('{navn}', k.navn).replace('{dato}', k.dato);
    return '<p class="saml-priskurs">' + esc(forklaring) + ' '
      + '<a class="url" href="' + esc(k.url) + '" rel="nofollow noopener external">'
      + esc(kildeTekst) + '</a></p>';
  }

  /* --- VAERNET: en kontakt, hvor intet skifter, er vaerre end ingen kontakt
     (robot.mjs:1016-1018, samme regel som afgOEr, om robotsiden faar en
     omskifter).

     Paa robotsiden er svaret givet én gang pr. side. Her afhaenger det af,
     hvad laeseren har valgt, og det aendrer sig under fingrene paa hende.
     MAALT 1. sep 2026 paa datasaettet: 71 af 77 robotter har mindst én
     omregnelig figur. De seks uden er anybotics-anymal-x,
     ghost-robotics-spirit-40, unitree-laikago, weilan-alphadog-e300,
     weilan-alphadog-e400l og weilan-babyalpha - alle sparsomt udfyldte.
     Af 73.150 mulige trioer har 20 (0,027 %) ingen omregnelig figur
     overhovedet, og 15 af parrene.

     Sjaeldent er ikke det samme som umuligt, og en laeser, der vaelger netop
     de tre, ville faa en kontakt, der intet gjorde. Derfor taelles der pr.
     tegning, og strimlen UDEBLIVER ved nul - den er en del af matricen, ikke
     af sidens faste stel, saa den forsvinder samme sted, som grunden til at
     have den forsvinder. Selve afkrydsningen skjules samtidig (opdater()),
     saa der ikke staar en fokusérbar kontrol tilbage uden en synlig etikette. */
  function omregneligeAntal(robotter) {
    var n = 0;
    for (var i = 0; i < robotter.length; i++) {
      var felter = robotter[i].felter;
      for (var navn in felter) {
        if (Object.prototype.hasOwnProperty.call(felter, navn) && felter[navn] && felter[navn].imp) n++;
      }
    }
    return n;
  }

  /* Strimlen over matricen: kontaktens ETIKETTE (selve afkrydsningen er
     server-renderet som foerste barn af .sammenligning-app, saa CSS'ens
     `:checked ~ *` naar hver celle) og forklaringen af, hvad et UMAERKET
     imperialt tal betyder. Flere <label for> til samme kontrol er gyldig
     HTML - robotsiden har allerede to - saa etiketten maa gerne staa her,
     langt fra boksen.

     Noten er `.enhedsnote`: CSS viser den kun i imperial tilstand. I metrisk
     ville den forklare noget, der ikke er paa skaermen. */
  function enhedslinjeHTML() {
    return '<div class="saml-enhedslinje">'
      + '<label class="enhedsskift" for="' + ENHED_ID + '">'
      + '<span class="enhedsskift__spor" aria-hidden="true"><span class="enhedsskift__knop"></span></span>'
      + '<span class="enhedsskift__ord">' + esc(DATA.tekst.enhed_skift_etiket || '') + '</span></label>'
      + '<p class="t-mikro maal enhedsnote">' + esc(DATA.tekst.enhed_skift_forklaring || '') + '</p>'
      + '</div>';
  }

  /* INVITATIONEN: den ENE vej tilbage til kataloget, og kun naar der er en
     ledig plads (spor/saml3, JPK 2. sep 2026).

     L73 er JPK's egen beslutning fra 1. sep: udvalget sker paa kataloget -
     ét sted at vaelge, ét sted at laese. Fjern-knapperne i kolonnehovederne
     roerer ikke den beslutning: de TRAEKKER FRA, de vaelger ikke til. Men
     naar en plads foerst er blevet ledig, skal det kunne ses, hvordan den
     fyldes - og DÉR hoerer kataloghenvisningen hjemme: ÉN gang, knyttet til
     den tomme plads, aldrig som en kopi i hver besat kolonne.

     HVORFOR IKKE EN TOM KOLONNE I TABELLEN, som "den tomme plads" ellers
     ville pege paa: en fjerde <th scope="col"> ville vaere en
     kolonneoverskrift uden kolonne (den fejl, hjoernecellen allerede er et
     <td> for at undgaa), og en rigtig, tom kolonne ville kraeve 30 tomme
     <td> ned gennem matricen og presse de to robotter, laeseren FAKTISK
     valgte, sammen for at goere plads til ingenting. Invitationen staar
     derfor over matricen, samme sted som enhedsstrimlen, uden for <table>.

     Den vises OGSAA i "vaelg mindst 2"-tilstanden (se opdater()). Uden det
     ville et klik paa den anden fjern-knap efterlade en side med en
     statuslinje og ingen vej videre.

     `data-saml-knap` er GENBRUGT, ikke nyt: klik-adfaerden (kommer laeseren
     fra kataloget, saa history.back() i stedet for en ny navigation, saa
     browserens egen bfcache genskaber de afkrydsede filtre) er den samme,
     som den fjernede SSR-knap havde, og den er stadig praecis den rigtige
     her. Se lytteren nederst i filen for hvorfor bindingen maatte skifte
     til delegering. */
  function invitationHTML() {
    if (!DATA.katalogUrl) return '';
    return '<p class="saml-invit"><a class="saml-invit__link knap knap--kant" href="'
      + esc(DATA.katalogUrl) + '" data-saml-knap>'
      + esc(DATA.tekst.vaelg_titel || '') + '</a></p>';
  }

  var diffAktiv = false;

  function erFeltEns(felter) {
    if (!felter || felter.length <= 1) return true;
    function norm(f) {
      if (!f) return 'ikke';
      if (f.tilstand === 'ikke_oplyst') return 'ikke';
      if (f.tilstand === 'nej') return 'nej';
      if (f.tilstand === 'ja') return 'ja';
      if (f.tilstand === 'kun_billede') return 'billede';
      if (f.tilstand === 'nul') return '0';
      if (f.tilstand === 'tekst') return 'txt:' + f.tekst;
      if (f.min != null && f.maks != null) {
        return 'int:' + f.min + '-' + f.maks + ':' + (f.enhed || '');
      }
      return 'v:' + f.vaerdi + ':' + (f.enhed || '') + ':' + (f.operator || '');
    }
    var foerste = norm(felter[0]);
    for (var i = 1; i < felter.length; i++) {
      if (norm(felter[i]) !== foerste) return false;
    }
    return true;
  }

  function diffKnapHTML(antalForskelle) {
    var taellerTekst = antalForskelle > 0 ? ' (' + antalForskelle + ')' : '';
    return '<button type="button" class="saml-diff-knap knap knap--kant'
      + (diffAktiv ? ' saml-diff-knap--aktiv' : '')
      + '" data-saml-diff aria-pressed="' + (diffAktiv ? 'true' : 'false') + '">'
      + '<span class="saml-diff-knap__ikon" aria-hidden="true">±</span> '
      + '<span class="saml-diff-knap__tekst">' + esc(DATA.tekst.diff_knap || 'Highlight differences') + '</span>'
      + '<span class="saml-diff-knap__taeller figur">' + esc(taellerTekst) + '</span>'
      + '</button>';
  }

  function toggleDiff() {
    diffAktiv = !diffAktiv;
    var tabel = resultat.querySelector('.saml-matrix');
    var knap = resultat.querySelector('[data-saml-diff]');
    if (tabel && knap && tabel.classList) {
      if (diffAktiv) {
        tabel.classList.add('saml-matrix--diff');
        knap.classList.add('saml-diff-knap--aktiv');
        knap.setAttribute('aria-pressed', 'true');
      } else {
        tabel.classList.remove('saml-matrix--diff');
        knap.classList.remove('saml-diff-knap--aktiv');
        knap.setAttribute('aria-pressed', 'false');
      }
    } else {
      opdater();
    }
  }

  function tabelHTML(slugs) {
    // `robotter` styrer BAADE hovedet og kroppen, og `n` udledes af den.
    // Foer taalte specimenHTML() over `slugs` og kroppen over den filtrerede
    // `robotter` - en ukendt slug gav derfor ét hoved for meget, og hver
    // vaerdi rykkede en kolonne. Usynligt i et div-gitter, men i en tabel
    // ville skaermlaeseren laese hver vaerdi op under den FORKERTE robot.
    var robotter = slugs.map(robotAf).filter(Boolean);
    var n = robotter.length;
    if (!n) return '';
    var spalter = n + 1;

    // spor/hjultype (25. sep 2026, L147/S-H4): "sammenligning kun inden for
    // samme type" (PLAN-frontendtyper.md S3) er den STAENDE regel - matricen
    // har ALDRIG kunnet vise to typer paa tvaers (S3s knap-spaerring er en
    // separat, endnu ubygget opgave, se planens egen note om at den "bliver
    // foerst aktuel" ved en type med felter, der falder vaek - netop nu).
    // delType laeses derfor af den FoeRSTE robot og gaelder for hele
    // matricen: felter, der ikke gaelder for DEN type, udelades som HELE
    // RAEKKER (S-H4), aldrig som en "ikke oplyst"-celle.
    var delType = robotter[0].robottype;
    var ikkeGaelder = (DATA.ikkeGaelderPrType && DATA.ikkeGaelderPrType[delType]) || [];
    var etiketOverride = (DATA.feltEtiketOverride && DATA.feltEtiketOverride[delType]) || {};
    function feltEtiket(feltNavn) {
      return etiketOverride[feltNavn] !== undefined ? etiketOverride[feltNavn] : DATA.feltNavne[feltNavn];
    }

    var antalForskelle = 0;
    var grupperHTML = DATA.grupper.map(function (g) {
      var synligeFelter = g.felter.filter(function (feltNavn) { return ikkeGaelder.indexOf(feltNavn) === -1; });
      if (!synligeFelter.length) return '';
      var raekker = synligeFelter.map(function (feltNavn) {
        // data-robot: navnet, en smal skaerm viser som cellens eget mikro-
        // maerke (CSS ::before), fordi kolonneoverskriften (specimen-raekken)
        // er langt vaek, naar tabellen staar i én spalte pr. robot. Det
        // maerke er stadig KUN visuelt - relationen baeres nu af scope="col".
        var svar = svarHTML(robotter, feltNavn);
        var felter = robotter.map(function (r) { return r.felter[feltNavn]; });
        var ens = erFeltEns(felter);
        if (!ens) antalForskelle++;

        var celler = robotter.map(function (r) {
          var f = r.felter[feltNavn];
          var tavs = !f || f.tilstand === 'ikke_oplyst';
          return '<td class="saml-raekke__celle' + (tavs ? ' saml-raekke__celle--tavs' : '')
            + '" role="cell" data-robot="' + esc(r.navn) + '">'
            + renderFelt(f) + '</td>';
        }).join('');
        // Raekker, hvor ALLE plader tier, traeder tilbage som helhed.
        // Vaerdierne staar der stadig med deres eget stiplede maerke - hullet
        // er ikke skjult, det er blot holdt op med at konkurrere med de
        // raekker, der baerer tal. Det er tavsheden selv, der er fundet.
        var tavsRaekke = svar.svarer === 0 ? ' saml-raekke--tavs' : '';
        var diffKlasse = ens ? ' saml-raekke--ens' : ' saml-raekke--forskel';
        // tabindex="0" paa RAEKKEHOVEDET, tilfoejet 3. sep 2026 sammen med
        // raekkemarkeringen (JPK: markering ved svaev OG fokus). Uden den kan
        // .saml-raekke:focus-within aldrig fyre: MAALT paa den byggede side
        // findes der NUL fokusbare elementer inde i de 33 datataekker - de
        // eneste tre i hele matricen er FJERN-knapperne oppe i pladehovedet.
        // En markering, der kun kan naas med mus, loeser ikke Operate-opgaven
        // "hold fast i raekke 17, mens blikket flytter 1.336,8 px til hoejre".
        // Prisen er 33 nye tabulatorstop; feltnavnet er det, der laeses op,
        // og det er ogsaa det, man vil staa paa.
        return '<tr class="saml-raekke' + tavsRaekke + diffKlasse + '" role="row">'
          + '<th scope="row" role="rowheader" tabindex="0" class="saml-raekke__navn">'
          + '<span class="saml-raekke__ord">' + esc(feltEtiket(feltNavn)) + '</span>'
          + svar.html + '</th>' + celler + '</tr>';
      }).join('');
      // Én <tbody> pr. gruppe. Gruppetitlen er scope="rowgroup" - den
      // gaelder netop de raekker, der foelger i DENNE tbody, hvilket er
      // praecis det, HTML'ens rowgroup-scope betyder.
      return '<tbody class="saml-gruppe" role="rowgroup">'
        + '<tr class="saml-gruppe__titelraekke" role="row">'
        + '<th scope="rowgroup" role="rowheader" colspan="' + spalter + '" class="saml-gruppe__titel">'
        + esc(g.titel) + '</th></tr>'
        + raekker + '</tbody>';
    }).join('');

    // Captionen navngiver tabellen for den, der springer mellem tabeller,
    // og naevner hvilke robotter der staar i den. Visuelt skjult
    // (.kunskaerm): de tre navne staar allerede synligt i specimen-hovedet,
    // saa en synlig caption ville vaere en dublet - samme begrundelse som
    // sidens egen <h2 class="t-h2 kunskaerm">.
    var navne = robotter.map(function (r) { return r.navn; }).join(', ');
    var caption = String(DATA.tekst.tabel_caption || '').replace('{robotter}', navne);

    // Strimlen staar FOER tabellen, ikke inde i den: den betjener matricen og
    // hoerer ikke til en raekke eller en spalte. Fotokreditten staar
    // modsat SIDEN 3. sep 2026 delvist INDE i tabellen - se fotoFodHTML().
    sidsteOmregnelige = omregneligeAntal(robotter);

    var vaerktoejHTML = '<div class="saml-vaerktoej">'
      + (n < DATA.maksAntal ? invitationHTML() : '<span class="saml-vaerktoej__fyld"></span>')
      + diffKnapHTML(antalForskelle)
      + '</div>';

    var matrixStart = diffAktiv
      ? '<table class="saml-matrix saml-matrix--diff" role="table" aria-labelledby="' + CAPTION_ID + '">'
      : '<table class="saml-matrix" role="table" aria-labelledby="' + CAPTION_ID + '">';

    return vaerktoejHTML
      + (sidsteOmregnelige ? enhedslinjeHTML() : '')
      + matrixStart
      + '<caption id="' + CAPTION_ID + '" class="kunskaerm">' + esc(caption) + '</caption>'
      + specimenHoved(robotter, n) + grupperHTML + fotoFodHTML(robotter)
      + '</table>'
      + fotoIndledningHTML(robotter)
      + prisKursHTML(robotter);
  }

  var status = app.querySelector('[data-saml-status]');
  var resultat = app.querySelector('[data-saml-resultat]');
  // Foden skjules sammen med resultatet. Grunden var oprindelig den
  // redaktionelle note ved foden (matrixFodHTML() i sammenligning.mjs, hvor
  // hele historien staar - den fil kopieres ikke til dist/), som stod
  // statisk i markup'en og derfor blev staaende alene i et stort tomrum i
  // "vaelg mindst 2"-tilstanden, hvor der ingen matrix er (spor/saml2, p. 3).
  // DEN TEKST ER FJERNET 3. sep 2026, men skjulningen BLIVER: foden baerer nu
  // fotokreditten, som fotoophavHTML() skriver ind klientside, og en
  // fotokredit for et udvalg, der ikke vises, giver lige saa lidt mening.
  // Ingen ny CSS-regel behoeves - `[hidden]{display:none}` er UA-standarden,
  // og intet andet sted saetter `.saml-fod`s `display` (efterproevet paa ny
  // 3. sep: reglen i assets/generator.css saetter kun `margin-top`).
  var fod = app.querySelector('.saml-fod');
  if (!status || !resultat) return;

  function visStatus(tekst) {
    status.hidden = false;
    status.textContent = tekst;
  }
  function skjulStatus() {
    status.hidden = true;
    status.textContent = '';
  }

  function opdaterKontakt() {
    if (enhedsBoks) enhedsBoks.hidden = !sidsteOmregnelige;
  }

  /* --- UDVALGET (spor/saml2, JPK 1. sep 2026, punkt 1+2) -------------------
     Siden har IKKE sin egen vaelger. Kataloget er det ENE sted, man
     VAELGER robotter (afkrydsning der, eller den klaebende bundbjaelke) -
     L73, og den beslutning staar.

     HER STOD INDTIL 2. SEP 2026: "denne side LAESER kun `SAML_NOEGLE` fra
     localStorage og SKRIVER den aldrig ... siden er nu ren visning, ikke
     betjening." DEN HALVDEL GAELDER IKKE LAENGERE. JPK bad samme dag om en
     knap under hver robot, og den knap FJERNER robotten fra sammenligningen
     - det er betjening, og den maa skrive.

     HVORFOR DEN ER NOEDT TIL AT SKRIVE, og ikke bare kunne holde et udvalg
     i hukommelsen: katalogets bundbjaelke laeser det SAMME `SAML_NOEGLE`.
     Fjernede denne side kun sin egen visning, ville kataloget blive ved med
     at sige "3 valgt", mens matricen viste 2 - to flader, der er uenige om
     den samme kendsgerning. Katalogets `storage`-lytter (katalog.js) fanger
     desuden skrivningen paa tvaers af faner, saa de to flader retter sig
     efter hinanden af sig selv.

     LAESNINGEN er stadig kun ét sted (`udvalgtSlugs()`), og SKRIVNINGEN er
     kun ét sted (`gemUdvalg()`, kaldt udelukkende af `fjernSlug()`). Der er
     altsaa fortsat ingen anden vej, hvorpaa denne side kan aendre udvalget.

     LAESERENS EGET VALG VINDER STADIG OVER STANDARDVALGET (uaendret regel,
     kun flyttet hertil fra det tidligere "flet ind i checkboxene"-trin, se
     git-historikken for den gamle udgave af denne funktion): findes et
     gemt udvalg med mindst én KENDT robot, erstatter det standardvalget
     HELT, ogsaa hvis det kun rummer én robot - saa vises "vaelg mindst 2",
     hvilket er sandt og er praecis den tilstand, laeseren selv har lavet.
     Er lageret tomt, ugyldigt, utilgaengeligt eller udelukkende fyldt med
     ukendte/foraeldede slugs, bruges `DATA.standard` (de tre taettest
     udfyldte robotter, én pr. producent - sammenligning.mjs' egen
     standardvalg()) - noejagtig samme faldback som foer, kun laest direkte
     i stedet for foerst krydset af i en DOM, der ikke findes laengere. */
  var SAML_NOEGLE = 'quad-sammenligning';
  function udvalgtSlugs() {
    var kendte = {};
    for (var i = 0; i < DATA.robotter.length; i++) kendte[DATA.robotter[i].slug] = true;
    var brug = [];

    /* URL deep linking: laes hash hvis tilgaengelig (#slug1,slug2) */
    try {
      if (typeof window !== 'undefined' && window.location && window.location.hash) {
        var hash = window.location.hash.replace(/^#/, '');
        if (hash.indexOf('r=') === 0 || hash.indexOf('robotter=') === 0) {
          hash = hash.split('=')[1] || '';
        }
        var dele = hash.split(/[,+]/);
        for (var k = 0; k < dele.length; k++) {
          var s = dele[k].trim();
          if (s && kendte[s] && brug.indexOf(s) < 0 && brug.length < DATA.maksAntal) {
            brug.push(s);
          }
        }
        if (brug.length) return brug;
      }
    } catch (eHash) { /* tavs */ }

    try {
      var raa = window.localStorage.getItem(SAML_NOEGLE);
      if (raa) {
        var gemt = JSON.parse(raa);
        if (Object.prototype.toString.call(gemt) === '[object Array]') {
          for (var j = 0; j < gemt.length && brug.length < DATA.maksAntal; j++) {
            var v = gemt[j];
            if (typeof v === 'string' && kendte[v] && brug.indexOf(v) < 0) brug.push(v);
          }
        }
      }
    } catch (e) { /* intet lager: standardvalget bruges */ }
    return brug.length ? brug : DATA.standard;
  }

  /* Den ENESTE skrivning. Tovejs-synkroniserer med URL hash og localStorage. */
  function gemUdvalg(liste) {
    try { window.localStorage.setItem(SAML_NOEGLE, JSON.stringify(liste)); } catch (e) { /* tavs */ }
    try {
      if (typeof window !== 'undefined' && window.history && window.history.replaceState && window.location) {
        var nytHash = liste && liste.length ? '#' + liste.join(',') : '';
        var nyUrl = (window.location.pathname || '') + (window.location.search || '') + nytHash;
        window.history.replaceState(null, '', nyUrl);
      }
    } catch (eHash) { /* tavs */ }
  }

  /* FJERN ÉN ROBOT - hele virkningen af kolonnehovedets knap. */
  function fjernSlug(slug) {
    var nu = udvalgtSlugs();
    var rest = [];
    for (var i = 0; i < nu.length; i++) if (nu[i] !== slug) rest.push(nu[i]);
    if (rest.length === nu.length) return;
    gemUdvalg(rest);
    opdater();
  }

  function opdater() {
    var slugs = udvalgtSlugs();
    if (slugs.length < 2) {
      visStatus(DATA.tekst.for_faa);
      // 1-robot tilstand: Vis den valgte model i stedet for totalt tomrum
      var enkeltHTML = '';
      if (slugs.length === 1) {
        var enkeltRobot = robotAf(slugs[0]);
        if (enkeltRobot) {
          enkeltHTML = '<div class="saml-enkelt-valgt">'
            + '<div class="specimen specimen--enkelt">'
            + '<span class="specimen__top">' + fotofeltHTML(enkeltRobot)
            + '<span class="specimen__id">'
            + '<span class="specimen__navn">' + esc(enkeltRobot.navn) + '</span>'
            + '<span class="specimen__meta">' + esc(enkeltRobot.producent) + '</span>'
            + '</span></span>'
            + '<span class="specimen__fod">'
            + '<span class="specimen__taethed figur">' + esc(taethedTekst(enkeltRobot.taethedAntal, enkeltRobot.robottype)) + '</span>'
            + '<button type="button" class="specimen__fjern knap knap--kant-moerk" data-saml-fjern="' + esc(enkeltRobot.slug) + '">'
            + '<span aria-hidden="true">' + esc(DATA.tekst.fjern_kort) + '</span>'
            + '<span class="kunskaerm">' + esc(String(DATA.tekst.fjern_navn).replace('{navn}', enkeltRobot.navn)) + '</span>'
            + '</button></span>'
            + '</div></div>';
        }
      }
      resultat.innerHTML = enkeltHTML + invitationHTML();
      sidsteOmregnelige = 0;
      if (fod) fod.hidden = true;
      opdaterKontakt();
      return;
    }
    // R1: standardvalget siges hoejt i sidens eksisterende notits - samme
    // element og form som "vaelg mindst 2" ovenfor, ingen ny komponent.
    if (slugs === DATA.standard && DATA.tekst.standard_note) visStatus(DATA.tekst.standard_note);
    else skjulStatus();
    resultat.innerHTML = tabelHTML(slugs);
    if (fod) fod.hidden = false;
    opdaterKontakt();
  }

  /* --- BETJENINGEN: ÉN delegeret lytter til begge knaptyper ---------------

     `[data-saml-fjern]`  fjern-knappen i hvert kolonnehoved (spor/saml3)
     `[data-saml-knap]`   invitationen tilbage til kataloget

     HVORFOR DELEGERING NU. Indtil 2. sep 2026 stod her et
     `document.querySelectorAll('[data-saml-knap]')` med en lytter pr.
     element, og det virkede, fordi knappen var SERVER-renderet og altsaa
     fandtes, naar scriptet kOErte. Begge knapper tegnes nu KLIENTSIDE og
     bygges om ved hvert `opdater()` - en lytter bundet ved opstart ville
     ramme elementer, der ikke fandtes endnu, og efter foerste omtegning
     ville den sidde paa elementer, der var kastet vaek. Lytteren sidder
     derfor paa `resultat`, som overlever hver omtegning.

     BFCACHE-ADFAERDEN ER UAENDRET og flyttet med fra den fjernede SSR-knap:
     kommer laeseren netop fra kataloget (`document.referrer`s pathname er
     kataloget), foerer klikket tilbage i HISTORIKKEN i stedet for at
     navigere frem igen - saa katalogets afkrydsede filtre genskabes af
     browseren selv (bfcache-formularhukommelse) uden at denne side skal
     kende til, gemme eller genopbygge et eneste filter. Kommer laeseren et
     andet sted fra (eller mangler referrer / er den blokeret), sker der
     INGENTING - linket navigerer normalt til kataloget.

     P0 ("uden JavaScript er siden sand, med JavaScript bliver den praecis")
     holder stadig, selv om invitationen nu KUN findes med JS: den hoerer til
     matricen, som i forvejen kun findes med JS. Uden JS staar
     `<p class="retur">` OEVERST paa siden og
     <noscript>-linjen nederst - begge server-renderede, begge til
     `url.katalog`, det samme sted. Der er altsaa ingen vej, der forsvinder
     uden JavaScript; kun matricens egen genvej til den.

     `fraKataloget()` bruger to detached <a>-elementer i stedet for
     `new URL()`: samme ES5-stil som resten af filen, og den loeser
     relative href'er (fx "../robotter/") mod DOKUMENTETS base-URL uden at
     kende sitets fulde origin. */
  function fraKataloget(href) {
    if (!document.referrer) return false;
    try {
      var maal = document.createElement('a');
      maal.href = href;
      var kilde = document.createElement('a');
      kilde.href = document.referrer;
      return kilde.protocol === maal.protocol && kilde.host === maal.host
        && kilde.pathname === maal.pathname;
    } catch (e) { return false; }
  }

  /** Naermeste forfader med attributten - `closest()` er ikke i ES5-familien
      og mangler desuden i testenes DOM-shim. */
  function opefter(el, attr) {
    while (el && el !== resultat) {
      if (el.getAttribute && el.getAttribute(attr) !== null) return el;
      el = el.parentNode;
    }
    return null;
  }

  resultat.addEventListener('click', function (e) {
    var maal = e && (e.target || e.srcElement);
    if (!maal) return;

    var diff = opefter(maal, 'data-saml-diff');
    if (diff) {
      e.preventDefault();
      toggleDiff();
      return;
    }

    var fjern = opefter(maal, 'data-saml-fjern');
    if (fjern) {
      e.preventDefault();
      fjernSlug(fjern.getAttribute('data-saml-fjern'));
      var naesteKnap = resultat.querySelector('[data-saml-fjern]') || resultat.querySelector('[data-saml-knap]');
      if (naesteKnap && typeof naesteKnap.focus === 'function') {
        naesteKnap.focus();
      }
      return;
    }

    var invit = opefter(maal, 'data-saml-knap');
    if (invit && fraKataloget(invit.getAttribute('href'))) {
      e.preventDefault();
      window.history.back();
    }
  });

  /* Tastaturnavigation: piletaster mellem specifikationsraekkerne */
  resultat.addEventListener('keydown', function (e) {
    var tast = e && (e.key || e.keyCode);
    if (!tast) return;
    var maal = e.target || e.srcElement;
    if (!maal) return;

    var erNavnHoved = (maal.getAttribute && (maal.getAttribute('class') || '').indexOf('saml-raekke__navn') >= 0);
    if (!erNavnHoved) return;

    var alle = resultat.querySelectorAll('.saml-raekke__navn');
    if (!alle || !alle.length) return;
    var index = -1;
    for (var i = 0; i < alle.length; i++) {
      if (alle[i] === maal) { index = i; break; }
    }
    if (index < 0) return;

    var naeste = -1;
    if (tast === 'ArrowDown' || tast === 40) {
      naeste = index + 1 < alle.length ? index + 1 : index;
    } else if (tast === 'ArrowUp' || tast === 38) {
      naeste = index - 1 >= 0 ? index - 1 : 0;
    } else if (tast === 'Home' || tast === 36) {
      naeste = 0;
    } else if (tast === 'End' || tast === 35) {
      naeste = alle.length - 1;
    }

    if (naeste >= 0 && naeste !== index && alle[naeste]) {
      e.preventDefault();
      if (typeof alle[naeste].focus === 'function') {
        alle[naeste].focus();
      }
    }
  });

  /* Samme betjeningsflade, to udtryksformer: JS erstatter den statiske
     fallback-liste med den byggede tabel i stedet for at vise begge. */
  var fallback = document.querySelector('[data-sammenligning-fallback-wrap]');
  if (fallback) {
    if (typeof fallback.remove === 'function') {
      fallback.remove();
    } else {
      fallback.hidden = true;
    }
  }
  app.hidden = false;

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('hashchange', function () {
      opdater();
    });
  }

  opdater();
}());
