import { pgTable, text, serial, timestamp, real, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roleEnum = pgEnum("role", ["customer", "mechanic"]);
export const idVerificationStatusEnum = pgEnum("id_verification_status", ["none", "pending", "approved", "rejected"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  phone: text("phone"),
  location: text("location"),
  bio: text("bio"),
  rating: real("rating"),
  reviewCount: integer("review_count").notNull().default(0),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
  warningCount: integer("warning_count").notNull().default(0),
  flaggedForReview: boolean("flagged_for_review").notNull().default(false),
  suspended: boolean("suspended").notNull().default(false),
  verified: boolean("verified").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  // Profile photo
  photoUrl: text("photo_url"),
  // Verification fields
  emailVerified: boolean("email_verified").notNull().default(false),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  identityVerificationStatus: idVerificationStatusEnum("identity_verification_status").notNull().default("none"),
  insuranceDocumentPath: text("insurance_document_path"),
  certificationDocumentPath: text("certification_document_path"),
  adminVerifiedMechanic: boolean("admin_verified_mechanic").notNull().default(false),
  verificationNotes: text("verification_notes"),
  verificationRequestedAt: timestamp("verification_requested_at", { withTimezone: true }),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  pinHash: text("pin_hash"),
  pinAttempts: integer("pin_attempts").notNull().default(0),
  pinLockedAt: timestamp("pin_locked_at", { withTimezone: true }),
  banned: boolean("banned").notNull().default(false),
  adminNotes: text("admin_notes"),
  lastLoginIp: text("last_login_ip"),
  signupIp: text("signup_ip"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"),
  specialties: text("specialties"),
  // Privacy name controls
  legalName: text("legal_name"),
  displayName: text("display_name"),
  username: text("username").unique(),
  showLegalNamePublicly: boolean("show_legal_name_publicly").notNull().default(false),
  // Map presence (mechanics)
  mapCity: text("map_city"),
  mapState: text("map_state"),
  mapLat: real("map_lat"),
  mapLng: real("map_lng"),
  serviceRadiusMiles: integer("service_radius_miles").notNull().default(25),
  isMobileMechanic: boolean("is_mobile_mechanic").notNull().default(false),
  shopType: text("shop_type").notNull().default("shop"),
  willingToTravelMiles: integer("willing_to_travel_miles"),
  emergencyAvailable: boolean("emergency_available").notNull().default(false),
  mapVisible: boolean("map_visible").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
