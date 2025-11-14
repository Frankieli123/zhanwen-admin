/*
  Warnings:

  - Added the required column `updated_at` to the `usage_statistics` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "usage_statistics_date_platform_metric_name_key";

-- AlterTable
ALTER TABLE "api_call_logs" ADD COLUMN     "client_info" JSONB,
ADD COLUMN     "session_id" VARCHAR(100),
ADD COLUMN     "timestamp" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "client_apps" ADD COLUMN     "app_version" VARCHAR(20),
ADD COLUMN     "build_time" TIMESTAMP(3),
ADD COLUMN     "device_info" JSONB,
ADD COLUMN     "first_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "language" VARCHAR(10),
ADD COLUMN     "network_info" JSONB,
ADD COLUMN     "screen_info" JSONB,
ADD COLUMN     "timezone" VARCHAR(50),
ADD COLUMN     "user_agent" TEXT;

-- AlterTable
ALTER TABLE "prompt_texts" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "usage_statistics" ADD COLUMN     "client_info" JSONB,
ADD COLUMN     "session_id" VARCHAR(100),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" VARCHAR(100);

-- CreateTable
CREATE TABLE "divination_reading_tasks" (
    "id" BIGSERIAL NOT NULL,
    "result_id" VARCHAR(100) NOT NULL,
    "client_id" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'done',
    "reading" TEXT,
    "error_message" TEXT,
    "model_id" INTEGER,
    "model_name" VARCHAR(100),
    "tokens_used" INTEGER,
    "response_time_ms" INTEGER,
    "request_id" VARCHAR(100),
    "payload" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "divination_reading_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "divination_reading_tasks_client_id_idx" ON "divination_reading_tasks"("client_id");

-- CreateIndex
CREATE INDEX "divination_reading_tasks_status_idx" ON "divination_reading_tasks"("status");

-- CreateIndex
CREATE UNIQUE INDEX "divination_reading_tasks_result_id_key" ON "divination_reading_tasks"("result_id");

-- CreateIndex
CREATE INDEX "api_call_logs_client_id_idx" ON "api_call_logs"("client_id");

-- CreateIndex
CREATE INDEX "api_call_logs_session_id_idx" ON "api_call_logs"("session_id");

-- CreateIndex
CREATE INDEX "api_call_logs_user_id_idx" ON "api_call_logs"("user_id");

-- CreateIndex
CREATE INDEX "api_call_logs_status_idx" ON "api_call_logs"("status");

-- CreateIndex
CREATE INDEX "api_call_logs_created_at_idx" ON "api_call_logs"("created_at");

-- CreateIndex
CREATE INDEX "client_apps_platform_idx" ON "client_apps"("platform");

-- CreateIndex
CREATE INDEX "client_apps_last_active_at_idx" ON "client_apps"("last_active_at");

-- CreateIndex
CREATE INDEX "usage_statistics_date_metric_name_idx" ON "usage_statistics"("date", "metric_name");

-- CreateIndex
CREATE INDEX "usage_statistics_client_id_idx" ON "usage_statistics"("client_id");

-- CreateIndex
CREATE INDEX "usage_statistics_platform_idx" ON "usage_statistics"("platform");

-- RenameIndex
ALTER INDEX "prompt_texts_unique_name_version" RENAME TO "prompt_texts_name_version_key";

-- RenameIndex
ALTER INDEX "usage_statistics_date_platform_clientId_metricName_key" RENAME TO "usage_statistics_date_platform_client_id_metric_name_key";
