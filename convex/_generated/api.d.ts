/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminAuth from "../adminAuth.js";
import type * as announcements from "../announcements.js";
import type * as assignments from "../assignments.js";
import type * as books from "../books.js";
import type * as kids from "../kids.js";
import type * as loanHelpers from "../loanHelpers.js";
import type * as loanPolicy from "../loanPolicy.js";
import type * as loans from "../loans.js";
import type * as policy from "../policy.js";
import type * as readingSets from "../readingSets.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as teachers from "../teachers.js";
import type * as vocab from "../vocab.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminAuth: typeof adminAuth;
  announcements: typeof announcements;
  assignments: typeof assignments;
  books: typeof books;
  kids: typeof kids;
  loanHelpers: typeof loanHelpers;
  loanPolicy: typeof loanPolicy;
  loans: typeof loans;
  policy: typeof policy;
  readingSets: typeof readingSets;
  reviews: typeof reviews;
  seed: typeof seed;
  settings: typeof settings;
  teachers: typeof teachers;
  vocab: typeof vocab;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
