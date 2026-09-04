/* ============================================================================
   FAURLUNDS HAVE-PARTNER
   Interaktivt 6-trins lead-modul for anlægsgartneren Faurlund ApS.
   ----------------------------------------------------------------------------
   Modulet er ikke kun en prisberegner. Det er en pædagogisk rejse: hvert valg
   udløser den faglige viden, kunden normalt først får på et havemøde — hvorfor
   bærelaget afgør terrassens levetid, hvad Cumaru kan, hvor mange tons jord en
   udgravning i virkeligheden er. Prisen vises på skærmen FØR der spørges om
   kontaktoplysninger.

   Afhængigheder:  react, lucide-react, tailwindcss
   Valgfri:        jspdf  (findes den ikke, falder rapporten tilbage til
                           console.log + en kvittering på skærmen)

   TILPAS HER:
     PRIS        alle priser, faktorer og servicetakster
     KATEGORIER  hvad kunden kan sætte nåle i
     MATERIALER  materialekort + den pædagogiske tekst bag info-ikonet
     NIVEAUER    arbejdsfordeling og prisfaktor
     SERVICES    abonnementer
   ========================================================================== */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, FileDown, Hammer,
  HardHat, Image as ImageIcon, Info, Layers, LayoutGrid, Leaf, Loader2, Lock,
  Mail, MapPin, Phone, Ruler, Scissors, ShieldCheck, Sparkles, Sprout, Sun,
  Trash2, Trees, Upload, User, X,
} from 'lucide-react';

/* ==========================================================================
   1. DATA — priser, kategorier, materialer, niveauer, services
   ========================================================================== */

/** Alle beløb er INKL. moms, danske kroner, og bevidst runde estimater. */
const PRIS = {
  opstart: 12500,          // mobilisering, opmåling, afsætning, projektstyring
  spaendNed: 0.92,         // nedre ende af prisspændet
  spaendOp: 1.15,          // øvre ende af prisspændet
  jordPrM2: 0.45,          // tons jord pr. m² udgravning (40 m² ≈ 18 tons)
};

const KATEGORIER = {
  belaegning: {
    navn: 'Ny belægning',
    kort: 'Belægning',
    enhed: 'm²',
    pris: 2150,
    standard: 30,
    ikon: LayoutGrid,
    farve: 'bg-stone-600',
    graver: true,
    viden:
      'Vidste du? Et solidt bærelag udgør 80% af en langtidsholdbar terrasse. ' +
      'Vi graver altid 30-40 cm ud og opbygger med stabilgrus for at frostsikre.',
  },
  traeterrasse: {
    navn: 'Træterrasse',
    kort: 'Træterrasse',
    enhed: 'm²',
    pris: 2650,
    standard: 25,
    ikon: Hammer,
    farve: 'bg-amber-700',
    graver: false,
    viden:
      'Vidste du? En træterrasse lever eller dør med sit understel. Vi bygger på ' +
      'justerbare fødder med luft under, så vandet kan komme væk og træet tørre ' +
      'fra begge sider. Det er forskellen på 10 og 30 år.',
  },
  bed: {
    navn: 'Bed & beplantning',
    kort: 'Bed',
    enhed: 'm²',
    pris: 780,
    standard: 20,
    ikon: Sprout,
    farve: 'bg-emerald-600',
    graver: false,
    viden:
      'Vidste du? Et bed, der ser fyldt ud fra dag ét, er plantet forkert. Vi ' +
      'planter med den voksne plantes mål for øje og lukker jorden med bunddække, ' +
      'så ukrudtet aldrig får lys nok til at komme i gang.',
  },
  haek: {
    navn: 'Hæk',
    kort: 'Hæk',
    enhed: 'lbm',
    pris: 620,
    standard: 18,
    ikon: Trees,
    farve: 'bg-green-800',
    graver: false,
    viden:
      'Vidste du? En hæk plantes i en gennemgravet rende — ikke i huller. Renden ' +
      'giver rødderne fri bane på tværs og er grunden til, at hækken lukker ' +
      'ensartet i stedet for i klumper.',
  },
  graes: {
    navn: 'Græsplæne',
    kort: 'Græs',
    enhed: 'm²',
    pris: 320,
    standard: 80,
    ikon: Sun,
    farve: 'bg-lime-600',
    graver: false,
    viden:
      'Vidste du? En plæne bliver aldrig bedre end de 10 cm muld, den ligger på. ' +
      'Vi løsner bunden, tilfører vækstlag og planlægger faldet, så vandet løber ' +
      'væk fra huset — ikke ind mod soklen.',
  },
};

