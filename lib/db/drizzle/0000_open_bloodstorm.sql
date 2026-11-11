CREATE TABLE `ai_insights` (
	`insight_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` text,
	`title` text NOT NULL,
	`insight` text NOT NULL,
	`confidence` integer NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`match_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `articles` (
	`article_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`excerpt` text,
	`content` text,
	`tag` text,
	`read_time` text,
	`published_date` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auction_roi` (
	`player_id` integer PRIMARY KEY NOT NULL,
	`base_price` real,
	`sale_price` real,
	`bought_by_team_id` integer,
	`form` integer,
	`clutch` integer,
	`versatility` integer,
	`expected_value` real,
	`roi_multiplier` real,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`player_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bought_by_team_id`) REFERENCES `teams`(`team_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `clutch_index` (
	`player_id` integer PRIMARY KEY NOT NULL,
	`clutch_score` real DEFAULT 0 NOT NULL,
	`clutch_runs` integer DEFAULT 0 NOT NULL,
	`clutch_wickets` integer DEFAULT 0 NOT NULL,
	`strike_rate` real DEFAULT 0 NOT NULL,
	`economy` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`player_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `current_squad` (
	`squad_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`season_id` text,
	`role` text,
	`designation` text,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`player_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`team_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`season_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_player_squad` ON `current_squad` (`player_id`,`team_id`);--> statement-breakpoint
CREATE TABLE `deliveries` (
	`delivery_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` text,
	`innings_id` integer,
	`over_num` integer NOT NULL,
	`ball_num` integer NOT NULL,
	`batter_id` integer,
	`bowler_id` integer,
	`non_striker_id` integer,
	`batter_runs` integer DEFAULT 0 NOT NULL,
	`extra_runs` integer DEFAULT 0 NOT NULL,
	`total_runs` integer DEFAULT 0 NOT NULL,
	`is_wide` integer DEFAULT false NOT NULL,
	`is_noball` integer DEFAULT false NOT NULL,
	`is_bye` integer DEFAULT false NOT NULL,
	`is_legbye` integer DEFAULT false NOT NULL,
	`is_penalty` integer DEFAULT false NOT NULL,
	`is_boundary` integer DEFAULT false NOT NULL,
	`delivery_type` text,
	`scoring_area` text,
	`pressure_state` text DEFAULT 'Standard' NOT NULL,
	`phase` text,
	`is_dot_ball` integer DEFAULT false NOT NULL,
	`is_death_over` integer DEFAULT false NOT NULL,
	`is_powerplay` integer DEFAULT false NOT NULL,
	`current_rr` real DEFAULT 0 NOT NULL,
	`required_rr` real DEFAULT 0 NOT NULL,
	`wickets_left` integer DEFAULT 10 NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`match_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`innings_id`) REFERENCES `innings`(`innings_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`batter_id`) REFERENCES `players`(`player_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bowler_id`) REFERENCES `players`(`player_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`non_striker_id`) REFERENCES `players`(`player_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `dismissals` (
	`dismissal_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`delivery_id` integer,
	`player_out_id` integer,
	`kind` text NOT NULL,
	`fielder_id` integer,
	FOREIGN KEY (`delivery_id`) REFERENCES `deliveries`(`delivery_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_out_id`) REFERENCES `players`(`player_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`fielder_id`) REFERENCES `players`(`player_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`favorite_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_user_favorite` ON `favorites` (`user_id`,`target_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `feed_events` (
	`event_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` text,
	`time` text,
	`type` text,
	`message` text NOT NULL,
	`icon` text,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`match_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `innings` (
	`innings_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` text,
	`innings_number` integer NOT NULL,
	`batting_team_id` integer,
	`bowling_team_id` integer,
	`runs` integer DEFAULT 0 NOT NULL,
	`wickets` integer DEFAULT 0 NOT NULL,
	`overs` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`match_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`batting_team_id`) REFERENCES `teams`(`team_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bowling_team_id`) REFERENCES `teams`(`team_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_innings_per_match` ON `innings` (`match_id`,`innings_number`);--> statement-breakpoint
CREATE TABLE `matches` (
	`match_id` text PRIMARY KEY NOT NULL,
	`season_id` text,
	`date` text,
	`venue_id` integer,
	`team1_id` integer,
	`team2_id` integer,
	`toss_winner_id` integer,
	`toss_decision` text,
	`winner_id` integer,
	`margin_type` text,
	`margin_value` integer,
	`match_type` text,
	`player_of_match_id` integer,
	`status` text DEFAULT 'Finished' NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`season_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`venue_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team1_id`) REFERENCES `teams`(`team_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team2_id`) REFERENCES `teams`(`team_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`toss_winner_id`) REFERENCES `teams`(`team_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`winner_id`) REFERENCES `teams`(`team_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_of_match_id`) REFERENCES `players`(`player_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `momentum_tracker` (
	`tracker_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` text NOT NULL,
	`innings_number` integer NOT NULL,
	`over_num` integer NOT NULL,
	`runs` integer DEFAULT 0 NOT NULL,
	`wickets` integer DEFAULT 0 NOT NULL,
	`momentum_score` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`match_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `partnership_stats` (
	`partnership_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` text NOT NULL,
	`batter1_id` integer NOT NULL,
	`batter2_id` integer NOT NULL,
	`total_runs` integer DEFAULT 0 NOT NULL,
	`total_balls` integer DEFAULT 0 NOT NULL,
	`century_partnerships` integer DEFAULT 0 NOT NULL,
	`half_century_partnerships` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`match_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`batter1_id`) REFERENCES `players`(`player_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batter2_id`) REFERENCES `players`(`player_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `partnerships` (
	`partnership_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` text,
	`innings_id` integer,
	`batter1_id` integer,
	`batter2_id` integer,
	`runs` integer DEFAULT 0 NOT NULL,
	`balls` integer DEFAULT 0 NOT NULL,
	`unbroken` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`match_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`innings_id`) REFERENCES `innings`(`innings_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`batter1_id`) REFERENCES `players`(`player_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batter2_id`) REFERENCES `players`(`player_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `player_career_stats` (
	`player_id` integer PRIMARY KEY NOT NULL,
	`role` text,
	`matches` integer DEFAULT 0 NOT NULL,
	`innings` integer DEFAULT 0 NOT NULL,
	`runs` integer DEFAULT 0 NOT NULL,
	`balls` integer DEFAULT 0 NOT NULL,
	`average` real DEFAULT 0 NOT NULL,
	`strike_rate` real DEFAULT 0 NOT NULL,
	`fours` integer DEFAULT 0 NOT NULL,
	`sixes` integer DEFAULT 0 NOT NULL,
	`fifties` integer DEFAULT 0 NOT NULL,
	`hundreds` integer DEFAULT 0 NOT NULL,
	`highest_score` integer DEFAULT 0 NOT NULL,
	`wickets` integer DEFAULT 0 NOT NULL,
	`economy` real DEFAULT 0 NOT NULL,
	`bowling_average` real DEFAULT 0 NOT NULL,
	`bowling_strike_rate` real DEFAULT 0 NOT NULL,
	`five_wickets` integer DEFAULT 0 NOT NULL,
	`best_figures` text DEFAULT '0/0' NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`player_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `player_matchups` (
	`batter_id` integer NOT NULL,
	`bowler_id` integer NOT NULL,
	`runs` integer DEFAULT 0 NOT NULL,
	`balls` integer DEFAULT 0 NOT NULL,
	`dismissals` integer DEFAULT 0 NOT NULL,
	`strike_rate` real DEFAULT 0 NOT NULL,
	`average` real DEFAULT 0 NOT NULL,
	PRIMARY KEY(`batter_id`, `bowler_id`),
	FOREIGN KEY (`batter_id`) REFERENCES `players`(`player_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bowler_id`) REFERENCES `players`(`player_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `player_phase_stats` (
	`player_id` integer NOT NULL,
	`phase` text NOT NULL,
	`batting_runs` integer DEFAULT 0 NOT NULL,
	`batting_balls` integer DEFAULT 0 NOT NULL,
	`batting_strike_rate` real DEFAULT 0 NOT NULL,
	`bowling_runs` integer DEFAULT 0 NOT NULL,
	`bowling_balls` integer DEFAULT 0 NOT NULL,
	`bowling_wickets` integer DEFAULT 0 NOT NULL,
	`bowling_economy` real DEFAULT 0 NOT NULL,
	PRIMARY KEY(`player_id`, `phase`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`player_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `player_season_stats` (
	`player_id` integer NOT NULL,
	`season_id` text NOT NULL,
	`matches` integer DEFAULT 0 NOT NULL,
	`innings` integer DEFAULT 0 NOT NULL,
	`runs` integer DEFAULT 0 NOT NULL,
	`balls` integer DEFAULT 0 NOT NULL,
	`average` real DEFAULT 0 NOT NULL,
	`strike_rate` real DEFAULT 0 NOT NULL,
	`wickets` integer DEFAULT 0 NOT NULL,
	`economy` real DEFAULT 0 NOT NULL,
	PRIMARY KEY(`player_id`, `season_id`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`player_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`season_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `player_team_history` (
	`history_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`season_id` text NOT NULL,
	`start_season_id` text,
	`end_season_id` text,
	`current_team` integer DEFAULT false NOT NULL,
	`squad_role` text,
	`franchise_role` text,
	`representation_scope` text DEFAULT 'franchise-legacy' NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`player_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`team_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`season_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`start_season_id`) REFERENCES `seasons`(`season_id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`end_season_id`) REFERENCES `seasons`(`season_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_player_team_season` ON `player_team_history` (`player_id`,`team_id`,`season_id`);--> statement-breakpoint
CREATE TABLE `player_team_stats` (
	`player_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`matches` integer DEFAULT 0 NOT NULL,
	`innings` integer DEFAULT 0 NOT NULL,
	`runs` integer DEFAULT 0 NOT NULL,
	`balls` integer DEFAULT 0 NOT NULL,
	`average` real DEFAULT 0 NOT NULL,
	`strike_rate` real DEFAULT 0 NOT NULL,
	`wickets` integer DEFAULT 0 NOT NULL,
	`economy` real DEFAULT 0 NOT NULL,
	PRIMARY KEY(`player_id`, `team_id`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`player_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`team_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `players` (
	`player_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`role` text,
	`country` text,
	`batting_style` text,
	`bowling_style` text,
	`image_url` text,
	`form` integer,
	`clutch` integer,
	`versatility` integer,
	`expected_value` numeric,
	`rarity` text DEFAULT 'Standard' NOT NULL,
	`status` text DEFAULT 'POOL' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `players_name_unique` ON `players` (`name`);--> statement-breakpoint
CREATE TABLE `pulse_events` (
	`pulse_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` text NOT NULL,
	`over_num` integer NOT NULL,
	`team1_momentum` integer,
	`team2_momentum` integer,
	`excitement` integer,
	`anxiety` integer,
	`shock` integer,
	`hope` integer,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`match_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_pulse_over` ON `pulse_events` (`match_id`,`over_num`);--> statement-breakpoint
CREATE TABLE `query_history` (
	`history_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`filters` text NOT NULL,
	`executed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`report_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`tag` text,
	`frequency` text,
	`file_url` text
);
--> statement-breakpoint
CREATE TABLE `saved_queries` (
	`query_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`name` text NOT NULL,
	`filters` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`season_id` text PRIMARY KEY NOT NULL,
	`champion_team_id` integer,
	`runner_up_team_id` integer,
	`mvp_player_id` integer,
	FOREIGN KEY (`champion_team_id`) REFERENCES `teams`(`team_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`runner_up_team_id`) REFERENCES `teams`(`team_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mvp_player_id`) REFERENCES `players`(`player_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `team_intelligence` (
	`team_id` integer PRIMARY KEY NOT NULL,
	`matches` integer DEFAULT 0 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`win_pct` real DEFAULT 0 NOT NULL,
	`titles` integer DEFAULT 0 NOT NULL,
	`avg_score` real DEFAULT 0 NOT NULL,
	`avg_economy` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`team_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`team_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`short_name` text NOT NULL,
	`color` text NOT NULL,
	`titles` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_name_unique` ON `teams` (`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`user_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `venue_intelligence` (
	`venue_id` integer PRIMARY KEY NOT NULL,
	`matches` integer DEFAULT 0 NOT NULL,
	`avg_1st_innings` real DEFAULT 0 NOT NULL,
	`avg_2nd_innings` real DEFAULT 0 NOT NULL,
	`batting_first_win_pct` real DEFAULT 0 NOT NULL,
	`chasing_win_pct` real DEFAULT 0 NOT NULL,
	`pitch_type` text DEFAULT 'Balanced' NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`venue_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `venues` (
	`venue_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`city` text,
	`pitch_type` text DEFAULT 'Balanced' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `venues_name_unique` ON `venues` (`name`);