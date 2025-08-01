-- CreateTable
CREATE TABLE "ai_providers" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "base_url" TEXT NOT NULL,
    "auth_type" VARCHAR(20) NOT NULL DEFAULT 'api_key',
    "supported_models" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rate_limit_rpm" INTEGER NOT NULL DEFAULT 60,
    "rate_limit_tpm" INTEGER NOT NULL DEFAULT 60000,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_models" (
    "id" SERIAL NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "api_key_encrypted" TEXT,
    "model_type" VARCHAR(50) NOT NULL DEFAULT 'chat',
    "parameters" JSONB NOT NULL DEFAULT '{"temperature": 0.7, "max_tokens": 3000, "top_p": 1.0, "frequency_penalty": 0.0, "presence_penalty": 0.0}',
    "role" VARCHAR(20) NOT NULL DEFAULT 'secondary',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "cost_per_1k_tokens" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "context_window" INTEGER NOT NULL DEFAULT 4000,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_templates" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "category" VARCHAR(50) NOT NULL DEFAULT 'general',
    "system_prompt" TEXT,
    "user_prompt_template" TEXT,
    "format_instructions" TEXT,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "effectiveness_score" DECIMAL(3,2),
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_configs" (
    "id" SERIAL NOT NULL,
    "platform" VARCHAR(20) NOT NULL,
    "config_key" VARCHAR(100) NOT NULL,
    "config_value" JSONB NOT NULL,
    "data_type" VARCHAR(20) NOT NULL DEFAULT 'json',
    "category" VARCHAR(50) NOT NULL DEFAULT 'general',
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_sensitive" BOOLEAN NOT NULL DEFAULT false,
    "validation_rules" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hexagram_data" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "element" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "interpretation" TEXT,
    "favorable_actions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "unfavorable_actions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "time_info" JSONB NOT NULL DEFAULT '{}',
    "direction_info" JSONB NOT NULL DEFAULT '{}',
    "resolution_methods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hexagram_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "element_relations" (
    "id" SERIAL NOT NULL,
    "source_element" VARCHAR(20) NOT NULL,
    "target_element" VARCHAR(20) NOT NULL,
    "relation_type" VARCHAR(20) NOT NULL,
    "strength" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "effect_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "element_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "i18n_contents" (
    "id" SERIAL NOT NULL,
    "content_key" VARCHAR(200) NOT NULL,
    "language_code" VARCHAR(10) NOT NULL,
    "content_value" TEXT NOT NULL,
    "content_type" VARCHAR(50) NOT NULL DEFAULT 'text',
    "category" VARCHAR(50) NOT NULL DEFAULT 'general',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "i18n_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_call_logs" (
    "id" BIGSERIAL NOT NULL,
    "model_id" INTEGER,
    "request_id" VARCHAR(100),
    "user_id" VARCHAR(100),
    "platform" VARCHAR(20),
    "prompt_hash" VARCHAR(64),
    "tokens_used" INTEGER,
    "cost" DECIMAL(10,6),
    "response_time_ms" INTEGER,
    "status" VARCHAR(20),
    "error_message" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_statistics" (
    "id" BIGSERIAL NOT NULL,
    "date" DATE NOT NULL,
    "platform" VARCHAR(20) NOT NULL,
    "metric_name" VARCHAR(100) NOT NULL,
    "metric_value" BIGINT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(100),
    "role" VARCHAR(50) NOT NULL DEFAULT 'admin',
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "resource_type" VARCHAR(50) NOT NULL,
    "resource_id" VARCHAR(100),
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_providers_name_key" ON "ai_providers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ai_models_provider_id_name_key" ON "ai_models"("provider_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_templates_name_version_key" ON "prompt_templates"("name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "app_configs_platform_config_key_key" ON "app_configs"("platform", "config_key");

-- CreateIndex
CREATE UNIQUE INDEX "hexagram_data_name_key" ON "hexagram_data"("name");

-- CreateIndex
CREATE UNIQUE INDEX "element_relations_source_element_target_element_key" ON "element_relations"("source_element", "target_element");

-- CreateIndex
CREATE UNIQUE INDEX "i18n_contents_content_key_language_code_key" ON "i18n_contents"("content_key", "language_code");

-- CreateIndex
CREATE UNIQUE INDEX "usage_statistics_date_platform_metric_name_key" ON "usage_statistics"("date", "platform", "metric_name");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- AddForeignKey
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ai_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_templates" ADD CONSTRAINT "prompt_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_call_logs" ADD CONSTRAINT "api_call_logs_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_logs" ADD CONSTRAINT "operation_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