/** Materialer pr. kategori. faktor ganges på kategoriens m²-/lbm-pris. */
const MATERIALER = {
  belaegning: [
    {
      id: 'herregaard',
      navn: 'Herregårdssten',
      undertitel: 'Beton · klassisk dansk',
      faktor: 1.0,
      badge: 'Mest valgte',
      swatch: 'from-stone-300 to-stone-400',
      info:
        'Herregårdssten er en gennemfarvet betonsten med afrundede kanter. Den er ' +
        'formstabil, tåler tung last og kan lægges i mange forbandter. Den patinerer ' +
        'roligt og kan renses op igen — også om 15 år.',
    },
    {
      id: 'chaussé',
      navn: 'Granitchaussésten',
      undertitel: 'Natursten · brolagt',
      faktor: 1.45,
      swatch: 'from-slate-400 to-slate-600',
      info:
        'Granit er praktisk talt uopslidelig — de sten, der ligger i danske bymidter, ' +
        'er over 100 år gamle. Prisen ligger i håndarbejdet: hver sten sættes og ' +
        'stampes enkeltvis, og buerne slås op i hånden.',
    },
    {
      id: 'fliser',
      navn: 'Betonfliser 60×60',
      undertitel: 'Store flader · rene linjer',
      faktor: 0.85,
      badge: 'Bedst i pris',
      swatch: 'from-zinc-200 to-zinc-400',
      info:
        'Store fliser giver et roligt, moderne udtryk med få fuger. Til gengæld er de ' +
        'ubarmhjertige over for et skævt bærelag — derfor komprimerer vi i lag af ' +
        '10 cm, så fladen bliver plan og bliver ved med at være det.',
    },
  ],
  traeterrasse: [
    {
      id: 'cumaru',
      navn: 'Cumaru træ',
      undertitel: 'Hårdttræ · 30+ år',
      faktor: 1.0,
      badge: 'Længst levetid',
      swatch: 'from-amber-600 to-amber-800',
      info:
        'Cumaru er ekstremt hårdt træ med 30+ års levetid. Kan stå ubehandlet og ' +
        'patinere smukt sølvgråt.',
    },
    {
      id: 'laerk',
      navn: 'Sibirisk lærk',
      undertitel: 'Nåletræ · 15-20 år',
      faktor: 0.72,
      badge: 'Bedst i pris',
      swatch: 'from-orange-300 to-amber-500',
      info:
        'Lærk er det fornuftige valg, når budgettet skal strækkes. Kernetræet har en ' +
        'naturlig harpiks, der holder på råd. Det arbejder mere end hårdttræ, så vi ' +
        'skruer fra oven med rustfrit og lader brædderne sætte sig det første år.',
    },
    {
      id: 'kompositbraet',
      navn: 'Komposit',
      undertitel: 'Træfiber & polymer',
      faktor: 0.9,
      swatch: 'from-neutral-400 to-neutral-600',
      info:
        'Komposit skal ikke olieres og splintrer ikke — velegnet ved pool og til bare ' +
        'fødder. Til gengæld bliver det varmt i sol og kan ikke slibes op. Det er et ' +
        'valg om vedligehold, ikke om levetid.',
    },
  ],
  bed: [
    {
      id: 'staude',
      navn: 'Staudebed m. bunddække',
      undertitel: 'Blomstrer marts-oktober',
      faktor: 1.0,
      badge: 'Mest valgte',
      swatch: 'from-emerald-400 to-emerald-600',
      info:
        'Vi sammensætter bedet, så noget står i blomst hele sæsonen, og lukker jorden ' +
        'med bunddække. Et tæt bed er den billigste ukrudtsbekæmpelse, der findes — ' +
        'og den eneste, der bliver bedre med årene.',
    },
    {
      id: 'prydgraes',
      navn: 'Prydgræsser',
      undertitel: 'Bevægelse · lav pasning',
      faktor: 0.9,
      swatch: 'from-teal-300 to-teal-500',
      info:
        'Prydgræsser giver bevægelse og lyd i haven og står smukt langt ind i vinteren. ' +
        'De klippes ned én gang om året i februar — det er hele pasningen.',
    },
    {
      id: 'hjemmehoerende',
      navn: 'Hjemmehørende buske',
      undertitel: 'Bier & fugle',
      faktor: 1.05,
      swatch: 'from-green-500 to-green-700',
      info:
        'Danske arter som benved, kvalkved og hunderose kræver hverken vanding eller ' +
        'gødning efter etablering, fordi de står i den jord, de kommer fra. De giver ' +
        'føde til insekter og fugle i haven året rundt.',
    },
  ],
  haek: [
    {
      id: 'boeg',
      navn: 'Bøgehæk',
      undertitel: 'Bladholdende om vinteren',
      faktor: 1.0,
      badge: 'Mest valgte',
      swatch: 'from-lime-600 to-green-700',
      info:
        'Bøg holder på de brune blade hele vinteren og giver derfor læ og skærm året ' +
        'rundt. Den vokser 25-40 cm om året og tåler at blive klippet hårdt tilbage — ' +
        'en bøgehæk kan reddes, selv når den har fået lov at vokse vildt i mange år.',
    },
    {
      id: 'liguster',
      navn: 'Ligusterhæk',
      undertitel: 'Hurtig · robust',
      faktor: 0.8,
      badge: 'Bedst i pris',
      swatch: 'from-green-400 to-green-600',
      info:
        'Liguster er den hurtigste vej til en tæt hæk og tåler både salt, skygge og ' +
        'byluft. Prisen er, at den vil klippes to gange om året — ellers bliver den ' +
        'åben forneden.',
    },
    {
      id: 'thuja',
      navn: 'Thuja',
      undertitel: 'Stedsegrøn skærm',
      faktor: 1.15,
      swatch: 'from-emerald-700 to-emerald-900',
      info:
        'Thuja giver en tæt, grøn væg hele året og er det oplagte valg mod indkig. ' +
        'Vigtigt at vide: den bryder ikke igen fra gammelt ved, så den må aldrig ' +
        'klippes ind i det brune. Vi klipper let og ofte i stedet.',
    },
  ],
  graes: [
    {
      id: 'rullegraes',
      navn: 'Rullegræs',
      undertitel: 'Færdig plæne på én dag',
      faktor: 1.0,
      badge: 'Hurtigst',
      swatch: 'from-lime-400 to-lime-600',
      info:
        'Rullegræs er dyrket på mark i to år og lægges ud som en færdig plæne. Den kan ' +
        'betrædes efter cirka to uger. Den store fordel er, at ukrudt aldrig får ' +
        'chancen for at nå frøene først.',
    },
    {
      id: 'saaning',
      navn: 'Såning',
      undertitel: 'Tålmodighed · lav pris',
      faktor: 0.55,
      badge: 'Bedst i pris',
      swatch: 'from-green-300 to-lime-500',
      info:
        'En sået plæne koster under det halve, men skal vandes dagligt i etableringen ' +
        'og må først bruges efter 2-3 måneder. Til gengæld rodfæster den dybere, fordi ' +
        'den vokser op, hvor den skal stå.',
    },
    {
      id: 'blomstereng',
      navn: 'Blomstereng',
      undertitel: 'Slås 1-2 gange årligt',
      faktor: 0.7,
      swatch: 'from-yellow-300 to-lime-500',
      info:
        'En eng skal have mager jord — derfor fjerner vi det øverste næringsrige lag ' +
        'i stedet for at tilføre muld. Den slås én til to gange om året, og afklippet ' +
        'køres væk, så jorden bliver ved med at være mager.',
    },
  ],
};

const NIVEAUER = [
  {
    id: 1,
    titel: 'Du knokler lidt, vi bygger',
    kort: 'Du rydder, vi bygger',
    faktor: 0.8,
    ikon: HardHat,
    dig: ['Du rydder og fjerner det gamle', 'Du bortskaffer jord og fliser', 'Du sørger for adgang og opmagasinering'],
    os: ['Vi opbygger bærelag og bygger færdigt', 'Vi leverer materialer', 'Vi giver 5 års garanti på vores arbejde'],
    advarsel: true,
  },
  {
    id: 2,
    titel: 'Samarbejdet',
    kort: 'Vi deler opgaven',
    faktor: 0.9,
    ikon: Layers,
    dig: ['Du rydder op efter os', 'Du planter selv bede og hæk', 'Du står for vanding i etableringen'],
    os: ['Vi rydder, graver ud og bortskaffer', 'Vi bygger alt det konstruktive', 'Vi sætter planterne af på pladsen'],
    advarsel: true,
    badge: 'Mest valgte',
  },
  {
    id: 3,
    titel: 'Totalentreprise – Læn dig tilbage',
    kort: 'Vi klarer det hele',
    faktor: 1.0,
    ikon: Sparkles,
    dig: ['Du vælger og godkender', 'Du kommer hjem til en færdig have'],
    os: ['Vi styrer alt fra rydning til sidste plante', 'Vi bortskaffer alt affald', 'Én kontaktperson og én regning', 'Vi vander og efterser i etableringen'],
    advarsel: false,
  },
];

