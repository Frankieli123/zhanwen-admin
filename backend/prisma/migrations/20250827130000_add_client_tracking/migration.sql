-- CreateTable
CREATE TABLE "client_apps" (
    "id" SERIAL NOT NULL,
    "client_id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "platform" VARCHAR(20) NOT NULL,
    "version" VARCHAR(50),
    "owner" VARCHAR(100),
    "contact_email" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "api_key_id" INTEGER,
    "last_active_at" TIMESTAMP(3),
    "total_requests" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" BIGINT NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_apps_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "api_call_logs" ADD COLUMN "client_id" VARCHAR(100);

-- AlterTable
ALTER TABLE "usage_statistics" ADD COLUMN "client_id" VARCHAR(100);

-- CreateIndex
CREATE UNIQUE INDEX "client_apps_client_id_key" ON "client_apps"("client_id");

-- DropIndex (if exists)
DROP INDEX IF EXISTS "usage_statistics_date_platform_metricName_key";

-- CreateIndex
CREATE UNIQUE INDEX "usage_statistics_date_platform_clientId_metricName_key" ON "usage_statistics"("date", "platform", "client_id", "metric_name");

-- AddForeignKey
ALTER TABLE "api_call_logs" ADD CONSTRAINT "api_call_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_apps"("client_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_statistics" ADD CONSTRAINT "usage_statistics_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_apps"("client_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_apps" ADD CONSTRAINT "client_apps_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
