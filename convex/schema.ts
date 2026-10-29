import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  books: defineTable({
    title: v.string(),
    author: v.string(),
    category: v.string(),
    ageRange: v.string(),
    department: v.string(),
    coverUrl: v.optional(v.string()),
    copies: v.number(),
    code: v.optional(v.string()),
    price: v.optional(v.number()), // replacement cost; falls back to the default damage fee
    // A book a teacher adds waits for the admin. No status means live (admin-added and older books).
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    addedBy: v.optional(v.string()),
    rejectedReason: v.optional(v.string()),
  }).index("by_code", ["code"]),

  bookIssues: defineTable({
    bookId: v.id("books"),
    note: v.string(),
    reportedAt: v.string(),
  }).index("by_book", ["bookId"]),

  kids: defineTable({
    name: v.string(),
    age: v.number(),
    department: v.string(),
    birthdate: v.optional(v.string()),
    parentName: v.optional(v.string()),
    parentPhone: v.optional(v.string()),
  }),

  teachers: defineTable({
    name: v.string(),
    department: v.string(),
    className: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
  }),

  assignments: defineTable({
    bookId: v.id("books"),
    kidId: v.id("kids"),
    teacherId: v.optional(v.id("teachers")),
    assignedAt: v.string(),
    dueDate: v.string(),
    returnedAt: v.optional(v.string()),
    currentPage: v.optional(v.number()),
    completed: v.optional(v.boolean()),
    // --- approval flow (batch 2). status undefined = a loan made before approvals existed (treated as approved).
    status: v.optional(
      v.union(
        v.literal("pending_parent"),
        v.literal("pending_admin"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("cancelled"),
        v.literal("lost"),
      ),
    ),
    approvalToken: v.optional(v.string()),
    parentApprovedAt: v.optional(v.string()),
    parentApprovedName: v.optional(v.string()),
    policyVersion: v.optional(v.number()),
    adminApprovedAt: v.optional(v.string()),
    adminApprovedBy: v.optional(v.string()),
    rejectedReason: v.optional(v.string()),
    // --- lost / damaged fees
    feeKind: v.optional(v.union(v.literal("lost"), v.literal("damaged"))),
    feeAmount: v.optional(v.number()),
    feeStatus: v.optional(v.union(v.literal("owed"), v.literal("paid"), v.literal("waived"))),
    feeNote: v.optional(v.string()),
    feeAt: v.optional(v.string()),
  })
    .index("by_book", ["bookId"])
    .index("by_kid", ["kidId"])
    .index("by_token", ["approvalToken"]),

  settings: defineTable({
    key: v.string(),
    values: v.array(v.string()),
  }).index("by_key", ["key"]),

  bookReviews: defineTable({
    assignmentId: v.id("assignments"),
    kidId: v.id("kids"),
    bookId: v.id("books"),
    chapterRange: v.optional(v.string()),
    summary: v.string(),
    createdAt: v.string(),
    sentToParentAt: v.optional(v.string()),
    // --- publishing (batch 2). status undefined = saved before approvals existed (not published).
    imageId: v.optional(v.id("_storage")),
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    submittedAt: v.optional(v.string()),
    decidedAt: v.optional(v.string()),
    decidedBy: v.optional(v.string()),
    rejectedReason: v.optional(v.string()),
    shareToken: v.optional(v.string()),
  })
    .index("by_kid", ["kidId"])
    .index("by_assignment", ["assignmentId"])
    .index("by_token", ["shareToken"]),

  // One row (the current policy). Missing row = built-in defaults from convex/policy.ts.
  loanPolicy: defineTable({
    text: v.string(),
    damageFee: v.number(),
    currency: v.string(),
    version: v.number(),
    updatedAt: v.string(),
  }),

  // Everyone who has signed in (for the admin People list). role = what they picked on the login page.
  members: defineTable({
    userId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: v.optional(v.union(v.literal("teacher"), v.literal("admin"))), // what they picked on the login page
    // pending until an admin approves. undefined (recorded before approvals existed) counts as pending.
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("denied"))),
    approvedAt: v.optional(v.string()),
    approvedBy: v.optional(v.string()),
    teacherId: v.optional(v.id("teachers")),
    createdAt: v.string(),
    lastSeenAt: v.string(),
  }).index("by_user", ["userId"]),

  // Admins approved inside the app (Admin > Settings > People). Identified by the Clerk user id.
  admins: defineTable({
    userId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    addedBy: v.string(),
    createdAt: v.string(),
  }).index("by_user", ["userId"]),

  adminRequests: defineTable({
    userId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_user", ["userId"]),

  announcements: defineTable({
    title: v.string(),
    body: v.string(),
    audience: v.array(v.string()), // class names; empty = everyone
    expiresAt: v.optional(v.string()),
    createdAt: v.string(),
    createdBy: v.string(),
  }),

  readingSets: defineTable({
    bookId: v.id("books"),
    department: v.string(),
    dueDate: v.optional(v.string()),
    note: v.optional(v.string()),
    createdAt: v.string(),
    createdBy: v.string(),
  }),

  // What happened, who did it and when. Written by the server only; admins read it (Admin > Activity).
  activityLog: defineTable({
    at: v.string(),
    actorId: v.optional(v.string()),
    actorRole: v.string(), // admin | teacher | parent | pending | system
    actorName: v.string(),
    action: v.string(), // area.what, e.g. loan.assign
    summary: v.string(),
    entity: v.optional(v.string()),
    entityId: v.optional(v.string()),
  }).index("by_at", ["at"]),
});


