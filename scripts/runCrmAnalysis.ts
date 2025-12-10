#!/usr/bin/env npx ts-node

/**
 * CRM Contact Analysis Script
 *
 * Fetches Google Sheet data and runs fuzzy matching analysis
 * against existing Convex entities.
 *
 * Run with: npx ts-node scripts/runCrmAnalysis.ts
 */

// Column indices from Google Sheet (exported from Google Contacts)
const COLUMNS = {
  FIRST_NAME: 0,
  MIDDLE_NAME: 1,
  LAST_NAME: 2,
  ORG_NAME: 10,
  ORG_TITLE: 11,
  ORG_DEPARTMENT: 12,
  NOTES: 14,
  LABELS: 16,
  EMAIL_1_VALUE: 18,
  PHONE_1_VALUE: 24,
  ADDRESS_1_FORMATTED: 34,
};

interface SheetContact {
  rowIndex: number;
  firstName: string;
  middleName: string;
  lastName: string;
  organizationName: string;
  organizationTitle: string;
  organizationDepartment: string;
  labels: string[];
  email: string;
  phone: string;
  address: string;
  notes: string;
}

function parseLabels(labelsStr: string): string[] {
  if (!labelsStr) return [];
  return labelsStr
    .split(":::")
    .map((l) => l.trim())
    .filter(Boolean);
}

function parseSheetRow(row: string[], rowIndex: number): SheetContact | null {
  // Skip header row
  if (rowIndex === 0) return null;

  // Get basic fields
  const firstName = (row[COLUMNS.FIRST_NAME] || "").trim();
  const lastName = (row[COLUMNS.LAST_NAME] || "").trim();
  const orgName = (row[COLUMNS.ORG_NAME] || "").trim();

  // Need at least a name or org
  if (!firstName && !lastName && !orgName) return null;

  const labels = parseLabels(row[COLUMNS.LABELS] || "");

  return {
    rowIndex,
    firstName,
    middleName: (row[COLUMNS.MIDDLE_NAME] || "").trim(),
    lastName,
    organizationName: orgName,
    organizationTitle: (row[COLUMNS.ORG_TITLE] || "").trim(),
    organizationDepartment: (row[COLUMNS.ORG_DEPARTMENT] || "").trim(),
    labels,
    email: (row[COLUMNS.EMAIL_1_VALUE] || "").trim(),
    phone: (row[COLUMNS.PHONE_1_VALUE] || "").trim(),
    address: (row[COLUMNS.ADDRESS_1_FORMATTED] || "").trim(),
    notes: (row[COLUMNS.NOTES] || "").trim(),
  };
}

function categorizeFromLabels(labels: string[]): string {
  const labelStr = labels.join(" ").toLowerCase();

  if (labelStr.includes("go happy driver") || labelStr.includes("drivers")) {
    return "driver";
  }
  if (
    labelStr.includes("go happy rider") ||
    labelStr.includes("ght rider") ||
    labelStr.includes("parent")
  ) {
    return "parent";
  }
  if (labelStr.includes("school location")) {
    return "school";
  }
  if (labelStr.includes("school contact") || labelStr.includes("teacher")) {
    return "school_staff";
  }
  if (labelStr.includes("vendor") || labelStr.includes("contractor")) {
    return "vendor";
  }
  if (labelStr.includes("business")) {
    return "business";
  }

  return "other";
}

// Sample Google Sheet data (truncated from actual fetch)
// This will be replaced with actual data from the MCP tool
const sampleData: string[][] = [];

async function main() {
  console.log("=== CRM Contact Analysis ===\n");

  // For now, show how to parse the data
  // In production, this would fetch from Google Sheets

  const contacts: SheetContact[] = [];
  for (let i = 0; i < sampleData.length; i++) {
    const contact = parseSheetRow(sampleData[i], i);
    if (contact) {
      contacts.push(contact);
    }
  }

  // Categorize contacts
  const byCategory: Record<string, SheetContact[]> = {};
  for (const contact of contacts) {
    const category = categorizeFromLabels(contact.labels);
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(contact);
  }

  console.log("Contact counts by category:");
  for (const [category, categoryContacts] of Object.entries(byCategory)) {
    console.log(`  ${category}: ${categoryContacts.length}`);
  }

  // Export contacts for Convex import
  console.log("\nTo run analysis, use:");
  console.log(
    "  npx convex run crmImport:analyzeContacts --contacts '<JSON array>'"
  );
}

// Export for use in other scripts
export { parseSheetRow, parseLabels, categorizeFromLabels, SheetContact };

main().catch(console.error);
