"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { google } from "googleapis";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const runImport = action({
    args: {
        commit: v.boolean(),
    },
    handler: async (ctx, args) => {
        const SHEET_ID = "1d2N0KxS2VhUULZ7CmcDQYqQv3h85A7Hr6AS3djLp0Gk";
        const SHEET_NAME = "Sheet1";
        const TARGET_DATE = "2025-12-05";

        // 1. Auth with Google
        const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

        if (!serviceAccountEmail || !serviceAccountKey) {
            throw new Error("Missing Google Service Account credentials");
        }

        const formattedKey = serviceAccountKey
            .replace(/\\n/g, "\n")
            .replace(/-----BEGIN\nPRIVATE\nKEY-----/g, "-----BEGIN PRIVATE KEY-----")
            .replace(/-----END\nPRIVATE\nKEY-----/g, "-----END PRIVATE KEY-----");

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: serviceAccountEmail,
                private_key: formattedKey,
            },
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        });

        const sheets = google.sheets({ version: "v4", auth });

        // 2. Fetch Sheet Data
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: SHEET_NAME,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return { error: "No data found in sheet." };
        }

        const headers = rows[0];
        const dataRows = rows.slice(1);

        // Map headers to indices
        const idxFirst = headers.indexOf("Rider_FirstNm");
        const idxLast = headers.indexOf("Rider_LastNm");
        const idxAm = headers.indexOf("PUAM_Drv");
        const idxPm = headers.indexOf("PUPM_Drv");

        if (idxFirst === -1 || idxLast === -1 || idxAm === -1 || idxPm === -1) {
            return { error: `Missing required columns. Found: ${headers.join(", ")}` };
        }

        // 3. Fetch DB Data
        const allChildren = await ctx.runQuery(api.children.listAll);
        const allDrivers = await ctx.runQuery(api.drivers.listAll);

        // Helper to normalize names for fuzzy matching
        // " John " -> "john"
        const normalize = (s: string) => s?.trim().toLowerCase() || "";

        // Helper to clean driver names from weird suffixes
        // "Evaldo PM ONLY" -> "evaldo"
        const cleanDriverName = (s: string) => {
            let n = normalize(s);
            // Remove known suffixes with regex to handle spacing variations
            n = n.replace(/\s*pm only\s*/g, "").replace(/\s*am only\s*/g, "");
            // Remove hyphen and anything after it (handles " - ", "- ", " -", etc)
            n = n.replace(/\s*-\s*.*$/, "");
            return n.trim();
        };

        const matchedChildrenCache = new Map<string, Id<"children">>();
        const matchedDriversCache = new Map<string, Id<"drivers">>();

        // Pre-index existing entities by normalized name keys
        const childrenMap = new Map(); // "first last" -> id
        for (const c of allChildren) {
            childrenMap.set(`${normalize(c.firstName)} ${normalize(c.lastName)}`, c._id);
        }

        // Also index children by just First + Last from database just in case (though full name is best)

        const driversMap = new Map(); // "first last" -> id AND "first" -> id (if unique)
        const driversByFirst = new Map();

        for (const d of allDrivers) {
            const fullName = `${normalize(d.firstName)} ${normalize(d.lastName)}`;
            driversMap.set(fullName, d._id);

            // Index by full first name (e.g. "benhur calixto")
            const first = normalize(d.firstName);
            if (!driversByFirst.has(first)) {
                driversByFirst.set(first, d._id);
            } else {
                driversByFirst.set(first, "DUPLICATE");
            }

            // Index by first word of first name (e.g. "benhur")
            const firstWord = first.split(" ")[0];
            if (firstWord !== first) {
                if (!driversByFirst.has(firstWord)) {
                    driversByFirst.set(firstWord, d._id);
                } else {
                    driversByFirst.set(firstWord, "DUPLICATE");
                }
            }
        }

        const report = {
            totalRows: dataRows.length,
            matchedChildren: 0,
            unmatchedChildren: [] as string[],
            matchedDrivers: 0,
            unmatchedDrivers: [] as string[],
            routesCreated: 0,
        };

        // 4. Process Rows
        for (const row of dataRows) {
            const riderFirst = row[idxFirst];
            const riderLast = row[idxLast];
            const amDriverRaw = row[idxAm];
            const pmDriverRaw = row[idxPm];

            // Match Child
            const riderKey = `${normalize(riderFirst)} ${normalize(riderLast)}`;
            let childId = childrenMap.get(riderKey);

            if (!childId) {
                report.unmatchedChildren.push(`${riderFirst} ${riderLast}`);
                continue; // Cannot proceed without child
            }
            report.matchedChildren++;

            // Match Drivers & Assign
            const processAssignment = async (rawName: string, period: "AM" | "PM") => {
                if (!rawName || rawName === "NO RIDE" || rawName === "No Ride" || rawName.trim() === "") return;
                if (rawName.toLowerCase() === "parent") return; // Skip "Parent" assignments

                const driverKey = cleanDriverName(rawName);
                let driverId = driversMap.get(driverKey) || driversMap.get(`${driverKey} `);

                // 1. Exact First Name Match (if unique)
                if (!driverId && driversByFirst.has(driverKey) && driversByFirst.get(driverKey) !== "DUPLICATE") {
                    driverId = driversByFirst.get(driverKey);
                }

                // 2. Parts Containment (for "Alexandre Nery" -> "Alexandre Magalhaes Nery" case)
                if (!driverId) {
                    const keyParts = driverKey.split(/\s+/);
                    const candidates = allDrivers.filter(d => {
                        const dFull = `${normalize(d.firstName)} ${normalize(d.lastName)}`;
                        const dParts = dFull.split(/\s+/);

                        // Check if ALL keyParts match a prefix of some dPart
                        // uniqueness check: we only match if exactly ONE driver fits this criteria to be safe
                        return keyParts.every(kp => dParts.some(dp => dp.startsWith(kp)));
                    });

                    if (candidates.length === 1) {
                        driverId = candidates[0]._id;
                    }
                }

                if (driverId) {
                    report.matchedDrivers++;
                    if (args.commit) {
                        await ctx.runMutation(internal.routes.createRoute, {
                            childId: childId!,
                            driverId: driverId,
                            date: TARGET_DATE,
                            period: period,
                            type: period === "AM" ? "pickup" : "dropoff",
                            status: "scheduled",
                        });
                        report.routesCreated++;
                    }
                } else {
                    report.unmatchedDrivers.push(`${rawName} (Raw) -> ${driverKey} (Clean)`);
                }
            };

            await processAssignment(amDriverRaw, "AM");
            await processAssignment(pmDriverRaw, "PM");
        }

        return report;
    },
});
