"use strict";
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
exports.copyFromDate = exports.updateStatus = exports.remove = exports.copyFromPreviousDay = exports.create = exports.getUnassignedDrivers = exports.getUnassignedChildren = exports.getForDateRange = exports.getForDate = exports.getForDatePeriod = void 0;
var server_1 = require("./_generated/server");
var values_1 = require("convex/values");
// Get assignments for a specific date and period
exports.getForDatePeriod = (0, server_1.query)({
    args: {
        date: values_1.v.string(),
        period: values_1.v.string(),
    },
    handler: function (ctx, args) { return __awaiter(void 0, void 0, void 0, function () {
        var routes, enriched;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ctx.db
                        .query("routes")
                        .withIndex("by_date_period", function (q) {
                        return q.eq("date", args.date).eq("period", args.period);
                    })
                        .collect()];
                case 1:
                    routes = _a.sent();
                    return [4 /*yield*/, Promise.all(routes.map(function (route) { return __awaiter(void 0, void 0, void 0, function () {
                            var child, driver;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, ctx.db.get(route.childId)];
                                    case 1:
                                        child = _a.sent();
                                        return [4 /*yield*/, ctx.db.get(route.driverId)];
                                    case 2:
                                        driver = _a.sent();
                                        return [2 /*return*/, __assign(__assign({}, route), { childName: child ? "".concat(child.firstName, " ").concat(child.lastName) : "Unknown", driverName: driver ? "".concat(driver.firstName, " ").concat(driver.lastName) : "Unknown" })];
                                }
                            });
                        }); }))];
                case 2:
                    enriched = _a.sent();
                    return [2 /*return*/, enriched];
            }
        });
    }); },
});
// Get assignments for a specific date (both AM and PM)
exports.getForDate = (0, server_1.query)({
    args: { date: values_1.v.string() },
    handler: function (ctx, args) { return __awaiter(void 0, void 0, void 0, function () {
        var assignments, enriched, grouped;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ctx.db
                        .query("routes")
                        .withIndex("by_date", function (q) { return q.eq("date", args.date); })
                        .collect()];
                case 1:
                    assignments = _a.sent();
                    return [4 /*yield*/, Promise.all(assignments.map(function (assignment) { return __awaiter(void 0, void 0, void 0, function () {
                            var child, driver;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, ctx.db.get(assignment.childId)];
                                    case 1:
                                        child = _a.sent();
                                        return [4 /*yield*/, ctx.db.get(assignment.driverId)];
                                    case 2:
                                        driver = _a.sent();
                                        return [2 /*return*/, __assign(__assign({}, assignment), { childName: (child === null || child === void 0 ? void 0 : child.name) || "Unknown", driverName: (driver === null || driver === void 0 ? void 0 : driver.name) || "Unknown" })];
                                }
                            });
                        }); }))];
                case 2:
                    enriched = _a.sent();
                    grouped = {
                        AM: enriched.filter(function (a) { return a.period === "AM"; }),
                        PM: enriched.filter(function (a) { return a.period === "PM"; }),
                    };
                    return [2 /*return*/, grouped];
            }
        });
    }); },
});
// Get assignments for a date range (for calendar view)
exports.getForDateRange = (0, server_1.query)({
    args: {
        startDate: values_1.v.string(),
        endDate: values_1.v.string(),
    },
    handler: function (ctx, args) { return __awaiter(void 0, void 0, void 0, function () {
        var allAssignments, filtered, summary;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ctx.db.query("routes").collect()];
                case 1:
                    allAssignments = _a.sent();
                    filtered = allAssignments.filter(function (a) { return a.date >= args.startDate && a.date <= args.endDate; });
                    summary = {};
                    filtered.forEach(function (assignment) {
                        if (!summary[assignment.date]) {
                            summary[assignment.date] = { AM: 0, PM: 0 };
                        }
                        if (assignment.period === "AM") {
                            summary[assignment.date].AM++;
                        }
                        else if (assignment.period === "PM") {
                            summary[assignment.date].PM++;
                        }
                    });
                    return [2 /*return*/, summary];
            }
        });
    }); },
});
// Get unassigned children for a specific date and period
exports.getUnassignedChildren = (0, server_1.query)({
    args: {
        date: values_1.v.string(),
        period: values_1.v.string(),
    },
    handler: function (ctx, args) { return __awaiter(void 0, void 0, void 0, function () {
        var allChildren, assignments, assignedChildIds;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ctx.db
                        .query("children")
                        .withIndex("by_active", function (q) { return q.eq("active", true); })
                        .collect()];
                case 1:
                    allChildren = _a.sent();
                    return [4 /*yield*/, ctx.db
                            .query("routes")
                            .withIndex("by_date_period", function (q) {
                            return q.eq("date", args.date).eq("period", args.period);
                        })
                            .collect()];
                case 2:
                    assignments = _a.sent();
                    assignedChildIds = new Set(assignments.map(function (a) { return a.childId; }));
                    // Return unassigned children
                    return [2 /*return*/, allChildren.filter(function (child) { return !assignedChildIds.has(child._id); })];
            }
        });
    }); },
});
// Get unassigned drivers for a specific date and period
exports.getUnassignedDrivers = (0, server_1.query)({
    args: {
        date: values_1.v.string(),
        period: values_1.v.string(),
    },
    handler: function (ctx, args) { return __awaiter(void 0, void 0, void 0, function () {
        var allDrivers, assignments, assignedDriverIds;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ctx.db
                        .query("drivers")
                        .withIndex("by_active", function (q) { return q.eq("active", true); })
                        .collect()];
                case 1:
                    allDrivers = _a.sent();
                    return [4 /*yield*/, ctx.db
                            .query("routes")
                            .withIndex("by_date_period", function (q) {
                            return q.eq("date", args.date).eq("period", args.period);
                        })
                            .collect()];
                case 2:
                    assignments = _a.sent();
                    assignedDriverIds = new Set(assignments.map(function (a) { return a.driverId; }));
                    // Return unassigned drivers
                    return [2 /*return*/, allDrivers.filter(function (driver) { return !assignedDriverIds.has(driver._id); })];
            }
        });
    }); },
});
// Create a new assignment
exports.create = (0, server_1.mutation)({
    args: {
        date: values_1.v.string(),
        period: values_1.v.string(),
        childId: values_1.v.id("children"),
        driverId: values_1.v.id("drivers"),
        status: values_1.v.optional(values_1.v.string()),
        user: values_1.v.optional(values_1.v.string()),
    },
    handler: function (ctx, args) { return __awaiter(void 0, void 0, void 0, function () {
        var date, period, childId, driverId, _a, status, user, existingChildAssignment, existingDriverAssignment, child, driver, assignmentId;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    date = args.date, period = args.period, childId = args.childId, driverId = args.driverId, _a = args.status, status = _a === void 0 ? "scheduled" : _a, user = args.user;
                    return [4 /*yield*/, ctx.db
                            .query("routes")
                            .withIndex("by_date_period_child", function (q) {
                            return q.eq("date", date).eq("period", period).eq("childId", childId);
                        })
                            .first()];
                case 1:
                    existingChildAssignment = _b.sent();
                    if (existingChildAssignment) {
                        throw new Error("Child is already assigned for this period");
                    }
                    return [4 /*yield*/, ctx.db
                            .query("routes")
                            .withIndex("by_date_period_driver", function (q) {
                            return q.eq("date", date).eq("period", period).eq("driverId", driverId);
                        })
                            .first()];
                case 2:
                    existingDriverAssignment = _b.sent();
                    if (existingDriverAssignment) {
                        throw new Error("Driver is already assigned for this period");
                    }
                    return [4 /*yield*/, ctx.db.get(childId)];
                case 3:
                    child = _b.sent();
                    return [4 /*yield*/, ctx.db.get(driverId)];
                case 4:
                    driver = _b.sent();
                    return [4 /*yield*/, ctx.db.insert("routes", {
                            date: date,
                            period: period,
                            childId: childId,
                            driverId: driverId,
                            status: status,
                            createdAt: Date.now(),
                            createdBy: user,
                        })];
                case 5:
                    assignmentId = _b.sent();
                    // Create audit log entry
                    return [4 /*yield*/, ctx.db.insert("auditLog", {
                            timestamp: Date.now(),
                            action: "created",
                            entityType: "assignment",
                            entityId: assignmentId,
                            details: {
                                date: date,
                                period: period,
                                childName: (child === null || child === void 0 ? void 0 : child.name) || "Unknown",
                                driverName: (driver === null || driver === void 0 ? void 0 : driver.name) || "Unknown",
                            },
                            user: user,
                        })];
                case 6:
                    // Create audit log entry
                    _b.sent();
                    return [2 /*return*/, assignmentId];
            }
        });
    }); },
});
// Copy assignments from previous day
exports.copyFromPreviousDay = (0, server_1.mutation)({
    args: { targetDate: values_1.v.string() },
    handler: function (ctx, args) { return __awaiter(void 0, void 0, void 0, function () {
        var targetDateObj, previousDate, previousAssignments, existingAssignments, copiedCount, _i, previousAssignments_1, assignment;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    targetDateObj = new Date(args.targetDate);
                    targetDateObj.setDate(targetDateObj.getDate() - 1);
                    previousDate = targetDateObj.toISOString().split('T')[0];
                    return [4 /*yield*/, ctx.db
                            .query("routes")
                            .withIndex("by_date", function (q) { return q.eq("date", previousDate); })
                            .collect()];
                case 1:
                    previousAssignments = _a.sent();
                    if (previousAssignments.length === 0) {
                        throw new Error("No assignments found for previous day");
                    }
                    return [4 /*yield*/, ctx.db
                            .query("routes")
                            .withIndex("by_date", function (q) { return q.eq("date", args.targetDate); })
                            .first()];
                case 2:
                    existingAssignments = _a.sent();
                    if (existingAssignments) {
                        throw new Error("This date already has assignments");
                    }
                    copiedCount = 0;
                    _i = 0, previousAssignments_1 = previousAssignments;
                    _a.label = 3;
                case 3:
                    if (!(_i < previousAssignments_1.length)) return [3 /*break*/, 6];
                    assignment = previousAssignments_1[_i];
                    return [4 /*yield*/, ctx.db.insert("routes", {
                            date: args.targetDate,
                            period: assignment.period,
                            childId: assignment.childId,
                            driverId: assignment.driverId,
                            status: "scheduled",
                            createdAt: Date.now(),
                        })];
                case 4:
                    _a.sent();
                    copiedCount++;
                    _a.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6: 
                // Create audit log entry
                return [4 /*yield*/, ctx.db.insert("auditLog", {
                        timestamp: Date.now(),
                        action: "bulk_copied",
                        entityType: "assignment",
                        entityId: "".concat(copiedCount, "_assignments"),
                        details: {
                            date: args.targetDate,
                            fromDate: previousDate,
                            count: copiedCount.toString(),
                        },
                        user: "system",
                    })];
                case 7:
                    // Create audit log entry
                    _a.sent();
                    return [2 /*return*/, {
                            message: "Successfully copied ".concat(copiedCount, " assignments from ").concat(previousDate),
                            copied: copiedCount,
                        }];
            }
        });
    }); },
});
// Delete an assignment
exports.remove = (0, server_1.mutation)({
    args: {
        id: values_1.v.id("routes"),
        user: values_1.v.optional(values_1.v.string()),
    },
    handler: function (ctx, args) { return __awaiter(void 0, void 0, void 0, function () {
        var assignment, child, driver;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ctx.db.get(args.id)];
                case 1:
                    assignment = _a.sent();
                    if (!assignment) {
                        throw new Error("Assignment not found");
                    }
                    return [4 /*yield*/, ctx.db.get(assignment.childId)];
                case 2:
                    child = _a.sent();
                    return [4 /*yield*/, ctx.db.get(assignment.driverId)];
                case 3:
                    driver = _a.sent();
                    // Delete the assignment
                    return [4 /*yield*/, ctx.db.delete(args.id)];
                case 4:
                    // Delete the assignment
                    _a.sent();
                    // Create audit log entry
                    return [4 /*yield*/, ctx.db.insert("auditLog", {
                            timestamp: Date.now(),
                            action: "deleted",
                            entityType: "assignment",
                            entityId: args.id,
                            details: {
                                date: assignment.date,
                                period: assignment.period,
                                childName: (child === null || child === void 0 ? void 0 : child.name) || "Unknown",
                                driverName: (driver === null || driver === void 0 ? void 0 : driver.name) || "Unknown",
                            },
                            user: args.user,
                        })];
                case 5:
                    // Create audit log entry
                    _a.sent();
                    return [2 /*return*/, args.id];
            }
        });
    }); },
});
// Update assignment status
exports.updateStatus = (0, server_1.mutation)({
    args: {
        id: values_1.v.id("routes"),
        status: values_1.v.string(),
        user: values_1.v.optional(values_1.v.string()),
    },
    handler: function (ctx, args) { return __awaiter(void 0, void 0, void 0, function () {
        var assignment, child, driver;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ctx.db.get(args.id)];
                case 1:
                    assignment = _a.sent();
                    if (!assignment) {
                        throw new Error("Assignment not found");
                    }
                    return [4 /*yield*/, ctx.db.patch(args.id, { status: args.status })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, ctx.db.get(assignment.childId)];
                case 3:
                    child = _a.sent();
                    return [4 /*yield*/, ctx.db.get(assignment.driverId)];
                case 4:
                    driver = _a.sent();
                    // Create audit log entry
                    return [4 /*yield*/, ctx.db.insert("auditLog", {
                            timestamp: Date.now(),
                            action: "updated",
                            entityType: "assignment",
                            entityId: args.id,
                            details: {
                                date: assignment.date,
                                period: assignment.period,
                                childName: (child === null || child === void 0 ? void 0 : child.name) || "Unknown",
                                driverName: (driver === null || driver === void 0 ? void 0 : driver.name) || "Unknown",
                            },
                            user: args.user,
                        })];
                case 5:
                    // Create audit log entry
                    _a.sent();
                    return [2 /*return*/, args.id];
            }
        });
    }); },
});
// Copy assignments from one date to another
exports.copyFromDate = (0, server_1.mutation)({
    args: {
        fromDate: values_1.v.string(),
        toDate: values_1.v.string(),
        period: values_1.v.optional(values_1.v.string()), // If provided, only copy this period
        user: values_1.v.optional(values_1.v.string()),
    },
    handler: function (ctx, args) { return __awaiter(void 0, void 0, void 0, function () {
        var fromDate, toDate, period, user, sourceAssignments, newAssignmentIds;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fromDate = args.fromDate, toDate = args.toDate, period = args.period, user = args.user;
                    if (!period) return [3 /*break*/, 2];
                    return [4 /*yield*/, ctx.db
                            .query("routes")
                            .withIndex("by_date_period", function (q) {
                            return q.eq("date", fromDate).eq("period", period);
                        })
                            .collect()];
                case 1:
                    sourceAssignments = _a.sent();
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, ctx.db
                        .query("routes")
                        .withIndex("by_date", function (q) { return q.eq("date", fromDate); })
                        .collect()];
                case 3:
                    sourceAssignments = _a.sent();
                    _a.label = 4;
                case 4: return [4 /*yield*/, Promise.all(sourceAssignments.map(function (source) { return __awaiter(void 0, void 0, void 0, function () {
                        var existing, child, driver, newId;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, ctx.db
                                        .query("routes")
                                        .withIndex("by_date_period_child", function (q) {
                                        return q.eq("date", toDate).eq("period", source.period).eq("childId", source.childId);
                                    })
                                        .first()];
                                case 1:
                                    existing = _a.sent();
                                    if (!!existing) return [3 /*break*/, 6];
                                    return [4 /*yield*/, ctx.db.get(source.childId)];
                                case 2:
                                    child = _a.sent();
                                    return [4 /*yield*/, ctx.db.get(source.driverId)];
                                case 3:
                                    driver = _a.sent();
                                    return [4 /*yield*/, ctx.db.insert("routes", {
                                            date: toDate,
                                            period: source.period,
                                            childId: source.childId,
                                            driverId: source.driverId,
                                            status: "scheduled",
                                            createdAt: Date.now(),
                                            createdBy: user,
                                        })];
                                case 4:
                                    newId = _a.sent();
                                    // Create audit log
                                    return [4 /*yield*/, ctx.db.insert("auditLog", {
                                            timestamp: Date.now(),
                                            action: "created",
                                            entityType: "assignment",
                                            entityId: newId,
                                            details: {
                                                date: toDate,
                                                period: source.period,
                                                childName: (child === null || child === void 0 ? void 0 : child.name) || "Unknown",
                                                driverName: (driver === null || driver === void 0 ? void 0 : driver.name) || "Unknown",
                                            },
                                            user: user,
                                        })];
                                case 5:
                                    // Create audit log
                                    _a.sent();
                                    return [2 /*return*/, newId];
                                case 6: return [2 /*return*/, null];
                            }
                        });
                    }); }))];
                case 5:
                    newAssignmentIds = _a.sent();
                    return [2 /*return*/, newAssignmentIds.filter(function (id) { return id !== null; })];
            }
        });
    }); },
});
