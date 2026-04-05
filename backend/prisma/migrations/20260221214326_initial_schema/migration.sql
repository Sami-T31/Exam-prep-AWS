-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "stream_slug" AS ENUM ('NATURAL_SCIENCE', 'SOCIAL_SCIENCE');

-- CreateEnum
CREATE TYPE "difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "question_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "subscription_plan" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('TELEBIRR', 'CBE_BIRR', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "leaderboard_period" AS ENUM ('WEEKLY', 'MONTHLY', 'ALL_TIME');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'STUDENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streams" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" "stream_slug" NOT NULL,

    CONSTRAINT "streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_streams" (
    "subject_id" INTEGER NOT NULL,
    "stream_id" INTEGER NOT NULL,

    CONSTRAINT "subject_streams_pkey" PRIMARY KEY ("subject_id","stream_id")
);

-- CreateTable
CREATE TABLE "grades" (
    "id" SERIAL NOT NULL,
    "grade_number" INTEGER NOT NULL,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "grade_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "image_url" TEXT,
    "explanation" TEXT,
    "difficulty" "difficulty" NOT NULL,
    "status" "question_status" NOT NULL DEFAULT 'DRAFT',
    "topic_id" INTEGER NOT NULL,
    "grade_id" INTEGER NOT NULL,
    "year" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "option_label" TEXT NOT NULL,
    "option_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "selected_option_id" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "time_spent_seconds" INTEGER NOT NULL,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mock_exam_attempt_id" TEXT,

    CONSTRAINT "question_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_exams" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "grade_id" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "question_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "mock_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_exam_questions" (
    "id" TEXT NOT NULL,
    "mock_exam_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "mock_exam_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_exam_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "mock_exam_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "time_spent_seconds" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "mock_exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan" "subscription_plan" NOT NULL,
    "status" "subscription_status" NOT NULL DEFAULT 'PENDING',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "payment_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "method" "payment_method" NOT NULL,
    "status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "provider_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subject_id" INTEGER,
    "score" INTEGER NOT NULL,
    "period" "leaderboard_period" NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaderboard_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "streams_slug_key" ON "streams"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_name_key" ON "subjects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "grades_grade_number_key" ON "grades"("grade_number");

-- CreateIndex
CREATE INDEX "topics_subject_id_grade_id_idx" ON "topics"("subject_id", "grade_id");

-- CreateIndex
CREATE INDEX "questions_topic_id_idx" ON "questions"("topic_id");

-- CreateIndex
CREATE INDEX "questions_grade_id_idx" ON "questions"("grade_id");

-- CreateIndex
CREATE INDEX "questions_difficulty_idx" ON "questions"("difficulty");

-- CreateIndex
CREATE INDEX "questions_status_idx" ON "questions"("status");

-- CreateIndex
CREATE INDEX "questions_topic_grade_difficulty_idx" ON "questions"("topic_id", "grade_id", "difficulty");

-- CreateIndex
CREATE INDEX "questions_deleted_at_idx" ON "questions"("deleted_at");

-- CreateIndex
CREATE INDEX "question_options_question_id_idx" ON "question_options"("question_id");

-- CreateIndex
CREATE INDEX "question_attempts_user_id_idx" ON "question_attempts"("user_id");

-- CreateIndex
CREATE INDEX "question_attempts_question_id_idx" ON "question_attempts"("question_id");

-- CreateIndex
CREATE INDEX "question_attempts_user_id_attempted_at_idx" ON "question_attempts"("user_id", "attempted_at");

-- CreateIndex
CREATE INDEX "question_attempts_mock_exam_attempt_id_idx" ON "question_attempts"("mock_exam_attempt_id");

-- CreateIndex
CREATE INDEX "bookmarks_user_id_idx" ON "bookmarks"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_user_id_question_id_unique" ON "bookmarks"("user_id", "question_id");

-- CreateIndex
CREATE INDEX "mock_exams_subject_id_grade_id_idx" ON "mock_exams"("subject_id", "grade_id");

-- CreateIndex
CREATE INDEX "mock_exams_deleted_at_idx" ON "mock_exams"("deleted_at");

-- CreateIndex
CREATE INDEX "mock_exam_questions_mock_exam_id_idx" ON "mock_exam_questions"("mock_exam_id");

-- CreateIndex
CREATE UNIQUE INDEX "mock_exam_questions_exam_id_question_id_unique" ON "mock_exam_questions"("mock_exam_id", "question_id");

-- CreateIndex
CREATE INDEX "mock_exam_attempts_user_id_idx" ON "mock_exam_attempts"("user_id");

-- CreateIndex
CREATE INDEX "mock_exam_attempts_mock_exam_id_idx" ON "mock_exam_attempts"("mock_exam_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_expires_at_idx" ON "subscriptions"("status", "expires_at");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_subscription_id_idx" ON "payments"("subscription_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "leaderboard_entries_period_subject_score_idx" ON "leaderboard_entries"("period", "subject_id", "score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_entries_user_subject_period_unique" ON "leaderboard_entries"("user_id", "subject_id", "period");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_streams" ADD CONSTRAINT "subject_streams_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_streams" ADD CONSTRAINT "subject_streams_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_selected_option_id_fkey" FOREIGN KEY ("selected_option_id") REFERENCES "question_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_mock_exam_attempt_id_fkey" FOREIGN KEY ("mock_exam_attempt_id") REFERENCES "mock_exam_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exams" ADD CONSTRAINT "mock_exams_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exams" ADD CONSTRAINT "mock_exams_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exam_questions" ADD CONSTRAINT "mock_exam_questions_mock_exam_id_fkey" FOREIGN KEY ("mock_exam_id") REFERENCES "mock_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exam_questions" ADD CONSTRAINT "mock_exam_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exam_attempts" ADD CONSTRAINT "mock_exam_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exam_attempts" ADD CONSTRAINT "mock_exam_attempts_mock_exam_id_fkey" FOREIGN KEY ("mock_exam_id") REFERENCES "mock_exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
