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
import type * as driverActions from "../driverActions.js";
import type * as drivers from "../drivers.js";
import type * as importRealData from "../importRealData.js";
import type * as payroll from "../payroll.js";
import type * as seed from "../seed.js";
import type * as setupTestDriver from "../setupTestDriver.js";
import type * as updateDriverClerkId from "../updateDriverClerkId.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  assignments: typeof assignments;
  children: typeof children;
  clearData: typeof clearData;
  config: typeof config;
  createCarpoolForScott: typeof createCarpoolForScott;
  driverActions: typeof driverActions;
  drivers: typeof drivers;
  importRealData: typeof importRealData;
  payroll: typeof payroll;
  seed: typeof seed;
  setupTestDriver: typeof setupTestDriver;
  updateDriverClerkId: typeof updateDriverClerkId;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
