-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('TRIAL_PENDING', 'TRIAL_ACTIVE', 'TRIAL_ENDING', 'ACTIVE_PAID', 'PAYMENT_FAILED', 'GRACE_PERIOD', 'CANCELED', 'EXPIRED', 'SUSPENDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'SALES_CHAT_AGENT', 'BILLING_MANAGER', 'ANALYTICS_VIEWER', 'READ_ONLY_VIEWER');

-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'LIVE', 'RENEWAL_DUE', 'PAUSED', 'EXPIRED', 'AUTO_DELETED', 'ARCHIVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('QUEUED', 'SUPPRESSED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationConsentState" AS ENUM ('GRANTED', 'DENIED', 'REQUIRED', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "PolicyAction" AS ENUM ('ALLOW', 'BLOCK', 'REVIEW', 'ESCALATE');

-- CreateEnum
CREATE TYPE "FinanceAlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "TaxReturnStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'FILED', 'REMITTED', 'LOCKED', 'CORRECTION_REQUIRED');

-- CreateEnum
CREATE TYPE "TaxRemittanceStatus" AS ENUM ('PENDING', 'APPROVED', 'SUBMITTED', 'PAID', 'OVERDUE', 'FAILED');

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('IMPRESSION', 'VIEW', 'CLICK', 'INQUIRY', 'SHARE', 'DOWNLOAD', 'SAVE', 'SEARCH', 'MATCH', 'CHAT_MESSAGE', 'RESPONSE_TIME');

-- CreateEnum
CREATE TYPE "AnalyticsEntityType" AS ENUM ('PROFILE', 'LISTING', 'SEARCH_RESULT', 'MATCH', 'CHAT_THREAD', 'MEDIA_ASSET');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'ASSIGNED', 'WAITING_ON_ADVERTISER', 'WAITING_ON_REQUESTER', 'RESOLVED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ConversationParticipantRole" AS ENUM ('REQUESTER', 'ADVERTISER', 'TENANT_AGENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ConversationNotificationType" AS ENUM ('NEW_CONVERSATION', 'NEW_MESSAGE', 'ASSIGNMENT', 'SLA_DUE_SOON', 'SLA_BREACHED');