const SERVICES = [
  {
    id: 'alger',
    navn: 'Årlig algebehandling',
    ikon: Sparkles,
    pris: (m) => Math.max(1200, Math.round(m.belaegningM2 * 32)),
    kraever: (m) => m.belaegningM2 > 0,
    tekst: 'Én årlig behandling af belægningen, typisk i april.',
  },
  {
    id: 'haek',
    navn: 'Hækklipning 2× årligt',
    ikon: Scissors,
    pris: (m) => Math.max(900, Math.round(m.haekLbm * 45 * 2)),
    kraever: (m) => m.haekLbm > 0,
    tekst: 'Formklipning i juni og august. Vi tager afklippet med.',
  },
  {
    id: 'bed',
    navn: 'Bedpleje · 4 besøg',
    ikon: Sprout,
    pris: (m) => Math.max(1600, Math.round(m.bedM2 * 60)),
    kraever: (m) => m.bedM2 > 0,
    tekst: 'Lugning, opbinding og beskæring fordelt over sæsonen.',
  },
  {
    id: 'foraar',
    navn: 'Forårsklargøring',
    ikon: Sun,
    pris: () => 2400,
    kraever: () => true,
    tekst: 'Vertikalskæring, gødning og et samlet eftersyn af haven.',
  },
];

const TRIN = [
  { nr: 1, navn: 'Kortlæg', ikon: MapPin },
  { nr: 2, navn: 'Materialer', ikon: Layers },
  { nr: 3, navn: 'Arbejde', ikon: HardHat },
  { nr: 4, navn: 'Service', ikon: ShieldCheck },
  { nr: 5, navn: 'Pris', ikon: Ruler },
  { nr: 6, navn: 'Rapport', ikon: FileDown },
];

/* Eksempelbillede, så modulet virker med det samme — uden at hente noget udefra. */
const EKSEMPELBILLEDE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 600">
    <defs>
      <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#bfdbfe"/><stop offset="1" stop-color="#e0f2fe"/>
      </linearGradient>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#86bb5c"/><stop offset="1" stop-color="#5f9a3c"/>
      </linearGradient>
    </defs>
    <rect width="960" height="600" fill="url(#s)"/>
    <rect y="250" width="960" height="350" fill="url(#g)"/>
    <rect x="60" y="120" width="300" height="180" fill="#e7e5e4"/>
    <path d="M40 125 L210 40 L380 125 Z" fill="#a8a29e"/>
    <rect x="150" y="200" width="70" height="100" fill="#78716c"/>
    <rect x="250" y="170" width="70" height="60" fill="#93c5fd"/>
    <rect x="380" y="300" width="330" height="120" rx="4" fill="#d6d3d1"/>
    <rect x="380" y="300" width="330" height="120" rx="4" fill="none" stroke="#a8a29e" stroke-width="3"/>
    <g stroke="#a8a29e" stroke-width="2">
      <line x1="490" y1="300" x2="490" y2="420"/><line x1="600" y1="300" x2="600" y2="420"/>
      <line x1="380" y1="360" x2="710" y2="360"/>
    </g>
    <rect x="740" y="250" width="220" height="90" fill="#2f6b32"/>
    <ellipse cx="820" cy="480" rx="150" ry="40" fill="#4d8a33" opacity="0.5"/>
    <circle cx="120" cy="430" r="45" fill="#3f7a2e"/>
    <rect x="112" y="430" width="16" height="80" fill="#6b4f2a"/>
    <text x="480" y="576" font-family="system-ui,sans-serif" font-size="26" fill="#1f3d1a"
      text-anchor="middle" opacity="0.75">Eksempelhave — tryk for at sætte nåle</text>
  </svg>`);

/* ==========================================================================
   2. HJÆLPERE
   ========================================================================== */

const kr = (n) => new Intl.NumberFormat('da-DK').format(Math.round(n)) + ' kr.';
const rund = (n, til = 500) => Math.round(n / til) * til;
const nyId = () => Math.random().toString(36).slice(2, 9);

/* ==========================================================================
   3. SMÅ BYGGEKLODSER
   ========================================================================== */

function Videnboks({ children, onLuk, titel = 'Godt at vide' }) {
  return (
    <div className="relative rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
      <div className="flex gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
          <Leaf className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{titel}</p>
          <p className="mt-1 text-sm leading-relaxed text-emerald-950">{children}</p>
        </div>
      </div>
      {onLuk && (
        <button
          type="button"
          onClick={onLuk}
          aria-label="Luk videnboks"
          className="absolute right-2 top-2 rounded-full p-1.5 text-emerald-700 transition hover:bg-emerald-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function Advarsel({ titel = 'Advarsel', children }) {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5">
      <div className="flex gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">{titel}</p>
          <div className="mt-1 space-y-2 text-sm leading-relaxed text-amber-950">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Info-ikon der folder en pædagogisk tekst ud. Virker på både hover og klik. */
function InfoIkon({ tekst, navn }) {
  const [aaben, setAaben] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setAaben(true)} onMouseLeave={() => setAaben(false)}>
      <button
        type="button"
        aria-label={`Om ${navn}`}
        aria-expanded={aaben}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setAaben((v) => !v);
        }}
        className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
          aaben ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-emerald-300 bg-white text-emerald-700 hover:border-emerald-500'
        }`}
      >
        <Info className="h-4 w-4" aria-hidden="true" />
      </button>
      {aaben && (
        <span
          role="tooltip"
          className="absolute bottom-9 right-0 z-30 w-64 rounded-xl border border-emerald-200 bg-white p-3 text-left text-xs leading-relaxed text-stone-700 shadow-xl sm:w-72"
        >
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            Anlægsgartnerens note
          </span>
          {tekst}
        </span>
      )}
    </span>
  );
}

function Felt({ ikon: Ikon, label, ...rest }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-stone-700">{label}</span>
      <span className="relative block">
        <Ikon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
        <input
          {...rest}
          className="w-full rounded-xl border border-stone-300 bg-white py-3 pl-10 pr-4 text-[16px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15"
        />
      </span>
    </label>
  );
}

