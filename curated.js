/* ============================================================================
 * curated.js  —  XKDG curated "resonance" data
 * ----------------------------------------------------------------------------
 * The SOUL layer. Hand-picked by the master: places of character that no API
 * filters well — intimate agriturismi & locande, osterie true to the territory,
 * and "places of power" (megaliths, sacred sites, ley spots) that aren't
 * businesses at all. The Resonance Finder consults this list ALONGSIDE
 * Foursquare; curated entries always win on character (they're chosen by hand)
 * and only have to pass the metaphysical gate (favourable direction + hour).
 *
 * HOW TO ADD A PLACE (you only ever edit the three arrays below):
 *   1. Copy one of the example objects.
 *   2. Fill name, lat, lon (decimal degrees — e.g. from Google Maps: right-click
 *      a pin -> the two numbers are lat, lon).
 *   3. Set "kind": "lodging" | "dining" | "power".
 *   4. Optional but useful fields are explained in the schema comment.
 *   5. Save, push. Nothing else to wire — the Finder picks it up automatically.
 *
 * The example rows below are PLACEHOLDERS marked "ESEMPIO". Replace them with
 * your real pilot-region places (e.g. Toscana or Dolomiti) and delete the
 * examples. Leaving them in does no harm, but they aren't real recommendations.
 *
 * ----------------------------------------------------------------------------
 * SCHEMA  (every field except name/lat/lon/kind is optional)
 *   name        string   display name
 *   lat, lon    number   decimal degrees
 *   kind        string   "lodging" | "dining" | "power"
 *   category    string   free label shown to the user ("Agriturismo", "Osteria",
 *                        "Locanda", "Megalith", "Sacred site", ...)
 *   note        string   the curator's one-line reason it's special (shown in UI)
 *   url         string   website / map link (optional)
 *   tel         string   phone (optional)
 *   price       number   1-4 (optional; lodging or dining)
 *   board       string   LODGING ONLY — meal regime, drives the meal-incassi:
 *                        "room_only"     -> all 3 meal windows free to "cash"
 *                        "breakfast"     -> breakfast fixed; lunch+dinner free
 *                        "half_board"    -> only lunch free
 *                        "self_catering" -> kitchenette; you choose
 *                        (omit / null    -> treated as unknown = all windows free)
 *   tags        string[] free tags ("km0","family-run","vegetarian","view",
 *                        "vineyard","spa","dog-friendly", ...)
 * ==========================================================================*/

(function () {
  'use strict';

  window.CURATED = {

    /* ---- ALLOGGI di carattere --------------------------------------------- */
    lodging: [
      {
        // ESEMPIO — sostituisci con un tuo alloggio reale e cancella questa riga
        name: 'ESEMPIO Podere (sostituire)',
        lat: 43.3200, lon: 11.3300,
        kind: 'lodging',
        category: 'Agriturismo',
        note: 'Family-run farm stay, olive grove, no tour buses.',
        board: 'breakfast',
        price: 2,
        tags: ['km0', 'family-run', 'view']
      }
    ],

    /* ---- TAVOLA: osterie/trattorie di territorio --------------------------- */
    dining: [
      {
        // ESEMPIO — sostituisci con un tuo ristorante reale e cancella questa riga
        name: 'ESEMPIO Osteria (sostituire)',
        lat: 43.3180, lon: 11.3290,
        kind: 'dining',
        category: 'Osteria',
        note: 'Hyper-local, seasonal, short supply chain.',
        price: 2,
        tags: ['km0', 'traditional']
      }
    ],

    /* ---- LUOGHI DI POTERE: megaliti, siti sacri, "luoghi di risonanza" ----- */
    power: [
      {
        // ESEMPIO — sostituisci con un tuo luogo reale e cancella questa riga
        name: 'ESEMPIO Megalith (sostituire)',
        lat: 43.3000, lon: 11.3000,
        kind: 'power',
        category: 'Megalith',
        note: 'Standing stone aligned to the solstice.',
        tags: ['megalith', 'solstice']
      }
    ]
  };

  /* --- haversine (km) ----------------------------------------------------- */
  function distKm(aLat, aLon, bLat, bLon) {
    const R = 6371;
    const dLat = (bLat - aLat) * Math.PI / 180;
    const dLon = (bLon - aLon) * Math.PI / 180;
    const s1 = Math.sin(dLat / 2), s2 = Math.sin(dLon / 2);
    const a = s1 * s1 + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * s2 * s2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  /* Normalise a curated row into the SAME record shape the Foursquare worker
     returns, so the Resonance Finder can treat both sources uniformly.        */
  function normalise(row, fromLat, fromLon) {
    const d = (fromLat != null && fromLon != null)
      ? Math.round(distKm(fromLat, fromLon, row.lat, row.lon) * 1000)
      : null;
    return {
      source: 'curated',
      id: 'cur:' + (row.name || '').replace(/\s+/g, '_'),
      name: row.name || 'Place',
      lat: row.lat, lon: row.lon,
      kind: row.kind || 'lodging',
      category: row.category || '',
      categories: row.category ? [row.category] : [],
      rating: null, popularity: null,
      price: (row.price != null) ? row.price : null,
      chain: false,
      board: row.board || null,
      note: row.note || '',
      url: row.url || '',
      tel: row.tel || '',
      address: row.address || '',
      tags: row.tags || [],
      distance: d
    };
  }

  /* curatedNear(kind, lat, lon, radiusKm) -> normalised records within radius.
     kind: "lodging" | "dining" | "power".                                     */
  window.curatedNear = function (kind, lat, lon, radiusKm) {
    const list = (window.CURATED && window.CURATED[kind]) || [];
    const r = (radiusKm != null && isFinite(radiusKm)) ? radiusKm : 1e9;
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const row = list[i];
      if (!row || row.lat == null || row.lon == null) continue;
      if (lat != null && lon != null && distKm(lat, lon, row.lat, row.lon) > r) continue;
      out.push(normalise(row, lat, lon));
    }
    return out;
  };

  window.curatedDistKm = distKm;
})();
