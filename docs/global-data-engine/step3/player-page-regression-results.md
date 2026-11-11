# Step 3 player-page download — regression results

**Verdict: PASS** (3/3). Parity check over 3439 slugs took 1804 ms.

| Check | Result | Detail |
|---|---|---|
| index has every key, in the full file's order | PASS | 1861 of 1861 keys |
| every key's shard equals its array in the full file | PASS | 0 mismatches |
| player page result identical (legacy full-map lookup vs index + shard) | PASS | 3439 slugs checked, 0 differ |

## Download per player page

| | Size |
|---|---:|
| Before: full file, fetched on every player page | 33312.9 KB |
| After: index (fetched once, cached) | 67.3 KB |
| After: one player's shard — median / 90th pct / largest | 4.2 KB / 29.7 KB / 103.4 KB |
| After: all 817 shards on disk (alias keys share one) | 8632.4 KB |

| Player slug | Key resolved | Matches | Shard size |
|---|---|---:|---:|
| virat-kohli | virat-kohli | 282 | 86.1 KB |
| jasprit-bumrah | jasprit-bumrah | 158 | 43.6 KB |
| ms-dhoni | ms-dhoni | 277 | 79.4 KB |
| rashid-khan | rashid-khan | 153 | 46.9 KB |

