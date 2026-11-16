# Entity Relationship Diagram (ERD)

This document maps out the foreign key relationships and schema definitions of the normalized IPL cricket analytics relational database backend.

## Mermaid Schema Diagram

```mermaid
erDiagram
    teams {
        int team_id PK
        varchar name UK
        varchar short_name
        varchar color
        int titles
    }
    players {
        int player_id PK
        varchar name UK
        varchar role
        varchar country
        varchar batting_style
        varchar bowling_style
        varchar image_url
        int form
        int clutch
        int versatility
        numeric expected_value
        varchar rarity
        varchar status
    }
    venues {
        int venue_id PK
        varchar name UK
        varchar city
        varchar pitch_type
    }
    seasons {
        varchar season_id PK
        int champion_team_id FK
        int runner_up_team_id FK
        int mvp_player_id FK
    }
    matches {
        varchar match_id PK
        varchar season_id FK
        date date
        int venue_id FK
        int team1_id FK
        int team2_id FK
        int toss_winner_id FK
        varchar toss_decision
        int winner_id FK
        varchar margin_type
        int margin_value
        varchar match_type
        int player_of_match_id FK
        varchar status
    }
    innings {
        int innings_id PK
        varchar match_id FK
        int innings_number
        int batting_team_id FK
        int bowling_team_id FK
        int runs
        int wickets
        numeric overs
    }
    deliveries {
        int delivery_id PK
        varchar match_id FK
        int innings_id FK
        int over_num
        int ball_num
        int batter_id FK
        int bowler_id FK
        int non_striker_id FK
        int batter_runs
        int extra_runs
        int total_runs
        bool is_wide
        bool is_noball
        bool is_bye
        bool is_legbye
        bool is_penalty
        bool is_boundary
        varchar delivery_type
        varchar scoring_area
        varchar pressure_state
    }
    dismissals {
        int dismissal_id PK
        int delivery_id FK
        int player_out_id FK
        varchar kind
        int fielder_id FK
    }
    partnerships {
        int partnership_id PK
        varchar match_id FK
        int innings_id FK
        int batter1_id FK
        int batter2_id FK
        int runs
        int balls
        bool unbroken
    }

    seasons }o--|| teams : "champion_team_id"
    seasons }o--|| teams : "runner_up_team_id"
    seasons }o--|| players : "mvp_player_id"

    matches }o--|| seasons : "season_id"
    matches }o--|| venues : "venue_id"
    matches }o--|| teams : "team1_id"
    matches }o--|| teams : "team2_id"
    matches }o--|| teams : "toss_winner_id"
    matches }o--|| teams : "winner_id"
    matches }o--|| players : "player_of_match_id"

    innings }o--|| matches : "match_id"
    innings }o--|| teams : "batting_team_id"
    innings }o--|| teams : "bowling_team_id"

    deliveries }o--|| matches : "match_id"
    deliveries }o--|| innings : "innings_id"
    deliveries }o--|| players : "batter_id"
    deliveries }o--|| players : "bowler_id"
    deliveries }o--|| players : "non_striker_id"

    dismissals }o--|| deliveries : "delivery_id"
    dismissals }o--|| players : "player_out_id"
    dismissals }o--|| players : "fielder_id"

    partnerships }o--|| matches : "match_id"
    partnerships }o--|| innings : "innings_id"
    partnerships }o--|| players : "batter1_id"
    partnerships }o--|| players : "batter2_id"
```

## Relational Constraints & Cascades

### 1. Cascade Deletes
To ensure referential integrity during imports and cleanup:
* **`innings`**: cascade delete when `matches` is deleted (`ON DELETE CASCADE`).
* **`deliveries`**: cascade delete when `matches` or `innings` is deleted.
* **`dismissals`**: cascade delete when `deliveries` is deleted.
* **`partnerships`**: cascade delete when `matches` or `innings` is deleted.

### 2. Nullable References (Set Null)
To prevent foreign key constraints from blocking dimension cleanups:
* **`seasons`**: setting null on `champion_team_id`, `runner_up_team_id`, and `mvp_player_id` if a team/player is deleted.
* **`matches`**: setting null on `winner_id` or `player_of_match_id`.
* **`dismissals`**: setting null on `fielder_id` if the fielder's player record is removed (e.g. sub fielder).
