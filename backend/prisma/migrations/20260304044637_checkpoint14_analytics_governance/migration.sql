-- CreateEnum
CREATE TYPE "app_platform" AS ENUM ('WEB', 'MOBILE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "region" TEXT NOT NULL DEFAULT 'UNKNOWN';

-- CreateTable
CREATE TABLE "consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "analytics_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "personalization_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "marketing_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "accepted_terms_at" TIMESTAMP(3),
    "accepted_privacy_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "platform" "app_platform" NOT NULL DEFAULT 'WEB',
    "app_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_usage_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "metadata" JSONB,
    "platform" "app_platform" NOT NULL DEFAULT 'WEB',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "seconds_watched" INTEGER NOT NULL DEFAULT 0,
    "percent_complete" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_position_sec" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_active_metrics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "platform" "app_platform" NOT NULL,
    "total_sessions" INTEGER NOT NULL DEFAULT 0,
    "unique_active_users" INTEGER NOT NULL DEFAULT 0,
    "average_sessions_per_user" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "average_session_duration_sec" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_active_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signup_retention_metrics" (
    "id" TEXT NOT NULL,
    "cohort_date" TIMESTAMP(3) NOT NULL,
    "platform" "app_platform" NOT NULL,
    "cohort_size" INTEGER NOT NULL DEFAULT 0,
    "day1_retention_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "day7_retention_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "day30_retention_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signup_retention_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_accuracy_aggregates" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "topic_id" INTEGER NOT NULL,
    "grade_id" INTEGER NOT NULL,
    "cohort_size" INTEGER NOT NULL DEFAULT 0,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "accuracy_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_accuracy_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_miss_aggregates" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "question_id" TEXT NOT NULL,
    "cohort_size" INTEGER NOT NULL DEFAULT 0,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "miss_count" INTEGER NOT NULL DEFAULT 0,
    "miss_rate_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_miss_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_region_engagement_aggregates" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "grade_id" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "cohort_size" INTEGER NOT NULL DEFAULT 0,
    "session_count" INTEGER NOT NULL DEFAULT 0,
    "completion_rate_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_region_engagement_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consents_user_id_key" ON "consents"("user_id");

-- CreateIndex
CREATE INDEX "app_sessions_user_id_started_at_idx" ON "app_sessions"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "app_sessions_platform_started_at_idx" ON "app_sessions"("platform", "started_at");

-- CreateIndex
CREATE INDEX "feature_usage_events_user_id_created_at_idx" ON "feature_usage_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "feature_usage_events_event_name_created_at_idx" ON "feature_usage_events"("event_name", "created_at");

-- CreateIndex
CREATE INDEX "feature_usage_events_platform_created_at_idx" ON "feature_usage_events"("platform", "created_at");

-- CreateIndex
CREATE INDEX "video_progress_user_id_updated_at_idx" ON "video_progress"("user_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "video_progress_user_id_video_id_unique" ON "video_progress"("user_id", "video_id");

-- CreateIndex
CREATE INDEX "daily_active_metrics_date_idx" ON "daily_active_metrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_active_metrics_date_platform_unique" ON "daily_active_metrics"("date", "platform");

-- CreateIndex
CREATE INDEX "signup_retention_metrics_cohort_date_idx" ON "signup_retention_metrics"("cohort_date");

-- CreateIndex
CREATE UNIQUE INDEX "signup_retention_metrics_cohort_date_platform_unique" ON "signup_retention_metrics"("cohort_date", "platform");

-- CreateIndex
CREATE INDEX "topic_accuracy_aggregates_cohort_size_idx" ON "topic_accuracy_aggregates"("cohort_size");

-- CreateIndex
CREATE INDEX "topic_accuracy_aggregates_date_idx" ON "topic_accuracy_aggregates"("date");

-- CreateIndex
CREATE UNIQUE INDEX "topic_accuracy_aggregates_date_topic_grade_unique" ON "topic_accuracy_aggregates"("date", "topic_id", "grade_id");

-- CreateIndex
CREATE INDEX "question_miss_aggregates_cohort_size_idx" ON "question_miss_aggregates"("cohort_size");

-- CreateIndex
CREATE INDEX "question_miss_aggregates_date_idx" ON "question_miss_aggregates"("date");

-- CreateIndex
CREATE UNIQUE INDEX "question_miss_aggregates_date_question_unique" ON "question_miss_aggregates"("date", "question_id");

-- CreateIndex
CREATE INDEX "grade_region_engagement_aggregates_cohort_size_idx" ON "grade_region_engagement_aggregates"("cohort_size");

-- CreateIndex
CREATE INDEX "grade_region_engagement_aggregates_date_idx" ON "grade_region_engagement_aggregates"("date");

-- CreateIndex
CREATE UNIQUE INDEX "grade_region_engagement_aggregates_date_grade_region_unique" ON "grade_region_engagement_aggregates"("date", "grade_id", "region");

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_sessions" ADD CONSTRAINT "app_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_usage_events" ADD CONSTRAINT "feature_usage_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_progress" ADD CONSTRAINT "video_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_accuracy_aggregates" ADD CONSTRAINT "topic_accuracy_aggregates_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_accuracy_aggregates" ADD CONSTRAINT "topic_accuracy_aggregates_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_miss_aggregates" ADD CONSTRAINT "question_miss_aggregates_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_region_engagement_aggregates" ADD CONSTRAINT "grade_region_engagement_aggregates_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
