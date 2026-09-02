# Freeconcept — Interaktivt lead-genereringsmodul

`freeconcept-lead-modul.html` er én selvstændig HTML-fil med al CSS (Tailwind CDN) og
vanilla JavaScript indbygget. Ingen build, ingen npm, ingen eksterne afhængigheder
ud over Tailwind-scriptet.

## Flow

1. **Vælg spor** — Spor A: Firmagaver & julegaver · Spor B: Firmatøj & tekstil merch
2. **Konfigurator** — dynamisk skema pr. spor, hvor hvert valg udløser en Ekspert-Viden-boks
3. **Åben prisberegner** — stykpris og totalpris ex. moms vises på skærmen **før** kontaktoplysninger
4. **Lead-capture** — formular placeret direkte under prisen, tilpasset det valgte spor

## Indsæt på hjemmesiden

**WordPress (anbefalet):** opret en ny side, tilføj blokken *Custom HTML* / *Egen HTML*
og indsæt hele filens indhold. Modulet har sit eget navnerum (`#fc-app`, klasser med
`fc-`-præfiks), så det kolliderer ikke med temaets styles.

**Iframe (mest isoleret):** upload filen og indlejr den:

```html
<iframe src="/moduler/freeconcept-lead-modul.html"
        style="width:100%;border:0;min-height:1400px" title="Prisberegner"></iframe>
```

**Andre CMS:** filen kan bruges som selvstændig side, som den er.

## Tilpasning

Alt, der normalt skal justeres, ligger samlet øverst i `<script>`-blokken:

| Sted | Hvad det styrer |
|---|---|
| `FC_CONFIG.endpoint` | Formular-endpoint (Formspree, HubSpot, WP `admin-ajax`, eget API). Er den tom, kører modulet i demo-tilstand og logger leadet i browserkonsollen. |
| `FC_PRICING` | Alle priser: emballage, håndtering, fragt, mængderabatter, opstart og pris pr. tryk/broderi. |
| `FC_PRODUCTS` | Produktkatalog pr. anvendelse med priser for Basis / Premium / GOTS. |
| `KB` | Teksterne i Ekspert-Viden-bokse. |
| `FC_PRICING.tax2026` | Beløbsgrænser for julegave, bagatelgrænse, reklameartikel og jubilæumsgratiale. |
| `tailwind.config` (i `<head>`-scriptet) | Farvepaletten. |

### Leadet

Formularen sender hele konfigurationen med som skjulte felter, så sælgeren kan se
præcis, hvad kunden har regnet på:

`fc_track`, `fc_config`, `fc_unit_price`, `fc_total_price`, `fc_quantity`, `fc_source`
— plus `company`, `name`, `email`, `phone`, `note` og `logo` (kun spor B).

Afsendelsen bruger `FormData`, så logo-upload virker uden ekstra opsætning, hvis
endpointet accepterer `multipart/form-data`.

## Bemærk om priser og skat

Priserne i `FC_PRICING` er markedsrealistiske estimater og skal erstattes af
Freeconcepts egne kostpriser og marginer, før modulet sættes i produktion.

Skatteoplysningerne er generel information for indkomståret 2026 (julegavegrænse
900 kr., bagatelgrænse 1.300 kr., begge inkl. moms). Kontrollér satserne ved
årsskifte — de står samlet i `FC_PRICING.tax2026`.
