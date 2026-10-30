// ============================================================
// XKDG — charging-tariffs.js  (session 37, Edu)
// ============================================================
// Charging prices kept up to date CENTRALLY: edit this file and push — every user
// gets the new prices on the next app load (service worker is network-first).
// Each user only chooses his own subscription plan in 🔋 Range & charging →
// 💳 My charging tariffs; his own rows there still win for the same operator.
//
//   network   text matched inside the charger name / operator (case-insensitive)
//   standard  €/kWh outside the bands (null = unknown → no price shown at those hours)
//   bands     "HH-HH €, …" local clock at the charger; wraps midnight ("22-07 0.39")
//   plans     subscriptions: off = discount in €/kWh on every price, monthly = fee
//   note      shown to the user
// Operators publish no open price data: prices are copied from their apps.
// ============================================================
window.XKDG_TARIFFS = {
  updated: '2026-10-30',
  operators: [
    {
      network: 'Electra',
      standard: null,            // TODO (Edu): standard app price of the other hours (15-17, 21-07)
      bands: '07-11 0.79, 11-15 0.64, 17-21 0.79',
      plans: [
        { name: 'No subscription', off: 0 },
        { name: 'Electra+ Essential', off: 0.10, monthly: 1.99 },
        { name: 'Electra+ Smart', off: 0.20 }
      ],
      note: 'App prices, Italy. Paying by card at the terminal is usually the highest price (0.79).'
    }
  ]
};
