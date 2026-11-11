# Player pages resolved through fallback lookups

Of 788 player bios: 777 resolve to their own slug or name key, 2 through a fallback (initial+surname, surname-only or substring), 9 have no recent matches.
The patch keeps this resolution identical to before. Fallback rows need a human check: some are the same player under another key, some are a different player sharing a surname.

| Page slug | Bio name | Key used | Matches | Keys sharing that log |
|---|---|---|---:|---|
| prince-choudhary | Prince Choudhary | md-choudhary | 10 | md-choudhary, mukul-choudhary |
| wanindu-hasaranga | Wanindu Hasaranga | pinnaduwage-wanindu-hasaranga-de-silva | 37 | pwh-de-silva, pinnaduwage-wanindu-hasaranga-de-silva |
