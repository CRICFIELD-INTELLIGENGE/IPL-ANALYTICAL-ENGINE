# Player identity audit — recent matches on all player pages

Resolver `artifacts\ipl-analytics\src\lib\player-recent-matches.ts`; data `artifacts\ipl-analytics\public\data`; 1 reviewed aliases. Ground truth: 809 registry ids from 1243 raw IPL files.

| Status | Pages |
|---|---:|
| correct | 778 |
| no verified identity (empty) | 10 |
| **Total** | 788 |

**correct**: shown matches equal the registry id's true match list. **MERGED** / **WRONG PLAYER**: shown matches include another person's. **INCOMPLETE** / **MISSING**: true matches not shown. **SHOWN WITHOUT VERIFIED IDENTITY**: data shown for a bio no exact rule ties to one registry id. **no verified identity (empty)**: the page shows its empty state.

## Pages that show wrong, merged or incomplete data

None.

## Pages with no verified identity (empty state)

| Page | Bio name | Bio team | Why | Register suggestion (for review, not applied) |
|---|---|---|---|---|
| aravelly-avanish | Aravelly Avanish |  | no exact identity | — |
| ajay-mandal | Ajay Mandal |  | no exact identity | — |
| swastik-chikara | Swastik Chikara |  | no exact identity | — |
| vicky-ostwal | Vicky Ostwal |  | no exact identity | — |
| gus-atkinson | Gus Atkinson |  | no exact identity | — |
| harvik-desai | Harvik Desai |  | no exact identity | — |
| prince-choudhary | Prince Choudhary |  | no exact identity | — |
| tanay-thyagarajan | Tanay Thyagarajan |  | no exact identity | — |
| abid-mushtaq | Abid Mushtaq |  | no exact identity | — |
| jhathavedh-subramanyan | Jhathavedh Subramanyan |  | no exact identity | — |

## Identities resolved only with franchise evidence

- ravi-bishnoi (Ravi Bishnoi, Rajasthan Royals) → Ravi Bishnoi (df064e1a)
- navdeep-saini (Navdeep Saini, Kolkata Knight Riders) → NA Saini (21d4e29b)
- harmeet-singh (Harmeet Singh Bansal, Punjab Kings) → Harmeet Singh (2a72fd4f)

## Written names shared by different people in the IPL files

- Harmeet Singh: Harmeet Singh (2a72fd4f) / Harmeet Singh (2) (0bf15e52)

## Links to player pages

Every written name in the IPL files (811) as `/players/<slug>`, resolved to a bio by the page's resolver (`src/lib/player-key.ts`). **WRONG PLAYER PAGE**: the link opens a bio whose verified identity is a different registry id. **no player page**: no bio matches (the page says "Player not found").

| Status | Links |
|---|---:|
| correct page | 776 |
| no player page | 34 |
| shared written name (page of one of them) | 1 |
| **Total** | 811 |

No link opens another player's page.

Links that open a page without an exact identity check (for review):

- Harmeet Singh (Harmeet Singh (2a72fd4f) / Harmeet Singh (2) (0bf15e52)) → bio harmeet-singh = Harmeet Singh (2a72fd4f): shared written name (page of one of them)

## Page headings

The heading of each page with a verified identity (`resolveProfileName`), checked against the names the IPL files give each registry id: no heading names another player.


