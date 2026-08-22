CREATE TABLE `learner_chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pathId` int,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `learner_chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learner_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pathItemId` int NOT NULL,
	`rating` enum('too_easy','just_right','too_difficult','not_relevant','prefer_hands_on') NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `learner_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learner_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`goal` text NOT NULL,
	`currentLevel` enum('Beginner','Intermediate','Advanced') NOT NULL,
	`knownSkills` json NOT NULL,
	`timelineWeeks` int NOT NULL,
	`weeklyHours` int NOT NULL,
	`preferredFormats` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learner_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `learner_profile_user_idx` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `learning_paths` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`goalSnapshot` text NOT NULL,
	`skillGaps` json NOT NULL,
	`rationale` text NOT NULL,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learning_paths_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `path_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pathId` int NOT NULL,
	`catalogId` varchar(96) NOT NULL,
	`title` varchar(255) NOT NULL,
	`type` enum('course','practice','project','assessment') NOT NULL,
	`sequence` int NOT NULL,
	`reason` text NOT NULL,
	`skills` json NOT NULL,
	`durationHours` int NOT NULL,
	`status` enum('planned','in_progress','completed','skipped','deferred') NOT NULL DEFAULT 'planned',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `path_items_id` PRIMARY KEY(`id`)
);
