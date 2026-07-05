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
  }),

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
  })
    .index("by_book", ["bookId"])
    .index("by_kid", ["kidId"]),

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
  })
    .index("by_kid", ["kidId"])
    .index("by_assignment", ["assignmentId"]),
});


