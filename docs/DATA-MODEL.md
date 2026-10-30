# Data model

All tables live in Convex (`convex/schema.ts`). Every row also has `_id` and `_creationTime`. Dates are ISO strings (`2026-10-29` or a full timestamp).

## books
| Field | Notes |
|---|---|
| `title`, `author`, `category`, `ageRange`, `department` | Text. `department` is the class the book suits |
| `copies` | Number of physical copies |
| `code` | Optional, unique book code |
| `price` | Optional replacement price. Falls back to the default damage fee |
| `coverUrl` | Optional |
| `status` | Optional: `pending`, `approved`, `rejected`. Empty means live |
| `addedBy`, `rejectedReason` | Who a teacher's book came from, and why it was declined |

Index `by_code`.

## bookIssues
Problems reported on a book: `bookId`, `note`, `reportedAt`.

## kids
`name`, `age`, `department` (class), `birthdate`, `parentName`, `parentPhone`. Age shown in the app is computed from `birthdate` when there is one.

## teachers
`name`, `department` (`Unassigned` until given a class), `className`, `phone`, `email`.

## assignments (loans)
| Field | Notes |
|---|---|
| `bookId`, `kidId`, `teacherId` | Links |
| `assignedAt`, `dueDate`, `returnedAt` | Dates |
| `currentPage`, `completed` | Reading progress |
| `status` | `pending_parent`, `pending_admin`, `approved`, `rejected`, `cancelled`, `lost`. Empty means approved (loans from before approvals existed) |
| `approvalToken` | Random token in the parent's link |
| `parentApprovedAt`, `parentApprovedName`, `policyVersion` | What the parent agreed to |
| `adminApprovedAt`, `adminApprovedBy`, `rejectedReason` | Final decision |
| `feeKind`, `feeAmount`, `feeStatus`, `feeNote`, `feeAt` | Lost or damaged fee. `feeStatus`: `owed`, `paid`, `waived` |

Indexes `by_book`, `by_kid`, `by_token`.

## bookReviews
`assignmentId`, `kidId`, `bookId`, `chapterRange`, `summary`, `createdAt`, `imageId` (file storage), `status` (`pending`, `approved`, `rejected`; empty means saved before approvals), `submittedAt`, `decidedAt`, `decidedBy`, `rejectedReason`, `shareToken` (the public link), `sentToParentAt`. Indexes `by_kid`, `by_assignment`, `by_token`.

## loanPolicy
One row: `text` (borrowing policy), `damageFee`, `currency` (default GHS), `version` (goes up with every edit; stored on each parent approval), `updatedAt`.

## settings
`key` and `values`: the lists of `categories`, `departments` (classes) and `ageRanges`. Built-in defaults apply until a list is first changed.

## members
Everyone who has signed in: `userId` (Clerk), `name`, `email`, `imageUrl`, `role` (what they picked on the sign-in page), `status` (`pending`, `approved`, `denied`), `approvedAt`, `approvedBy`, `teacherId` (their teacher record), `createdAt`, `lastSeenAt`. Index `by_user`.

## admins and adminRequests
`admins`: people made admin from the app (`userId`, `name`, `email`, `addedBy`, `createdAt`). `adminRequests`: people who asked for admin access and are waiting.

## announcements
`title`, `body`, `audience` (class names, empty means everyone), `expiresAt`, `createdAt`, `createdBy`.

## readingSets
A book set for a class to read: `bookId`, `department`, `dueDate`, `note`, `createdAt`, `createdBy`.

## activityLog
`at`, `actorId`, `actorRole` (`admin`, `teacher`, `parent`, `pending`, `system`), `actorName`, `action` (area.what, such as `loan.assign`, `review.approved`, `import.books`), `summary`, `entity`, `entityId`. Index `by_at`.

Action areas: `loan.`, `review.`, `book.`, `kid.`, `teacher.`, `member.`, `admin.`, `announcement.`, `reading.`, `policy.`, `settings.`, `import.`.
