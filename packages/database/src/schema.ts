import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  integer,
  date,
  check,
  foreignKey,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

const createdAt = timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt,
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull().unique(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt,
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('session_user_id_idx').on(table.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt,
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('account_user_id_idx').on(table.userId)],
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt,
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);

export const administrativeAudit = pgTable('administrative_audit', {
  id: text('id').primaryKey(),
  action: text('action').notNull(),
  targetUserId: text('target_user_id').references(() => user.id, { onDelete: 'set null' }),
  targetEmail: text('target_email').notNull(),
  createdAt,
});

// Domain: Family Space and Memberships

export const familySpace = pgTable('family_spaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt,
});

export const familyMembershipRoleEnum = pgEnum('family_membership_role', ['member', 'admin']);

export const familyMembership = pgTable(
  'family_memberships',
  {
    id: text('id').primaryKey(),
    spaceId: text('space_id')
      .notNull()
      .references(() => familySpace.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: familyMembershipRoleEnum('role').notNull().default('member'),
    createdAt,
  },
  (table) => [
    index('family_membership_space_id_idx').on(table.spaceId),
    index('family_membership_user_id_idx').on(table.userId),
    uniqueIndex('family_membership_space_user_unique').on(table.spaceId, table.userId),
  ],
);

// Domain: Financial Slice

export const confirmedBalance = pgTable(
  'confirmed_balances',
  {
    id: text('id').primaryKey(),
    spaceId: text('space_id')
      .notNull()
      .references(() => familySpace.id, { onDelete: 'cascade' }),
    amountCents: integer('amount_cents').notNull(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }).notNull(),
    authorId: text('author_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt,
  },
  (table) => [
    check('confirmed_balance_amount_nonnegative', sql`${table.amountCents} >= 0`),
    index('confirmed_balance_space_id_idx').on(table.spaceId),
  ],
);

export const movementDirectionEnum = pgEnum('movement_direction', ['income', 'expense']);
export const movementStatusEnum = pgEnum('movement_status', ['pending', 'realized', 'canceled']);
export const recurrenceCadenceEnum = pgEnum('recurrence_cadence', ['weekly', 'monthly']);

export const financialMovement = pgTable(
  'financial_movements',
  {
    id: text('id').primaryKey(),
    spaceId: text('space_id')
      .notNull()
      .references(() => familySpace.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    direction: movementDirectionEnum('direction').notNull(),
    expectedAmountCents: integer('expected_amount_cents').notNull(),
    plannedDate: date('planned_date').notNull(), // YYYY-MM-DD
    status: movementStatusEnum('status').notNull(),

    realizedAmountCents: integer('realized_amount_cents'),
    realizedDate: date('realized_date'),

    // Optional prepared fields
    categoryId: text('category_id'),
    recurrenceRuleVersionId: text('recurrence_rule_version_id'),
    occurrenceSequence: integer('occurrence_sequence'),

    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    updatedBy: text('updated_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),

    createdAt,
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    check('amount_positive', sql`${table.expectedAmountCents} > 0`),
    check(
      'realized_amount_positive',
      sql`${table.realizedAmountCents} > 0 OR ${table.realizedAmountCents} IS NULL`,
    ),
    check(
      'realized_date_requires_realized_status',
      sql`(${table.status} = 'realized' AND ${table.realizedDate} IS NOT NULL AND ${table.realizedAmountCents} IS NOT NULL) OR (${table.status} IN ('pending', 'canceled') AND ${table.realizedDate} IS NULL AND ${table.realizedAmountCents} IS NULL)`,
    ),
    index('financial_movement_space_id_idx').on(table.spaceId),
    index('financial_movement_planned_date_idx').on(table.plannedDate),
    uniqueIndex('financial_movement_recurrence_occurrence_unique').on(
      table.recurrenceRuleVersionId,
      table.occurrenceSequence,
    ),
    foreignKey({
      columns: [table.recurrenceRuleVersionId],
      foreignColumns: [recurrenceRuleVersion.id],
      name: 'financial_movements_recurrence_rule_version_id_fk',
    }).onDelete('cascade'),
  ],
);

export const recurrenceSeries = pgTable(
  'recurrence_series',
  {
    id: text('id').primaryKey(),
    spaceId: text('space_id')
      .notNull()
      .references(() => familySpace.id, { onDelete: 'cascade' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt,
  },
  (table) => [index('recurrence_series_space_id_idx').on(table.spaceId)],
);

export const recurrenceRuleVersion = pgTable(
  'recurrence_rule_versions',
  {
    id: text('id').primaryKey(),
    seriesId: text('series_id')
      .notNull()
      .references(() => recurrenceSeries.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    effectiveFrom: date('effective_from').notNull(),
    effectiveUntil: date('effective_until'),
    maxOccurrences: integer('max_occurrences'),
    description: text('description').notNull(),
    direction: movementDirectionEnum('direction').notNull(),
    expectedAmountCents: integer('expected_amount_cents').notNull(),
    cadence: recurrenceCadenceEnum('cadence').notNull(),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt,
  },
  (table) => [
    uniqueIndex('recurrence_rule_version_unique').on(table.seriesId, table.version),
    check('recurrence_rule_amount_positive', sql`${table.expectedAmountCents} > 0`),
    check(
      'recurrence_rule_max_occurrences_positive',
      sql`${table.maxOccurrences} > 0 OR ${table.maxOccurrences} IS NULL`,
    ),
    index('recurrence_rule_effective_from_idx').on(table.effectiveFrom),
  ],
);

export const financialPayment = pgTable(
  'financial_payments',
  {
    id: text('id').primaryKey(),
    movementId: text('movement_id')
      .notNull()
      .references(() => financialMovement.id, { onDelete: 'restrict' }),
    amountCents: integer('amount_cents').notNull(),
    paidDate: date('paid_date').notNull(),
    authorId: text('author_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt,
  },
  (table) => [
    check('financial_payment_amount_positive', sql`${table.amountCents} > 0`),
    index('financial_payment_movement_id_idx').on(table.movementId),
    index('financial_payment_paid_date_idx').on(table.paidDate),
  ],
);

export const financialAuditLog = pgTable('financial_audit_logs', {
  id: text('id').primaryKey(),
  spaceId: text('space_id')
    .notNull()
    .references(() => familySpace.id, { onDelete: 'cascade' }),
  movementId: text('movement_id'), // not a strict FK in case of hard delete, but we shouldn't hard delete realized
  authorId: text('author_id')
    .notNull()
    .references(() => user.id, { onDelete: 'restrict' }),
  action: text('action').notNull(), // 'create', 'update', 'delete', 'confirm_balance'
  changes: text('changes'), // JSON string
  createdAt,
});