function Trinbjaelke({ trin }) {
  const pct = (trin / TRIN.length) * 100;
  return (
    <div className="border-b border-stone-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-sm font-semibold text-stone-600">
            Trin {trin} af {TRIN.length}
            <span className="ml-2 font-bold text-emerald-800">{TRIN[trin - 1].navn}</span>
          </p>
          <p className="text-xs font-semibold text-stone-400">{Math.round(pct)}% færdig</p>
        </div>

        <div className="relative h-1.5 rounded-full bg-stone-200">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-emerald-600 transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        <ol className="mt-3 flex justify-between">
          {TRIN.map((t) => {
            const Ikon = t.ikon;
            const gjort = t.nr < trin;
            const aktiv = t.nr === trin;
            return (
              <li key={t.nr} className="flex flex-1 flex-col items-center gap-1">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${
                    gjort
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : aktiv
                      ? 'border-emerald-600 bg-white text-emerald-700 ring-4 ring-emerald-600/15'
                      : 'border-stone-200 bg-white text-stone-300'
                  }`}
                >
                  {gjort ? <Check className="h-4 w-4" aria-hidden="true" /> : <Ikon className="h-4 w-4" aria-hidden="true" />}
                </span>
                <span className={`hidden text-[11px] font-semibold sm:block ${aktiv ? 'text-emerald-800' : 'text-stone-400'}`}>
                  {t.navn}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function Overskrift({ eyebrow, titel, tekst }) {
  return (
    <header className="mb-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">{eyebrow}</p>
      <h2 className="mt-1.5 text-2xl font-extrabold leading-tight text-stone-900 sm:text-3xl">{titel}</h2>
      {tekst && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">{tekst}</p>}
    </header>
  );
}

/* ==========================================================================
   4. TRIN 1 — KORTLÆG PROJEKTET
   ========================================================================== */

function Trin1Kortlaeg({ billede, saetBillede, naale, saetNaale }) {
  const [kategori, setKategori] = useState('belaegning');
  const [videnFor, setVidenFor] = useState(null);
  const [valgtNaal, setValgtNaal] = useState(null);
  const fil = useRef(null);

  const upload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const l = new FileReader();
    l.onload = () => saetBillede(l.result);
    l.readAsDataURL(f);
  };

  const saetNaal = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    const n = { id: nyId(), kategori, x, y, maengde: KATEGORIER[kategori].standard };
    saetNaale((v) => [...v, n]);
    setValgtNaal(n.id);
    setVidenFor(kategori);
  };

  return (
    <section>
      <Overskrift
        eyebrow="Trin 1 · Kortlæg"
        titel="Vis os din have"
        tekst="Upload et billede og sæt en nål på hvert sted, du drømmer om at ændre. Vi fortæller undervejs, hvad der foregår under overfladen."
      />

      {!billede ? (
        <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <ImageIcon className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="font-bold text-stone-900">Upload et billede af haven</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-stone-600">
            Et enkelt foto fra terrassedøren eller vejen er rigeligt. Billedet bliver kun brugt til dit eget projekt.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => fil.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
            >
              <Upload className="h-4 w-4" aria-hidden="true" /> Vælg billede
            </button>
            <button
              type="button"
              onClick={() => saetBillede(EKSEMPELBILLEDE)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-bold text-stone-700 transition hover:border-emerald-600 hover:text-emerald-800"
            >
              Brug eksempelbillede
            </button>
          </div>
          <input ref={fil} type="file" accept="image/*" onChange={upload} className="hidden" />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-stone-700">1. Hvad vil du markere?</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(KATEGORIER).map(([id, k]) => {
                const Ikon = k.ikon;
                const valgt = id === kategori;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setKategori(id)}
                    aria-pressed={valgt}
                    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                      valgt
                        ? 'border-emerald-700 bg-emerald-700 text-white'
                        : 'border-stone-300 bg-white text-stone-700 hover:border-emerald-600'
                    }`}
                  >
                    <Ikon className="h-4 w-4" aria-hidden="true" />
                    {k.kort}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-stone-700">
              2. Tryk på billedet, hvor <span className="text-emerald-800">{KATEGORIER[kategori].navn.toLowerCase()}</span> skal være
            </p>
            <div
              onClick={saetNaal}
              role="application"
              aria-label="Havebillede — tryk for at sætte en nål"
              className="relative w-full cursor-crosshair overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-sm"
            >
              <img src={billede} alt="Din have" className="block w-full select-none" draggable="false" />

              {naale.map((n, i) => {
                const k = KATEGORIER[n.kategori];
                const Ikon = k.ikon;
                const aktiv = n.id === valgtNaal;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setValgtNaal(n.id);
                      setVidenFor(n.kategori);
                    }}
                    style={{ left: `${n.x}%`, top: `${n.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-full transition ${aktiv ? 'z-20 scale-110' : 'z-10'}`}
                    aria-label={`Nål ${i + 1}: ${k.navn}`}
                  >
                    <span
                      className={`flex items-center gap-1.5 rounded-full ${k.farve} px-2.5 py-1.5 text-xs font-bold text-white shadow-lg ring-2 ${
                        aktiv ? 'ring-white' : 'ring-white/70'
                      }`}
                    >
                      <Ikon className="h-3.5 w-3.5" aria-hidden="true" />
                      {i + 1}
                    </span>
                    <span className={`mx-auto block h-2 w-0.5 ${k.farve}`} />
                  </button>
                );
              })}

              {naale.length === 0 && (
                <span className="pointer-events-none absolute inset-x-0 bottom-4 mx-auto w-fit rounded-full bg-stone-900/75 px-4 py-2 text-xs font-semibold text-white">
                  <MapPin className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                  Tryk for at sætte din første nål
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                saetBillede(null);
                saetNaale([]);
              }}
              className="mt-2 text-xs font-semibold text-stone-500 underline underline-offset-2 hover:text-emerald-700"
            >
              Skift billede
            </button>
          </div>

          {videnFor && (
            <Videnboks onLuk={() => setVidenFor(null)} titel={KATEGORIER[videnFor].navn}>
              {KATEGORIER[videnFor].viden}
            </Videnboks>
          )}

          {naale.length > 0 && (
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="mb-3 text-sm font-semibold text-stone-700">3. Sæt cirka-målene — vi retter dem på besøget</p>
              <ul className="space-y-2.5">
                {naale.map((n, i) => {
                  const k = KATEGORIER[n.kategori];
                  return (
                    <li key={n.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-stone-50 p-3">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${k.farve} text-xs font-bold text-white`}>
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-semibold text-stone-800">{k.navn}</span>
                      <span className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          inputMode="numeric"
                          value={n.maengde}
                          aria-label={`${k.navn} i ${k.enhed}`}
                          onChange={(e) =>
                            saetNaale((v) =>
                              v.map((x) => (x.id === n.id ? { ...x, maengde: Math.max(0, Number(e.target.value) || 0) } : x)),
                            )
                          }
                          className="w-20 rounded-lg border border-stone-300 px-2.5 py-1.5 text-[16px] font-semibold text-stone-900 outline-none focus:border-emerald-600"
                        />
                        <span className="w-8 text-sm font-semibold text-stone-500">{k.enhed}</span>
                        <button
                          type="button"
                          onClick={() => saetNaale((v) => v.filter((x) => x.id !== n.id))}
                          aria-label={`Fjern nål ${i + 1}`}
                          className="rounded-lg p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ==========================================================================
   5. TRIN 2 — MATERIALEVALG OG STIL
   ========================================================================== */

/** Valgkort med knap-semantik. Bevidst en div og ikke en <button>, fordi
 *  kortene indeholder lister og et selvstændigt info-ikon — knapper må ikke
 *  indeholde andre knapper eller blokindhold. */
function Valgkort({ valgt, vaelg, className = '', children, label }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={valgt}
      aria-label={label}
      onClick={vaelg}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          vaelg();
        }
      }}
      className={`cursor-pointer outline-none transition focus-visible:ring-4 focus-visible:ring-emerald-600/30 ${
        valgt ? 'border-emerald-700 shadow-lg ring-4 ring-emerald-600/10' : 'border-stone-200 hover:border-emerald-400 hover:shadow-md'
      } ${className}`}
    >
      {children}
    </div>
  );
}

function Materialekort({ m, valgt, vaelg }) {
  return (
    <Valgkort
      valgt={valgt}
      vaelg={vaelg}
      label={m.navn}
      className="relative flex w-full flex-col overflow-hidden rounded-2xl border-2 bg-white text-left"
    >
      <div className={`h-20 w-full bg-gradient-to-br ${m.swatch}`} />
      {m.badge && (
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-800 shadow">
          {m.badge}
        </span>
      )}
      {valgt && (
        <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-white shadow">
          <Check className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
      <div className="flex flex-1 items-start justify-between gap-2 p-4">
        <div className="min-w-0">
          <p className="font-bold text-stone-900">{m.navn}</p>
          <p className="mt-0.5 text-xs text-stone-500">{m.undertitel}</p>
        </div>
        <InfoIkon tekst={m.info} navn={m.navn} />
      </div>
    </Valgkort>
  );
}

function Trin2Materialer({ kategorier, materialer, saetMaterialer }) {
  return (
    <section>
      <Overskrift
        eyebrow="Trin 2 · Materialer"
        titel="Vælg materialer og stil"
        tekst="Tryk på info-ikonet ved hvert kort. Der står det, vi ellers ville have fortalt dig, mens vi stod i haven."
      />

      <div className="space-y-8">
        {kategorier.map((kat) => {
          const k = KATEGORIER[kat];
          const Ikon = k.ikon;
          return (
            <div key={kat}>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-stone-900">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${k.farve} text-white`}>
                  <Ikon className="h-4 w-4" aria-hidden="true" />
                </span>
                {k.navn}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {MATERIALER[kat].map((m) => (
                  <Materialekort
                    key={m.id}
                    m={m}
                    valgt={materialer[kat] === m.id}
                    vaelg={() => saetMaterialer((v) => ({ ...v, [kat]: m.id }))}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ==========================================================================
   6. TRIN 3 — ARBEJDSFORDELINGEN
   ========================================================================== */

function Trin3Arbejde({ niveau, saetNiveau, gravM2 }) {
  const tons = Math.round(gravM2 * PRIS.jordPrM2);
  return (
    <section>
      <Overskrift
        eyebrow="Trin 3 · Arbejdsfordeling"
        titel="Hvor meget vil du selv?"
        tekst="Din egen indsats kan sænke prisen mærkbart. Men den skal vælges med åbne øjne — derfor fortæller vi ærligt, hvad arbejdet kræver."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {NIVEAUER.map((n) => {
          const Ikon = n.ikon;
          const valgt = niveau === n.id;
          return (
            <Valgkort
              key={n.id}
              valgt={valgt}
              vaelg={() => saetNiveau(n.id)}
              label={n.titel}
              className="relative flex flex-col rounded-2xl border-2 bg-white p-5 text-left"
            >
              {n.badge && (
                <span className="absolute -top-2.5 left-5 rounded-full bg-emerald-700 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  {n.badge}
                </span>
              )}
              <div className="mb-3 flex items-center justify-between">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${valgt ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
                  <Ikon className="h-5 w-5" aria-hidden="true" />
                </span>
                {valgt && <CheckCircle2 className="h-6 w-6 text-emerald-700" aria-hidden="true" />}
              </div>
              <p className="text-base font-extrabold leading-snug text-stone-900">{n.titel}</p>
              <p className={`mt-1 text-sm font-bold ${n.faktor < 1 ? 'text-emerald-700' : 'text-stone-500'}`}>
                {n.faktor < 1 ? `Ca. −${Math.round((1 - n.faktor) * 100)}% på anlægsprisen` : 'Fuld pris — og nul besvær'}
              </p>

              <div className="mt-4">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-400">Du klarer</p>
                <ul className="space-y-1">
                  {n.dig.map((t) => (
                    <li key={t} className="flex gap-2 text-sm text-stone-600">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stone-400" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">Vi klarer</p>
                <ul className="space-y-1">
                  {n.os.map((t) => (
                    <li key={t} className="flex gap-2 text-sm text-stone-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Valgkort>
          );
        })}
      </div>

      {niveau && NIVEAUER.find((n) => n.id === niveau)?.advarsel && (
        <div className="mt-5">
          <Advarsel>
            <p>
              Advarsel: At grave ud til f.eks. 40m2 belægning svarer til at håndtere og bortskaffe ca. 18 tons jord.
              Det kræver maskiner eller ekstremt god fysik.
            </p>
            {gravM2 > 0 && (
              <p className="font-semibold">
                Dit projekt: {gravM2} m² udgravning ≈ {tons} tons jord — cirka {Math.max(1, Math.ceil(tons / 3.5))} containere,
                der skal fyldes og køres væk.
              </p>
            )}
            <p className="text-amber-900/80">
              Vælger du alligevel selv at rydde, får du en tjekliste med dybder, faldkrav og containerstørrelser i din rapport.
            </p>
          </Advarsel>
        </div>
      )}
    </section>
  );
}

/* ==========================================================================
   7. TRIN 4 — FREMTIDSSIKRING
   ========================================================================== */

function Trin4Service({ maengder, services, saetServices, harBelaegning }) {
  const mulige = SERVICES.filter((s) => s.kraever(maengder));
  return (
    <section>
      <Overskrift
        eyebrow="Trin 4 · Fremtidssikring"
        titel="Hold haven, som den blev afleveret"
        tekst="En have er ikke færdig, når vi kører. Vælg det, du ikke selv vil stå med — du kan altid ændre det senere."
      />

      <ul className="space-y-3">
        {mulige.map((s) => {
          const Ikon = s.ikon;
          const valgt = services.includes(s.id);
          return (
            <li key={s.id}>
              <label
                className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 bg-white p-4 transition ${
                  valgt ? 'border-emerald-700 ring-4 ring-emerald-600/10' : 'border-stone-200 hover:border-emerald-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={valgt}
                  onChange={() => saetServices((v) => (valgt ? v.filter((x) => x !== s.id) : [...v, s.id]))}
                  className="sr-only"
                />
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${
                    valgt ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-stone-300 bg-white'
                  }`}
                  aria-hidden="true"
                >
                  {valgt && <Check className="h-4 w-4" />}
                </span>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${valgt ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
                  <Ikon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-stone-900">{s.navn}</span>
                  <span className="block text-xs text-stone-500">{s.tekst}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-extrabold text-stone-900">{kr(s.pris(maengder))}</span>
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-stone-400">pr. år</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="mt-5">
        <Videnboks titel="Flisepest og forsegling">
          Nye fliser er modtagelige for flisepest. En årlig algebehandling forsegler overfladen og forlænger levetiden.
          {!harBelaegning && ' (Algebehandling vises, så snart du har markeret en belægning i trin 1.)'}
        </Videnboks>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-stone-500">
        Abonnementer er årlige og opsigelige med en måneds varsel. De indgår ikke i anlægsprisen, men vises separat i din rapport.
      </p>
    </section>
  );
}

/* ==========================================================================
   8. TRIN 5 — PRISESTIMATET
   ========================================================================== */

function Trin5Pris({ beregning, niveau, services, antalNaale }) {
  const n = NIVEAUER.find((x) => x.id === niveau);
  return (
    <section>
      <Overskrift
        eyebrow="Trin 5 · Dit estimat"
        titel="Her er prisen — før vi spørger om noget som helst"
        tekst="Du skal kunne tage stilling, før du giver dine oplysninger fra dig. Derfor står tallet her, og ikke bag en formular."
      />

      <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-800 to-emerald-950 p-6 text-white sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Dit projekt-estimat</p>
        <p className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">
          {kr(beregning.lav)} <span className="text-emerald-400">–</span> {kr(beregning.hoej)}
        </p>
        <p className="mt-2 text-sm font-semibold text-emerald-200">inkl. moms · anlægsarbejdet udført af Faurlund ApS</p>

        {beregning.serviceAar > 0 && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            Service: {kr(beregning.serviceAar)} pr. år
          </p>
        )}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-500">Sådan er estimatet regnet</h3>
          <ul className="divide-y divide-stone-100">
            {beregning.linjer.map((l) => (
              <li key={l.navn} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 text-stone-700">
                  {l.navn}
                  {l.detalje && <span className="block text-xs text-stone-400">{l.detalje}</span>}
                </span>
                <span className="shrink-0 font-semibold text-stone-900">{kr(l.beloeb)}</span>
              </li>
            ))}
            <li className="flex items-baseline justify-between gap-3 py-2 text-sm">
              <span className="text-stone-700">
                Arbejdsfordeling
                <span className="block text-xs text-stone-400">{n?.titel}</span>
              </span>
              <span className="shrink-0 font-semibold text-emerald-700">
                {n && n.faktor < 1 ? `− ${Math.round((1 - n.faktor) * 100)}%` : 'Fuld udførelse'}
              </span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-500">Prisen dækker altid</h3>
          <ul className="space-y-2">
            {[
              'Opmåling, afsætning og projektstyring',
              'Materialer leveret på adressen',
              'Fagligt korrekt bærelag og opbygning',
              'Bortkørsel af affald fra vores eget arbejde',
              '5 års garanti på udførelsen',
              'Fast kontaktperson hele vejen',
            ].map((t) => (
              <li key={t} className="flex gap-2 text-sm text-stone-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <p className="flex gap-2.5 text-xs leading-relaxed text-stone-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
          <span>
            <strong className="font-bold text-stone-800">Hvorfor et spænd og ikke ét tal?</strong> Spændet dækker de forhold,
            ingen kan se på et billede: jordbunden (blød lerjord kræver mere opbygning end sandjord), adgangsforholdene
            (kan maskinerne komme ind, eller skal alt bæres?), samt afvanding og eksisterende installationer.
            Efter et gratis havebesøg får du en fast pris uden spænd.
            {antalNaale > 0 &&
              ` Estimatet er regnet på ${antalNaale} markeret${antalNaale === 1 ? '' : 'e'} område${
                antalNaale === 1 ? '' : 'r'
              } fra dit billede.`}
            {services.length > 0 && ' Serviceabonnementer er ikke medregnet i anlægsprisen.'}
          </span>
        </p>
      </div>
    </section>
  );
}

/* ==========================================================================
   9. TRIN 6 — KONVERTERINGEN
   ========================================================================== */

function Trin6Lead({ lead, saetLead, send, sender, fejl }) {
  return (
    <section>
      <Overskrift
        eyebrow="Trin 6 · Din rapport"
        titel="Download dit fulde Have-Projekt"
        tekst="Få tilsendt en lækker, skræddersyet PDF med billeder, materialer, vores anlægsgartners tips til din egen-indsats og det udspecificerede prisestimat."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"
          >
            <Felt
              ikon={User}
              label="Navn"
              name="name"
              autoComplete="name"
              required
              placeholder="Dit fulde navn"
              value={lead.navn}
              onChange={(e) => saetLead((v) => ({ ...v, navn: e.target.value }))}
            />
            <Felt
              ikon={Mail}
              label="E-mail"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="dig@eksempel.dk"
              value={lead.email}
              onChange={(e) => saetLead((v) => ({ ...v, email: e.target.value }))}
            />
            <Felt
              ikon={Phone}
              label="Telefonnummer"
              name="tel"
              type="tel"
              autoComplete="tel"
              required
              placeholder="12 34 56 78"
              value={lead.telefon}
              onChange={(e) => saetLead((v) => ({ ...v, telefon: e.target.value }))}
            />

            <label className="flex cursor-pointer gap-3 rounded-xl bg-stone-50 p-3">
              <input
                type="checkbox"
                checked={lead.samtykke}
                onChange={(e) => saetLead((v) => ({ ...v, samtykke: e.target.checked }))}
                required
                className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-700"
              />
              <span className="text-xs leading-relaxed text-stone-600">
                Ja tak, send mig rapporten, og ring til mig om et gratis havebesøg. Vi bruger kun dine oplysninger til dit
                eget projekt, videregiver dem aldrig, og du kan få dem slettet med én mail.
              </span>
            </label>

            {fejl && <p className="text-sm font-semibold text-red-600">{fejl}</p>}

            <button
              type="submit"
              disabled={sender}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-700 px-6 py-4 text-base font-extrabold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {sender ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Bygger din rapport …
                </>
              ) : (
                <>
                  <FileDown className="h-5 w-5" aria-hidden="true" /> Få min projekt-rapport og pris
                </>
              )}
            </button>

            <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-stone-400">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Ingen nyhedsbreve. Ingen videresalg. Ingen forpligtelser.
            </p>
          </form>
        </div>

        <aside className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-800">Rapporten indeholder</h3>
            <ul className="mt-3 space-y-2">
              {[
                'Dit havebillede med alle nåle og mål',
                'De valgte materialer og hvorfor de holder',
                'Anlægsgartnerens tips til din egen-indsats',
                'Udspecificeret prisestimat, linje for linje',
                'Serviceplan for de første fem år',
              ].map((t) => (
                <li key={t} className="flex gap-2 text-sm text-emerald-950">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-bold text-stone-900">Faurlund ApS</p>
                <p className="mt-1 text-xs leading-relaxed text-stone-600">
                  Autoriseret anlægsgartner · 5 års garanti på udførelsen · Fast kontaktperson · Vi ringer inden for én
                  hverdag, og aldrig uden for almindelig arbejdstid.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Kvittering({ lead, beregning, pdfStatus, igen }) {
  return (
    <section className="py-6 text-center">
      <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
      </span>
      <h2 className="text-2xl font-extrabold text-stone-900 sm:text-3xl">Tak, {lead.navn.split(' ')[0] || 'og velkommen'}!</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-stone-600 sm:text-base">
        Din projekt-rapport er på vej til <strong className="font-bold text-stone-900">{lead.email}</strong>. Vi ringer på{' '}
        <strong className="font-bold text-stone-900">{lead.telefon}</strong> inden for én hverdag for at aftale et gratis
        havebesøg — der bliver estimatet til en fast pris.
      </p>

      <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-stone-200 bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Dit estimat</p>
        <p className="mt-1 text-xl font-extrabold text-emerald-800">
          {kr(beregning.lav)} – {kr(beregning.hoej)}
        </p>
      </div>

      {pdfStatus && (
        <p className="mx-auto mt-4 max-w-md rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {pdfStatus}
        </p>
      )}

      <button
        type="button"
        onClick={igen}
        className="mt-6 text-sm font-bold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
      >
        Start et nyt projekt
      </button>
    </section>
  );
}

/* ==========================================================================
   10. HOVEDKOMPONENT
   ========================================================================== */

export default function FaurlundHavePartner({ onLead }) {
  const [trin, setTrin] = useState(1);
  const [billede, saetBillede] = useState(null);
  const [naale, saetNaale] = useState([]);
  const [materialer, saetMaterialer] = useState({});
  const [niveau, saetNiveau] = useState(2);
  const [services, saetServices] = useState([]);
  const [lead, saetLead] = useState({ navn: '', email: '', telefon: '', samtykke: false });
  const [sender, saetSender] = useState(false);
  const [fejl, saetFejl] = useState('');
  const [sendt, saetSendt] = useState(false);
  const [pdfStatus, saetPdfStatus] = useState('');

  /* --- Afledte mængder ---------------------------------------------------- */
  const kategorier = useMemo(() => [...new Set(naale.map((n) => n.kategori))], [naale]);

  const maengder = useMemo(() => {
    const sum = (kat) => naale.filter((n) => n.kategori === kat).reduce((a, n) => a + n.maengde, 0);
    return {
      belaegningM2: sum('belaegning'),
      traeM2: sum('traeterrasse'),
      bedM2: sum('bed'),
      haekLbm: sum('haek'),
      graesM2: sum('graes'),
      total: naale.reduce((a, n) => a + n.maengde, 0),
    };
  }, [naale]);

  /** m² der reelt skal graves ud — driver advarslen om tons jord. */
  const gravM2 = useMemo(
    () => naale.filter((n) => KATEGORIER[n.kategori].graver).reduce((a, n) => a + n.maengde, 0),
    [naale],
  );

  /* --- Mock-prisberegning ------------------------------------------------- */
  const beregning = useMemo(() => {
    const linjer = [];
    let anlaeg = 0;

    kategorier.forEach((kat) => {
      const k = KATEGORIER[kat];
      const m = naale.filter((n) => n.kategori === kat).reduce((a, n) => a + n.maengde, 0);
      if (!m) return;
      const mat = MATERIALER[kat].find((x) => x.id === materialer[kat]) || MATERIALER[kat][0];
      const beloeb = m * k.pris * mat.faktor;
      anlaeg += beloeb;
      linjer.push({
        navn: `${k.navn} · ${mat.navn}`,
        detalje: `${m} ${k.enhed} × ${kr(k.pris * mat.faktor).replace(' kr.', ' kr.')}/${k.enhed}`,
        beloeb,
      });
    });

    if (anlaeg > 0) {
      anlaeg += PRIS.opstart;
      linjer.push({ navn: 'Opstart og projektstyring', detalje: 'Opmåling, afsætning, koordinering', beloeb: PRIS.opstart });
    }

    const faktor = NIVEAUER.find((n) => n.id === niveau)?.faktor ?? 1;
    const total = anlaeg * faktor;
    const serviceAar = SERVICES.filter((s) => services.includes(s.id)).reduce((a, s) => a + s.pris(maengder), 0);

    return {
      linjer,
      total,
      lav: rund(total * PRIS.spaendNed),
      hoej: rund(total * PRIS.spaendOp),
      serviceAar,
    };
  }, [kategorier, naale, materialer, niveau, services, maengder]);

  /* --- Navigation --------------------------------------------------------- */
  const kanFortsaette = useMemo(() => {
    if (trin === 1) return naale.length > 0;
    if (trin === 2) return kategorier.every((k) => materialer[k]);
    if (trin === 3) return Boolean(niveau);
    return true;
  }, [trin, naale, kategorier, materialer, niveau]);

  const hjaelpetekst = useMemo(() => {
    if (trin === 1 && naale.length === 0) return 'Sæt mindst én nål på billedet for at komme videre.';
    if (trin === 2 && !kanFortsaette) return 'Vælg et materiale i hver kategori.';
    return '';
  }, [trin, naale, kanFortsaette]);

  const gaa = useCallback((retning) => {
    setTrin((t) => Math.min(TRIN.length, Math.max(1, t + retning)));
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /* --- Rapport: jsPDF hvis den findes, ellers pæn fallback ---------------- */
  const byggRapport = useCallback(async () => {
    const data = {
      kunde: lead,
      naale: naale.map((n) => ({
        kategori: KATEGORIER[n.kategori].navn,
        maengde: `${n.maengde} ${KATEGORIER[n.kategori].enhed}`,
        materiale: (MATERIALER[n.kategori].find((m) => m.id === materialer[n.kategori]) || MATERIALER[n.kategori][0]).navn,
      })),
      arbejdsfordeling: NIVEAUER.find((n) => n.id === niveau)?.titel,
      services: SERVICES.filter((s) => services.includes(s.id)).map((s) => s.navn),
      estimat: `${kr(beregning.lav)} – ${kr(beregning.hoej)}`,
      serviceAar: beregning.serviceAar ? kr(beregning.serviceAar) : 'Ingen',
    };

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      let y = 20;
      const linje = (t, storrelse = 11, fed = false, mellemrum = 6) => {
        doc.setFont('helvetica', fed ? 'bold' : 'normal');
        doc.setFontSize(storrelse);
        doc.splitTextToSize(t, 170).forEach((l) => {
          if (y > 275) {
            doc.addPage();
            y = 20;
          }
          doc.text(l, 20, y);
          y += mellemrum;
        });
      };

      doc.setFillColor(4, 108, 78);
      doc.rect(0, 0, 210, 34, 'F');
      doc.setTextColor(255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('Faurlunds Have-Partner', 20, 17);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text('Dit skræddersyede haveprojekt', 20, 25);
      doc.setTextColor(30);
      y = 48;

      linje(`Til: ${data.kunde.navn}`, 12, true);
      linje(`${data.kunde.email} · ${data.kunde.telefon}`, 10, false, 8);

      linje('Dit projekt', 14, true, 8);
      data.naale.forEach((n, i) => linje(`${i + 1}. ${n.kategori} — ${n.maengde} · ${n.materiale}`, 11));

      y += 4;
      linje('Arbejdsfordeling', 14, true, 8);
      linje(data.arbejdsfordeling, 11, false, 8);

      linje('Prisestimat inkl. moms', 14, true, 8);
      beregning.linjer.forEach((l) => linje(`${l.navn}: ${kr(l.beloeb)}`, 11));
      y += 2;
      linje(`Samlet estimat: ${data.estimat}`, 13, true, 8);
      linje(
        'Spændet dækker ukendte jordbunds- og adgangsforhold. Efter et gratis havebesøg får du en fast pris.',
        9,
        false,
        5,
      );

      y += 4;
      linje('Service pr. år', 14, true, 8);
      linje(data.services.length ? `${data.services.join(', ')} — ${data.serviceAar}` : 'Ingen valgt', 11, false, 8);

      if (billede) {
        try {
          doc.addPage();
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.text('Din have med nåle', 20, 20);
          doc.addImage(billede, 20, 28, 170, 106);
        } catch {
          /* Billedformatet kunne ikke indlejres — resten af rapporten står stadig. */
        }
      }

      doc.save('Faurlund-haveprojekt.pdf');
      return 'Din PDF er downloadet — vi sender også en kopi på mail.';
    } catch {
      console.log('[Faurlunds Have-Partner] Projekt-rapport (demo — jspdf ikke installeret):', data);
      return 'Din rapport er bygget og sendt til din mail. (Demo: indholdet er logget i browserkonsollen.)';
    }
  }, [lead, naale, materialer, niveau, services, beregning, billede]);

  const send = useCallback(async () => {
    saetFejl('');
    if (!lead.navn.trim() || !lead.email.includes('@') || lead.telefon.trim().length < 6) {
      saetFejl('Udfyld navn, en gyldig e-mail og et telefonnummer, så vi kan sende rapporten.');
      return;
    }
    saetSender(true);
    try {
      const status = await byggRapport();
      onLead?.({ lead, naale, materialer, niveau, services, estimat: beregning });
      saetPdfStatus(status);
      saetSendt(true);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      saetFejl('Noget gik galt. Prøv igen, eller ring til os på 12 34 56 78.');
      console.error(e);
    } finally {
      saetSender(false);
    }
  }, [lead, naale, materialer, niveau, services, beregning, byggRapport, onLead]);

  const nulstil = () => {
    setTrin(1);
    saetBillede(null);
    saetNaale([]);
    saetMaterialer({});
    saetNiveau(2);
    saetServices([]);
    saetLead({ navn: '', email: '', telefon: '', samtykke: false });
    saetSendt(false);
    saetPdfStatus('');
  };

  /* --- Render ------------------------------------------------------------- */
  return (
    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl shadow-stone-900/5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-900 px-4 py-4 text-white sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700">
            <Leaf className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-base font-extrabold leading-tight">Faurlunds Have-Partner</p>
            <p className="text-xs text-emerald-200">Fra idé til færdig have — med prisen på bordet fra start</p>
          </div>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold sm:inline-flex">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" /> 5 års garanti
        </span>
      </div>

      {!sendt && <Trinbjaelke trin={trin} />}

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        {sendt ? (
          <Kvittering lead={lead} beregning={beregning} pdfStatus={pdfStatus} igen={nulstil} />
        ) : (
          <>
            {trin === 1 && (
              <Trin1Kortlaeg billede={billede} saetBillede={saetBillede} naale={naale} saetNaale={saetNaale} />
            )}
            {trin === 2 && (
              <Trin2Materialer kategorier={kategorier} materialer={materialer} saetMaterialer={saetMaterialer} />
            )}
            {trin === 3 && <Trin3Arbejde niveau={niveau} saetNiveau={saetNiveau} gravM2={gravM2} />}
            {trin === 4 && (
              <Trin4Service
                maengder={maengder}
                services={services}
                saetServices={saetServices}
                harBelaegning={maengder.belaegningM2 > 0}
              />
            )}
            {trin === 5 && (
              <Trin5Pris beregning={beregning} niveau={niveau} services={services} antalNaale={naale.length} />
            )}
            {trin === 6 && (
              <Trin6Lead lead={lead} saetLead={saetLead} send={send} sender={sender} fejl={fejl} />
            )}

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-stone-200 pt-5">
              <button
                type="button"
                onClick={() => gaa(-1)}
                disabled={trin === 1}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-bold text-stone-700 transition hover:border-stone-400 disabled:invisible"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Tilbage
              </button>

              <div className="flex items-center gap-3">
                {hjaelpetekst && <p className="hidden text-xs font-semibold text-stone-400 sm:block">{hjaelpetekst}</p>}
                {trin < TRIN.length && (
                  <button
                    type="button"
                    onClick={() => gaa(1)}
                    disabled={!kanFortsaette}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
                  >
                    {trin === 4 ? 'Se min pris' : 'Næste'}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            {hjaelpetekst && <p className="mt-3 text-center text-xs font-semibold text-stone-400 sm:hidden">{hjaelpetekst}</p>}
          </>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-stone-200 bg-stone-50 px-4 py-4 text-[11px] font-semibold text-stone-500">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> Autoriseret anlægsgartner
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> Dine data deles aldrig
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Leaf className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> Faurlund ApS
        </span>
      </footer>
    </div>
  );
}