-- CreateEnum
CREATE TYPE "ConsentState" AS ENUM ('GRANTED', 'DENIED', 'NOT_REQUIRED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Continent" (
    "code" VARCHAR(8) NOT NULL,
    "name" VARCHAR(80) NOT NULL,

    CONSTRAINT "Continent_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Country" (
    "code" VARCHAR(2) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "flagEmoji" VARCHAR(16) NOT NULL,
    "continentCode" VARCHAR(8) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,
    "currencyName" VARCHAR(80) NOT NULL,
    "locale" VARCHAR(24) NOT NULL,
    "timezone" VARCHAR(80) NOT NULL,
    "monthlySubscriptionAmount" DECIMAL(18,4) NOT NULL,
    "isPilot" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "IndustryCategory" (
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndustryCategory_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "displayName" VARCHAR(160) NOT NULL,
    "phone" VARCHAR(80),
    "passwordHash" TEXT,
    "passwordSalt" TEXT,
    "passwordIterations" INTEGER,
    "emailVerifiedAt" TIMESTAMP(3),
    "mfaRequired" BOOLEAN NOT NULL DEFAULT false,
    "mfaEnrolledAt" TIMESTAMP(3),
    "lastMfaVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "displayName" VARCHAR(160) NOT NULL,
    "legalName" VARCHAR(240),
    "countryCode" VARCHAR(2) NOT NULL,
    "primaryIndustryCode" VARCHAR(80),
    "primaryRole" VARCHAR(80),
    "onboardingUserType" VARCHAR(80),
    "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL_PENDING',
    "trialStartedAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "paidStartedAt" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "role" VARCHAR(80) NOT NULL,
    "mfaRequired" BOOLEAN NOT NULL DEFAULT true,
    "mfaVerified" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TermsAcceptanceEvidence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "locale" VARCHAR(24) NOT NULL,
    "termsVersion" VARCHAR(80) NOT NULL,
    "privacyVersion" VARCHAR(80) NOT NULL,
    "prohibitedContentVersion" VARCHAR(80) NOT NULL,
    "subscriptionTermsVersion" VARCHAR(80) NOT NULL,
    "appSurface" VARCHAR(40) NOT NULL,
    "acceptanceSource" VARCHAR(80) NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL,
    "ipHash" TEXT,
    "deviceHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TermsAcceptanceEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "role" VARCHAR(80) NOT NULL,
    "scopeLevel" VARCHAR(40) NOT NULL,
    "regionCode" VARCHAR(40),
    "continentCode" VARCHAR(8),
    "countryCode" VARCHAR(2),
    "scopedTenantId" TEXT,
    "mfaRequired" BOOLEAN NOT NULL DEFAULT true,
    "assignedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessDecisionAudit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "actorUserId" VARCHAR(120) NOT NULL,
    "role" VARCHAR(80) NOT NULL,
    "permission" VARCHAR(80) NOT NULL,
    "scopeLevel" VARCHAR(40) NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "reason" VARCHAR(80) NOT NULL,
    "targetTenantId" TEXT,
    "targetCountryCode" VARCHAR(2),
    "targetContinentCode" VARCHAR(8),
    "targetRegionCode" VARCHAR(40),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessDecisionAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileDraft" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "industryCode" VARCHAR(80) NOT NULL,
    "role" VARCHAR(80) NOT NULL,
    "displayName" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "phone" VARCHAR(80),
    "email" VARCHAR(320),
    "website" VARCHAR(500),
    "status" "ProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishedProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "industryCode" VARCHAR(80) NOT NULL,
    "role" VARCHAR(80) NOT NULL,
    "displayName" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "phone" VARCHAR(80),
    "email" VARCHAR(320),
    "website" VARCHAR(500),
    "status" "ProfileStatus" NOT NULL DEFAULT 'LIVE',
    "version" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "renewalAlert35At" TIMESTAMP(3),
    "renewalAlert39At" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishedProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "title" VARCHAR(160) NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" VARCHAR(120) NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "consentState" "NotificationConsentState" NOT NULL,
    "locale" VARCHAR(24),
    "timezone" VARCHAR(80),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationOutboxRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "severity" VARCHAR(40) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" VARCHAR(80),
    "entityId" VARCHAR(120),
    "selectedChannels" JSONB NOT NULL,
    "suppressedChannels" JSONB NOT NULL,
    "requiresImmediateAttention" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationOutboxRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDeliveryAttempt" (
    "id" TEXT NOT NULL,
    "notificationOutboxRecordId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL,
    "provider" VARCHAR(80),
    "providerReference" VARCHAR(160),
    "failureReason" TEXT,
    "attemptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" "AnalyticsEventType" NOT NULL,
    "entityType" "AnalyticsEntityType" NOT NULL,
    "entityId" VARCHAR(120) NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "industryCode" VARCHAR(80),
    "consentState" "ConsentState" NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceRecordId" VARCHAR(120) NOT NULL,
    "sourceName" VARCHAR(200) NOT NULL,
    "sourceRole" VARCHAR(80) NOT NULL,
    "inquiryType" VARCHAR(80) NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "priority" VARCHAR(40) NOT NULL,
    "matchConfidence" INTEGER NOT NULL,
    "responseSlaHours" INTEGER NOT NULL,
    "assigneeUserId" TEXT,
    "assigneeDisplayName" VARCHAR(160),
    "openedAt" TIMESTAMP(3) NOT NULL,
    "firstResponseDueAt" TIMESTAMP(3) NOT NULL,
    "firstResponseAt" TIMESTAMP(3),
    "lastInboundMessageAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "blockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderRole" "ConversationParticipantRole" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationNotification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "type" "ConversationNotificationType" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "message" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyPolicyDecision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "sourceSurface" VARCHAR(80) NOT NULL,
    "action" "PolicyAction" NOT NULL,
    "category" VARCHAR(80),
    "policyCode" VARCHAR(80),
    "matchedTerm" VARCHAR(240),
    "reviewedBy" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyPolicyDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryTaxProfile" (
    "id" TEXT NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "taxAuthorityName" VARCHAR(200) NOT NULL,
    "taxRegistrationStatus" VARCHAR(80) NOT NULL,
    "filingPortalUrl" VARCHAR(500),
    "localFinanceOwner" VARCHAR(160) NOT NULL,
    "filingFrequency" VARCHAR(80) NOT NULL,
    "recordRetentionYears" INTEGER NOT NULL,
    "taxInclusivePricing" BOOLEAN NOT NULL DEFAULT true,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryTaxProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRuleVersion" (
    "id" TEXT NOT NULL,
    "countryTaxProfileId" TEXT NOT NULL,
    "taxType" VARCHAR(80) NOT NULL,
    "taxRate" DECIMAL(9,6) NOT NULL,
    "productTaxCode" VARCHAR(120) NOT NULL,
    "registrationThreshold" DECIMAL(18,4),
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxRuleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxCalculationSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "taxRuleVersionId" TEXT,
    "provider" VARCHAR(80) NOT NULL,
    "providerReference" VARCHAR(160),
    "grossAmount" DECIMAL(18,4) NOT NULL,
    "taxableAmount" DECIMAL(18,4) NOT NULL,
    "taxAmount" DECIMAL(18,4) NOT NULL,
    "netRevenueAmount" DECIMAL(18,4) NOT NULL,
    "presentmentCurrency" VARCHAR(3) NOT NULL,
    "filingCurrency" VARCHAR(3) NOT NULL,
    "exchangeRate" DECIMAL(18,8),
    "customerEvidence" JSONB NOT NULL,
    "calculationReason" VARCHAR(240) NOT NULL,
    "transactionAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxCalculationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxLedgerEntry" (
    "id" TEXT NOT NULL,
    "taxCalculationSnapshotId" TEXT NOT NULL,
    "entryType" VARCHAR(80) NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxReturn" (
    "id" TEXT NOT NULL,
    "countryTaxProfileId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "filingDeadline" TIMESTAMP(3) NOT NULL,
    "paymentDeadline" TIMESTAMP(3) NOT NULL,
    "taxType" VARCHAR(80) NOT NULL,
    "filingCurrency" VARCHAR(3) NOT NULL,
    "computedTaxDue" DECIMAL(18,4) NOT NULL,
    "status" "TaxReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "filedAt" TIMESTAMP(3),
    "authorityReference" VARCHAR(200),
    "evidenceUrl" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRemittance" (
    "id" TEXT NOT NULL,
    "taxReturnId" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,
    "status" "TaxRemittanceStatus" NOT NULL DEFAULT 'PENDING',
    "paymentReference" VARCHAR(200),
    "submittedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "evidenceUrl" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRemittance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceAlert" (
    "id" TEXT NOT NULL,
    "countryTaxProfileId" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "alertType" VARCHAR(80) NOT NULL,
    "message" TEXT NOT NULL,
    "severity" VARCHAR(40) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "FinanceAlertStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationRun" (
    "id" TEXT NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "provider" VARCHAR(80) NOT NULL,
    "calculatedTax" DECIMAL(18,4) NOT NULL,
    "collectedTax" DECIMAL(18,4) NOT NULL,
    "varianceAmount" DECIMAL(18,4) NOT NULL,
    "status" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditNote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chargeback" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" VARCHAR(80) NOT NULL,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chargeback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "actorUserId" TEXT,
    "action" VARCHAR(160) NOT NULL,
    "entityType" VARCHAR(120) NOT NULL,
    "entityId" VARCHAR(120),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Country_continentCode_idx" ON "Country"("continentCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Tenant_countryCode_idx" ON "Tenant"("countryCode");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE INDEX "TenantMembership_userId_idx" ON "TenantMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMembership_tenantId_userId_key" ON "TenantMembership"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_tenantId_idx" ON "AuthSession"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_revokedAt_idx" ON "AuthSession"("expiresAt", "revokedAt");

-- CreateIndex
CREATE INDEX "TermsAcceptanceEvidence_userId_tenantId_idx" ON "TermsAcceptanceEvidence"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "TermsAcceptanceEvidence_tenantId_acceptedAt_idx" ON "TermsAcceptanceEvidence"("tenantId", "acceptedAt");

-- CreateIndex
CREATE INDEX "TermsAcceptanceEvidence_countryCode_acceptedAt_idx" ON "TermsAcceptanceEvidence"("countryCode", "acceptedAt");

-- CreateIndex
CREATE INDEX "AccessAssignment_userId_role_idx" ON "AccessAssignment"("userId", "role");

-- CreateIndex
CREATE INDEX "AccessAssignment_tenantId_role_idx" ON "AccessAssignment"("tenantId", "role");

-- CreateIndex
CREATE INDEX "AccessAssignment_scopeLevel_regionCode_continentCode_countr_idx" ON "AccessAssignment"("scopeLevel", "regionCode", "continentCode", "countryCode");

-- CreateIndex
CREATE INDEX "AccessAssignment_scopedTenantId_idx" ON "AccessAssignment"("scopedTenantId");

-- CreateIndex
CREATE INDEX "AccessAssignment_revokedAt_expiresAt_idx" ON "AccessAssignment"("revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "AccessDecisionAudit_tenantId_createdAt_idx" ON "AccessDecisionAudit"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AccessDecisionAudit_actorUserId_createdAt_idx" ON "AccessDecisionAudit"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AccessDecisionAudit_allowed_reason_idx" ON "AccessDecisionAudit"("allowed", "reason");

-- CreateIndex
CREATE INDEX "AccessDecisionAudit_targetCountryCode_targetRegionCode_idx" ON "AccessDecisionAudit"("targetCountryCode", "targetRegionCode");

-- CreateIndex
CREATE INDEX "ProfileDraft_tenantId_status_idx" ON "ProfileDraft"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ProfileDraft_countryCode_industryCode_idx" ON "ProfileDraft"("countryCode", "industryCode");

-- CreateIndex
CREATE INDEX "PublishedProfile_tenantId_status_idx" ON "PublishedProfile"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PublishedProfile_status_expiresAt_idx" ON "PublishedProfile"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "PublishedProfile_countryCode_industryCode_idx" ON "PublishedProfile"("countryCode", "industryCode");

-- CreateIndex
CREATE INDEX "Notification_tenantId_status_scheduledFor_idx" ON "Notification"("tenantId", "status", "scheduledFor");

-- CreateIndex
CREATE INDEX "Notification_entityType_entityId_idx" ON "Notification"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "NotificationPreference_tenantId_enabled_idx" ON "NotificationPreference"("tenantId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_tenantId_userId_channel_key" ON "NotificationPreference"("tenantId", "userId", "channel");

-- CreateIndex
CREATE INDEX "NotificationOutboxRecord_tenantId_createdAt_idx" ON "NotificationOutboxRecord"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationOutboxRecord_eventType_severity_idx" ON "NotificationOutboxRecord"("eventType", "severity");

-- CreateIndex
CREATE INDEX "NotificationOutboxRecord_entityType_entityId_idx" ON "NotificationOutboxRecord"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "NotificationDeliveryAttempt_channel_status_idx" ON "NotificationDeliveryAttempt"("channel", "status");

-- CreateIndex
CREATE INDEX "NotificationDeliveryAttempt_attemptedAt_idx" ON "NotificationDeliveryAttempt"("attemptedAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_tenantId_occurredAt_idx" ON "AnalyticsEvent"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_tenantId_eventType_occurredAt_idx" ON "AnalyticsEvent"("tenantId", "eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_countryCode_industryCode_occurredAt_idx" ON "AnalyticsEvent"("countryCode", "industryCode", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_entityType_entityId_occurredAt_idx" ON "AnalyticsEvent"("entityType", "entityId", "occurredAt");

-- CreateIndex
CREATE INDEX "Conversation_tenantId_status_updatedAt_idx" ON "Conversation"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Conversation_tenantId_assigneeUserId_status_idx" ON "Conversation"("tenantId", "assigneeUserId", "status");

-- CreateIndex
CREATE INDEX "Conversation_tenantId_firstResponseDueAt_idx" ON "Conversation"("tenantId", "firstResponseDueAt");

-- CreateIndex
CREATE INDEX "Conversation_sourceRecordId_idx" ON "Conversation"("sourceRecordId");

-- CreateIndex
CREATE INDEX "ConversationMessage_tenantId_conversationId_createdAt_idx" ON "ConversationMessage"("tenantId", "conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ConversationMessage_senderRole_createdAt_idx" ON "ConversationMessage"("senderRole", "createdAt");

-- CreateIndex
CREATE INDEX "ConversationNotification_tenantId_type_scheduledFor_idx" ON "ConversationNotification"("tenantId", "type", "scheduledFor");

-- CreateIndex
CREATE INDEX "ConversationNotification_conversationId_idx" ON "ConversationNotification"("conversationId");

-- CreateIndex
CREATE INDEX "SafetyPolicyDecision_tenantId_action_idx" ON "SafetyPolicyDecision"("tenantId", "action");

-- CreateIndex
CREATE INDEX "SafetyPolicyDecision_category_idx" ON "SafetyPolicyDecision"("category");

-- CreateIndex
CREATE INDEX "SafetyPolicyDecision_createdAt_idx" ON "SafetyPolicyDecision"("createdAt");

-- CreateIndex
CREATE INDEX "CountryTaxProfile_countryCode_idx" ON "CountryTaxProfile"("countryCode");

-- CreateIndex
CREATE INDEX "TaxRuleVersion_countryTaxProfileId_taxType_idx" ON "TaxRuleVersion"("countryTaxProfileId", "taxType");

-- CreateIndex
CREATE INDEX "TaxRuleVersion_effectiveFrom_effectiveTo_idx" ON "TaxRuleVersion"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "TaxCalculationSnapshot_tenantId_transactionAt_idx" ON "TaxCalculationSnapshot"("tenantId", "transactionAt");

-- CreateIndex
CREATE INDEX "TaxCalculationSnapshot_countryCode_transactionAt_idx" ON "TaxCalculationSnapshot"("countryCode", "transactionAt");

-- CreateIndex
CREATE INDEX "TaxLedgerEntry_entryType_occurredAt_idx" ON "TaxLedgerEntry"("entryType", "occurredAt");

-- CreateIndex
CREATE INDEX "TaxReturn_countryTaxProfileId_periodStart_periodEnd_idx" ON "TaxReturn"("countryTaxProfileId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "TaxReturn_status_paymentDeadline_idx" ON "TaxReturn"("status", "paymentDeadline");

-- CreateIndex
CREATE INDEX "TaxRemittance_status_idx" ON "TaxRemittance"("status");

-- CreateIndex
CREATE INDEX "FinanceAlert_status_dueAt_idx" ON "FinanceAlert"("status", "dueAt");

-- CreateIndex
CREATE INDEX "FinanceAlert_assignedToUserId_idx" ON "FinanceAlert"("assignedToUserId");

-- CreateIndex
CREATE INDEX "ReconciliationRun_countryCode_periodStart_periodEnd_idx" ON "ReconciliationRun"("countryCode", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "CreditNote_tenantId_idx" ON "CreditNote"("tenantId");

-- CreateIndex
CREATE INDEX "Refund_tenantId_idx" ON "Refund"("tenantId");

-- CreateIndex
CREATE INDEX "Chargeback_tenantId_status_idx" ON "Chargeback"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "Country" ADD CONSTRAINT "Country_continentCode_fkey" FOREIGN KEY ("continentCode") REFERENCES "Continent"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermsAcceptanceEvidence" ADD CONSTRAINT "TermsAcceptanceEvidence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermsAcceptanceEvidence" ADD CONSTRAINT "TermsAcceptanceEvidence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessAssignment" ADD CONSTRAINT "AccessAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessAssignment" ADD CONSTRAINT "AccessAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessDecisionAudit" ADD CONSTRAINT "AccessDecisionAudit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileDraft" ADD CONSTRAINT "ProfileDraft_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileDraft" ADD CONSTRAINT "ProfileDraft_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedProfile" ADD CONSTRAINT "PublishedProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedProfile" ADD CONSTRAINT "PublishedProfile_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationOutboxRecord" ADD CONSTRAINT "NotificationOutboxRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDeliveryAttempt" ADD CONSTRAINT "NotificationDeliveryAttempt_notificationOutboxRecordId_fkey" FOREIGN KEY ("notificationOutboxRecordId") REFERENCES "NotificationOutboxRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationNotification" ADD CONSTRAINT "ConversationNotification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationNotification" ADD CONSTRAINT "ConversationNotification_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryTaxProfile" ADD CONSTRAINT "CountryTaxProfile_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRuleVersion" ADD CONSTRAINT "TaxRuleVersion_countryTaxProfileId_fkey" FOREIGN KEY ("countryTaxProfileId") REFERENCES "CountryTaxProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxCalculationSnapshot" ADD CONSTRAINT "TaxCalculationSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxCalculationSnapshot" ADD CONSTRAINT "TaxCalculationSnapshot_taxRuleVersionId_fkey" FOREIGN KEY ("taxRuleVersionId") REFERENCES "TaxRuleVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxLedgerEntry" ADD CONSTRAINT "TaxLedgerEntry_taxCalculationSnapshotId_fkey" FOREIGN KEY ("taxCalculationSnapshotId") REFERENCES "TaxCalculationSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxReturn" ADD CONSTRAINT "TaxReturn_countryTaxProfileId_fkey" FOREIGN KEY ("countryTaxProfileId") REFERENCES "CountryTaxProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRemittance" ADD CONSTRAINT "TaxRemittance_taxReturnId_fkey" FOREIGN KEY ("taxReturnId") REFERENCES "TaxReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAlert" ADD CONSTRAINT "FinanceAlert_countryTaxProfileId_fkey" FOREIGN KEY ("countryTaxProfileId") REFERENCES "CountryTaxProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAlert" ADD CONSTRAINT "FinanceAlert_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
