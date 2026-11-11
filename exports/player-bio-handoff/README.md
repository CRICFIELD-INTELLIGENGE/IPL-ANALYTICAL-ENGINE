# CricField player bio handoff

all-players-18623.csv is the complete identity export with existing metadata and confidence. bio-return-template.csv is the file to fill and return. batches contains 75 smaller CSV files, up to250 players each. duplicate-review.csv contains review candidates, not confirmed duplicate people. No database rows were removed or merged.

Keep player_key and cricsheet_id unchanged. These identify the exact warehouse person even when names repeat. Do not resolve initials or same-name players by guessing. Record source URLs and the date checked for each bio. Use Unknown for missing values; do not guess from names, birthplace, teams or league membership. Playing country and citizenship are separate. International retirement is not retirement from all cricket. Auction registration, contract availability and retention need dated official sources. Keep contradictory sources in unresolved_notes. Retention predictions are not official decisions.

Return the filled template or individual batches. We can import and enrich the warehouse by stable ID, validate conflicts and preserve evidence. This export is public player metadata and has not been encrypted.
