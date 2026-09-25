/* assets/producent.js — sortering af producentsidens tabel (spor/prodsort,
 * 15. sep 2026, JPK ordret: "På producentsidne skal man kunne sorterer på
 * kolonne niveau hhv stigende/faldne ved klik på kolonneoverskrifterne
 * Manufacturer, Country og Count."
 *
 * UDEN DENNE FIL ER TABELLEN PRAECIS DEN, DEN VAR FOER SPORET — det er
 * JPK's egen beslutning (popup 15. sep 2026): ingen doede knapper. Al
 * markup, der goer et kolonnehoved klikbart (knappen, aria-sort, pilen),
 * bliver derfor foerst tegnet HERFRA, aldrig af tools/skabelon/producent.mjs.
 * `tools/skabelon/producent.mjs`s FIRE <th>-tags roeres IKKE — de er
 * byte-identiske med foer sporet (K11 i tests/dele/09-katalog-producent-
 * sider.mjs laaser deres praecise streng). Sorterbarheden laeses derfor
 * positionelt af de klasser, skabelonen ALLEREDE satte foer dette spor:
 * enhver <th> UDEN class="prod-navne" er sorterbar, og class="figur" (kun
 * Count) er signalet om at sortere som TAL frem for tekst. Kun tabellens
 * EGEN <table>-tag faar tre nye, usynlige data-attributter (data-sorter-
 * stigende/-faldende/-hjaelp) til oversat tekst — samme facon som
 * data-antal-en/-flere i assets/katalog.js.
 *
 * Modellernes kolonne (4., class="prod-navne") kan ikke sorteres — JPK
 * navngav kun de tre foerste.
 */
(function () {
  "use strict";

  function parseTal(tekst) {
    var raat = String(tekst || "").replace(/[^\d-]/g, "");
    if (raat === "" || raat === "-") return null;
    var n = parseInt(raat, 10);
    return Number.isNaN(n) ? null : n;
  }

  function typeAf(th) {
    return th.classList.contains("figur") ? "tal" : "tekst";
  }

  function klik(tabel, th, alleTh, sprog) {
    var type = typeAf(th);
    var nuvaerende = th.getAttribute("aria-sort");
    var retning = nuvaerende === "ascending" ? "descending" : "ascending";
    var stigendeTekst = tabel.getAttribute("data-sorter-stigende") || "";
    var faldendeTekst = tabel.getAttribute("data-sorter-faldende") || "";

    alleTh.forEach(function (t) {
      t.removeAttribute("aria-sort");
      var ikon = t.querySelector(".prod-tabel__sortikon");
      if (ikon) {
        ikon.classList.remove(
          "prod-tabel__sortikon--synlig",
          "prod-tabel__sortikon--asc",
          "prod-tabel__sortikon--desc",
        );
      }
      var knap = t.querySelector(".prod-tabel__sorterknap");
      if (knap) knap.title = stigendeTekst;
    });

    th.setAttribute("aria-sort", retning);
    var aktivIkon = th.querySelector(".prod-tabel__sortikon");
    if (aktivIkon) {
      aktivIkon.classList.add(
        "prod-tabel__sortikon--synlig",
        retning === "ascending"
          ? "prod-tabel__sortikon--asc"
          : "prod-tabel__sortikon--desc",
      );
    }
    var aktivKnap = th.querySelector(".prod-tabel__sorterknap");
    if (aktivKnap) {
      // Titlen fortaeller, hvad NAESTE klik goer — ikke den nuvaerende
      // tilstand, som aria-sort allerede baerer for skaermlaesere.
      aktivKnap.title =
        retning === "ascending" ? faldendeTekst : stigendeTekst;
    }

    var index = Array.prototype.indexOf.call(th.parentElement.children, th);
    var tbody = tabel.querySelector("tbody");
    if (!tbody) return;
    var raekker = Array.prototype.slice.call(tbody.querySelectorAll("tr"));
    var faktor = retning === "ascending" ? 1 : -1;

    raekker.sort(function (a, b) {
      var A = a.children[index];
      var B = b.children[index];
      var Atekst = A ? A.textContent.trim() : "";
      var Btekst = B ? B.textContent.trim() : "";
      if (type === "tal") {
        var an = parseTal(Atekst);
        var bn = parseTal(Btekst);
        // Manglende tal staar altid sidst, uanset retning — "ikke oplyst"
        // maa ikke skifte plads afhaengigt af stigende/faldende, ellers
        // ligner en tom celle et tal, der bare er meget hoejt eller lavt.
        if (an === null && bn === null) return 0;
        if (an === null) return 1;
        if (bn === null) return -1;
        return (an - bn) * faktor;
      }
      return Atekst.localeCompare(Btekst, sprog) * faktor;
    });

    raekker.forEach(function (r) {
      tbody.appendChild(r);
    });
  }

  function init() {
    var tabel = document.querySelector(".prod-tabel");
    if (!tabel) return;
    var sorterbareTh = Array.prototype.slice.call(
      tabel.querySelectorAll("thead th"),
    ).filter(function (th) {
      return !th.classList.contains("prod-navne");
    });
    if (sorterbareTh.length === 0) return;

    var sprog = document.documentElement.lang || "en";
    var hjaelpTekst = tabel.getAttribute("data-sorter-hjaelp") || "";
    var stigendeTekst = tabel.getAttribute("data-sorter-stigende") || "";

    if (hjaelpTekst) {
      var hjaelp = document.createElement("p");
      hjaelp.className = "kunskaerm";
      hjaelp.textContent = hjaelpTekst;
      var wrap = tabel.closest(".prod-tabel-wrap") || tabel.parentElement;
      wrap.parentElement.insertBefore(hjaelp, wrap);
    }

    sorterbareTh.forEach(function (th) {
      var navn = th.textContent.trim();
      th.textContent = "";

      var knap = document.createElement("button");
      knap.type = "button";
      knap.className = "prod-tabel__sorterknap";
      knap.title = stigendeTekst;

      var navnSpan = document.createElement("span");
      navnSpan.className = "prod-tabel__sortnavn";
      navnSpan.textContent = navn;
      knap.appendChild(navnSpan);

      var ikonSpan = document.createElement("span");
      ikonSpan.className = "prod-tabel__sortikon";
      ikonSpan.setAttribute("aria-hidden", "true");
      // KUN klassen ikon paa svg'en - IKKE dens lille-variant (skrevet uden
      // anfoerselstegn her med vilje, saa denne kommentar ikke selv scanner
      // som en brug af den i tests/dele/57-doed-css.mjs). Den variant staar
      // paa 57-doed-css.mjs' beskyttede doedliste, fordi EU-sektionen (dens
      // eneste tidligere forbruger) blev fjernet 4. sep 2026 - genbruges den
      // her, bliver den levende igen, og testen ville fejle paa et tal, der
      // ikke laengere passer. Vores egen 14px staar i
      // .prod-tabel__sortikon .ikon i generator.css i stedet.
      ikonSpan.innerHTML =
        '<svg class="ikon" aria-hidden="true"><use href="#i-pil"></use></svg>';
      knap.appendChild(ikonSpan);

      th.appendChild(knap);
      th.classList.add("prod-tabel__th--sorterbar");

      knap.addEventListener("click", function () {
        klik(tabel, th, sorterbareTh, sprog);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
