# Palace test (session 48, 10/11/2026)
Question (Edu): do people famous for beauty or physique have good communication among the PALACE numbers of their birth chart?
Palace number = Early Heaven number of the lower trigram of each pillar's hexagram; "good" = `xkdgPalaceComm` in app-bazi.js (5/10/15, Hetu, same number, or a shared family for a pillar with no number link).

Data: beauty_women.json (43), beauty_men.json (41), physique.json (37; 36 after removing a duplicate). Names from external lists; kept only birth times rated AA/A on astrotheme.com (astro.com blocks automated reading). UTC offsets derived by the collectors, uncertain ones listed in their reports. Control: 92 famous people of heluo-test (not chosen for looks). Random: 20,000 charts.

Result (run.py -> result.json):
| group | n | palaces good | numbers only | weak Qi/Yun but good palaces |
|---|---|---|---|---|
| random | 20000 | 75.1% | 38.9% | 59.1% |
| control | 92 | 77.2% | 43.5% | 55.4% |
| beauty women | 43 | 79.1% | 51.2% | 46.5% |
| beauty men | 41 | 73.2% | 41.5% | 56.1% |
| physique | 36 | 63.9% | 44.4% | 41.7% |
| all beauty | 120 | 72.5% | 45.8% | 48.3% |

Primary measure (palaces good): beauty 72.5% vs control 77.2% (p 0.82) and vs random 75.1% (p 0.77): no difference.
Numbers only: 45.8% vs 38.9% random (p 0.07, one-sided), vs control p 0.43: not significant. Women alone 51% (n 43): a hint at most, one of several sub-comparisons.
Without the 28 people with an uncertain offset: 70.7% good (n 92).
Conclusion: good palaces are the norm (3 charts in 4); beauty/physique does not raise the rate.
