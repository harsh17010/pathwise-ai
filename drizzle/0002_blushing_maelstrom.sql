CREATE TABLE `catalog_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(96) NOT NULL,
	`title` varchar(255) NOT NULL,
	`type` enum('course','project','resource','assessment') NOT NULL,
	`description` text NOT NULL,
	`level` enum('Beginner','Intermediate','Advanced') NOT NULL,
	`durationHours` int NOT NULL,
	`format` varchar(96) NOT NULL,
	`source` varchar(96) NOT NULL,
	`catalogFact` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `catalog_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_entries_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
CREATE TABLE `catalog_skills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`catalogEntryId` int NOT NULL,
	`skill` varchar(120) NOT NULL,
	`coverage` int NOT NULL DEFAULT 1,
	CONSTRAINT `catalog_skills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pathId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`sequence` int NOT NULL,
	`completionCriteria` text NOT NULL,
	`status` enum('planned','in_progress','completed') NOT NULL DEFAULT 'planned',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `progress_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pathItemId` int NOT NULL,
	`eventType` enum('started','completed','skipped','deferred','reopened') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `progress_events_id` PRIMARY KEY(`id`)
);
