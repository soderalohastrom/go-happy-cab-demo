"use strict";
/**
 * Unified Schema Seed Data
 * Populates database with realistic test data matching unified schema
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.copyAssignmentsFromPreviousDay = exports.seedData = void 0;
var server_1 = require("./_generated/server");
var values_1 = require("convex/values");
exports.seedData = (0, server_1.mutation)({
    args: {},
    handler: function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
        var now, existingDrivers, driverData, driverIds, _i, driverData_1, driver, driverId, childData, childIds, _a, childData_1, child, childId, getDateString, routeDays, _b, routeDays_1, daysAgo, routeDate, amPairings, _c, amPairings_1, _d, studentId, employeeId, pmPairings, _e, pmPairings_1, _f, studentId, employeeId;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    now = new Date().toISOString();
                    return [4 /*yield*/, ctx.db.query("drivers").first()];
                case 1:
                    existingDrivers = _g.sent();
                    if (existingDrivers) {
                        return [2 /*return*/, { message: "Database already seeded. Run clearAllData first if you want to re-seed." }];
                    }
                    driverData = [
                        { firstName: "John", lastName: "Smith", employeeId: "D001", phone: "808-555-0101", email: "john.smith@gohappycab.com" },
                        { firstName: "Maria", lastName: "Garcia", employeeId: "D002", phone: "808-555-0102", email: "maria.garcia@gohappycab.com" },
                        { firstName: "David", lastName: "Chen", employeeId: "D003", phone: "808-555-0103", email: "david.chen@gohappycab.com" },
                        { firstName: "Sarah", lastName: "Johnson", employeeId: "D004", phone: "808-555-0104", email: "sarah.johnson@gohappycab.com" },
                        { firstName: "Michael", lastName: "Williams", employeeId: "D005", phone: "808-555-0105", email: "michael.williams@gohappycab.com" },
                        { firstName: "Jennifer", lastName: "Brown", employeeId: "D006", phone: "808-555-0106", email: "jennifer.brown@gohappycab.com" },
                        { firstName: "Robert", lastName: "Jones", employeeId: "D007", phone: "808-555-0107", email: "robert.jones@gohappycab.com" },
                        { firstName: "Lisa", lastName: "Davis", employeeId: "D008", phone: "808-555-0108", email: "lisa.davis@gohappycab.com" },
                        { firstName: "James", lastName: "Miller", employeeId: "D009", phone: "808-555-0109", email: "james.miller@gohappycab.com" },
                        { firstName: "Patricia", lastName: "Wilson", employeeId: "D010", phone: "808-555-0110", email: "patricia.wilson@gohappycab.com" },
                        { firstName: "Thomas", lastName: "Moore", employeeId: "D011", phone: "808-555-0111", email: "thomas.moore@gohappycab.com" },
                        { firstName: "Linda", lastName: "Taylor", employeeId: "D012", phone: "808-555-0112", email: "linda.taylor@gohappycab.com" },
                    ];
                    driverIds = {};
                    _i = 0, driverData_1 = driverData;
                    _g.label = 2;
                case 2:
                    if (!(_i < driverData_1.length)) return [3 /*break*/, 5];
                    driver = driverData_1[_i];
                    return [4 /*yield*/, ctx.db.insert("drivers", __assign(__assign({}, driver), { status: "active", role: "driver", licenseNumber: "HI-".concat(driver.employeeId), licenseExpiry: "2026-12-31", emergencyContact: {
                                name: "Emergency Contact",
                                phone: "808-555-9999",
                                relationship: "Spouse",
                            }, performanceMetrics: {
                                totalRoutes: Math.floor(Math.random() * 500) + 100,
                                onTimeRate: 92 + Math.floor(Math.random() * 8),
                                safetyScore: 95 + Math.floor(Math.random() * 5),
                                incidentCount: Math.floor(Math.random() * 3),
                                parentRating: 4.5 + Math.random() * 0.5,
                            }, active: true, createdAt: now, updatedAt: now }))];
                case 3:
                    driverId = _g.sent();
                    driverIds[driver.employeeId] = driverId;
                    _g.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    console.log("\u2705 Seeded ".concat(driverData.length, " drivers"));
                    childData = [
                        { firstName: "Emma", lastName: "Anderson", grade: "K", studentId: "S001", schoolName: "Sunset Elementary" },
                        { firstName: "Liam", lastName: "Martinez", grade: "1", studentId: "S002", schoolName: "Sunset Elementary" },
                        { firstName: "Olivia", lastName: "Thompson", grade: "2", studentId: "S003", schoolName: "Sunset Elementary" },
                        { firstName: "Noah", lastName: "White", grade: "3", studentId: "S004", schoolName: "Sunset Elementary" },
                        { firstName: "Ava", lastName: "Harris", grade: "4", studentId: "S005", schoolName: "Sunset Elementary" },
                        { firstName: "Ethan", lastName: "Clark", grade: "5", studentId: "S006", schoolName: "Sunset Elementary" },
                        { firstName: "Sophia", lastName: "Lewis", grade: "K", studentId: "S007", schoolName: "Oceanview School" },
                        { firstName: "Mason", lastName: "Walker", grade: "1", studentId: "S008", schoolName: "Oceanview School" },
                        { firstName: "Isabella", lastName: "Hall", grade: "2", studentId: "S009", schoolName: "Oceanview School" },
                        { firstName: "Lucas", lastName: "Young", grade: "3", studentId: "S010", schoolName: "Oceanview School" },
                        { firstName: "Mia", lastName: "Allen", grade: "4", studentId: "S011", schoolName: "Oceanview School" },
                        { firstName: "Jackson", lastName: "King", grade: "5", studentId: "S012", schoolName: "Oceanview School" },
                        { firstName: "Charlotte", lastName: "Scott", grade: "K", studentId: "S013", schoolName: "Mountain View Academy" },
                        { firstName: "Aiden", lastName: "Green", grade: "1", studentId: "S014", schoolName: "Mountain View Academy" },
                        { firstName: "Amelia", lastName: "Baker", grade: "2", studentId: "S015", schoolName: "Mountain View Academy" },
                        { firstName: "Logan", lastName: "Adams", grade: "3", studentId: "S016", schoolName: "Mountain View Academy" },
                        { firstName: "Harper", lastName: "Nelson", grade: "4", studentId: "S017", schoolName: "Mountain View Academy" },
                        { firstName: "Elijah", lastName: "Carter", grade: "5", studentId: "S018", schoolName: "Mountain View Academy" },
                    ];
                    childIds = {};
                    _a = 0, childData_1 = childData;
                    _g.label = 6;
                case 6:
                    if (!(_a < childData_1.length)) return [3 /*break*/, 9];
                    child = childData_1[_a];
                    return [4 /*yield*/, ctx.db.insert("children", __assign(__assign({}, child), { dateOfBirth: "2015-01-01", homeAddress: {
                                street: "".concat(Math.floor(Math.random() * 9999), " Main St"),
                                city: "Honolulu",
                                state: "HI",
                                zip: "96816",
                            }, schoolAddress: {
                                street: "123 School Road",
                                city: "Honolulu",
                                state: "HI",
                                zip: "96816",
                            }, specialNeeds: Math.random() > 0.8 ? ["Allergies"] : [], medicalInfo: {
                                allergies: [],
                                medicalConditions: [],
                                equipmentNeeds: [],
                            }, pickupInstructions: "Ring doorbell", dropoffInstructions: "Use main entrance", active: true, photoPermission: true, createdAt: now, updatedAt: now }))];
                case 7:
                    childId = _g.sent();
                    childIds[child.studentId] = childId;
                    _g.label = 8;
                case 8:
                    _a++;
                    return [3 /*break*/, 6];
                case 9:
                    console.log("\u2705 Seeded ".concat(childData.length, " children"));
                    getDateString = function (daysAgo) {
                        var date = new Date();
                        date.setDate(date.getDate() - daysAgo);
                        return date.toISOString().split('T')[0];
                    };
                    routeDays = [3, 2, 1, 0];
                    _b = 0, routeDays_1 = routeDays;
                    _g.label = 10;
                case 10:
                    if (!(_b < routeDays_1.length)) return [3 /*break*/, 20];
                    daysAgo = routeDays_1[_b];
                    routeDate = getDateString(daysAgo);
                    amPairings = [
                        ["S001", "D001"], ["S002", "D001"], ["S003", "D002"], ["S004", "D002"],
                        ["S005", "D003"], ["S006", "D003"], ["S007", "D004"], ["S008", "D004"],
                        ["S009", "D005"], ["S010", "D005"], ["S011", "D006"], ["S012", "D006"],
                        ["S013", "D007"],
                    ];
                    _c = 0, amPairings_1 = amPairings;
                    _g.label = 11;
                case 11:
                    if (!(_c < amPairings_1.length)) return [3 /*break*/, 14];
                    _d = amPairings_1[_c], studentId = _d[0], employeeId = _d[1];
                    return [4 /*yield*/, ctx.db.insert("routes", {
                            date: routeDate,
                            period: "AM",
                            type: "pickup",
                            childId: childIds[studentId],
                            driverId: driverIds[employeeId],
                            status: daysAgo === 0 ? "scheduled" : "completed",
                            scheduledTime: "07:30",
                            createdAt: now,
                            updatedAt: now,
                        })];
                case 12:
                    _g.sent();
                    _g.label = 13;
                case 13:
                    _c++;
                    return [3 /*break*/, 11];
                case 14:
                    pmPairings = [
                        ["S001", "D008"], ["S002", "D008"], ["S003", "D009"], ["S004", "D009"],
                        ["S005", "D010"], ["S006", "D010"], ["S007", "D011"], ["S008", "D011"],
                        ["S009", "D012"], ["S010", "D012"], ["S011", "D001"], ["S012", "D002"],
                    ];
                    _e = 0, pmPairings_1 = pmPairings;
                    _g.label = 15;
                case 15:
                    if (!(_e < pmPairings_1.length)) return [3 /*break*/, 18];
                    _f = pmPairings_1[_e], studentId = _f[0], employeeId = _f[1];
                    return [4 /*yield*/, ctx.db.insert("routes", {
                            date: routeDate,
                            period: "PM",
                            type: "dropoff",
                            childId: childIds[studentId],
                            driverId: driverIds[employeeId],
                            status: daysAgo === 0 ? "scheduled" : "completed",
                            scheduledTime: "15:30",
                            createdAt: now,
                            updatedAt: now,
                        })];
                case 16:
                    _g.sent();
                    _g.label = 17;
                case 17:
                    _e++;
                    return [3 /*break*/, 15];
                case 18:
                    console.log("\u2705 Seeded routes for ".concat(routeDate));
                    _g.label = 19;
                case 19:
                    _b++;
                    return [3 /*break*/, 10];
                case 20: 
                // ======================================================================
                // 4. SEED AUDIT LOG
                // ======================================================================
                return [4 /*yield*/, ctx.db.insert("auditLogs", {
                        logId: "AL-".concat(Date.now(), "-000001"),
                        timestamp: now,
                        action: "database_seeded",
                        resource: "system",
                        resourceId: "initial_seed",
                        method: "CREATE",
                        category: "system_administration",
                        severity: "info",
                        userId: "system",
                        userType: "system",
                        details: {
                            description: "Database seeded with unified schema data",
                            count: "".concat(driverData.length, " drivers, ").concat(childData.length, " children, ").concat(routeDays.length * 25, " routes"),
                        },
                    })];
                case 21:
                    // ======================================================================
                    // 4. SEED AUDIT LOG
                    // ======================================================================
                    _g.sent();
                    return [2 /*return*/, {
                            message: "✅ Unified database seeded successfully!",
                            summary: {
                                drivers: driverData.length,
                                children: childData.length,
                                routes: routeDays.length * 25,
                                days: routeDays.length,
                            },
                        }];
            }
        });
    }); },
});
// Copy assignments from previous day (kept for backwards compatibility)
exports.copyAssignmentsFromPreviousDay = (0, server_1.mutation)({
    args: { targetDate: values_1.v.string() },
    handler: function (ctx, args) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // Redirect to the proper routes function
            // This is just a stub for backwards compatibility
            return [2 /*return*/, { message: "Use assignments.copyFromPreviousDay instead" }];
        });
    }); },
});
