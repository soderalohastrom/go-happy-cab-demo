/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as assignments from "../assignments.js";
import type * as children from "../children.js";
import type * as clearData from "../clearData.js";
import type * as config from "../config.js";
import type * as createCarpoolForScott from "../createCarpoolForScott.js";
import type * as directory from "../directory.js";
import type * as driverActions from "../driverActions.js";
import type * as drivers from "../drivers.js";
import type * as googleSheets from "../googleSheets.js";
import type * as importData from "../importData.js";
import type * as importParents from "../importParents.js";
import type * as importRealData from "../importRealData.js";
import type * as internal_auditLogs from "../internal/auditLogs.js";
import type * as localization from "../localization.js";
import type * as notifications from "../notifications.js";
import type * as payroll from "../payroll.js";
import type * as reports from "../reports.js";
import type * as routes from "../routes.js";
import type * as runParentImport from "../runParentImport.js";
import type * as schools from "../schools.js";
import type * as seed from "../seed.js";
import type * as seedSmsTemplates from "../seedSmsTemplates.js";
import type * as setupTestDriver from "../setupTestDriver.js";
import type * as smsMessages from "../smsMessages.js";
import type * as smsRecipients from "../smsRecipients.js";
import type * as smsTemplates from "../smsTemplates.js";
import type * as testing from "../testing.js";
import type * as updateDriverClerkId from "../updateDriverClerkId.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  assignments: typeof assignments;
  children: typeof children;
  clearData: typeof clearData;
  config: typeof config;
  createCarpoolForScott: typeof createCarpoolForScott;
  directory: typeof directory;
  driverActions: typeof driverActions;
  drivers: typeof drivers;
  googleSheets: typeof googleSheets;
  importData: typeof importData;
  importParents: typeof importParents;
  importRealData: typeof importRealData;
  "internal/auditLogs": typeof internal_auditLogs;
  localization: typeof localization;
  notifications: typeof notifications;
  payroll: typeof payroll;
  reports: typeof reports;
  routes: typeof routes;
  runParentImport: typeof runParentImport;
  schools: typeof schools;
  seed: typeof seed;
  seedSmsTemplates: typeof seedSmsTemplates;
  setupTestDriver: typeof setupTestDriver;
  smsMessages: typeof smsMessages;
  smsRecipients: typeof smsRecipients;
  smsTemplates: typeof smsTemplates;
  testing: typeof testing;
  updateDriverClerkId: typeof updateDriverClerkId;
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
