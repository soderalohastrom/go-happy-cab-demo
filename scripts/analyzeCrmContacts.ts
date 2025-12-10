/**
 * CRM Contact Analysis Script
 *
 * Parses Google Sheet "Cathey Contacts" data and prepares it for
 * fuzzy matching against existing Convex entities.
 *
 * Run with: npx ts-node scripts/analyzeCrmContacts.ts
 */

// Column indices from Google Sheet
const COLUMNS = {
  FIRST_NAME: 0,
  MIDDLE_NAME: 1,
  LAST_NAME: 2,
  PHONETIC_FIRST_NAME: 3,
  PHONETIC_MIDDLE_NAME: 4,
  PHONETIC_LAST_NAME: 5,
  NAME_PREFIX: 6,
  NAME_SUFFIX: 7,
  NICKNAME: 8,
  FILE_AS: 9,
  ORG_NAME: 10,
  ORG_TITLE: 11,
  ORG_DEPARTMENT: 12,
  BIRTHDAY: 13,
  NOTES: 14,
  PHOTO: 15,
  LABELS: 16,
  EMAIL_1_LABEL: 17,
  EMAIL_1_VALUE: 18,
  PHONE_1_LABEL: 23,
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
  category: string;
}

function parseLabels(labelsStr: string): string[] {
  if (!labelsStr) return [];
  return labelsStr
    .split(":::")
    .map((l) => l.trim())
    .filter(Boolean);
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

function parseSheetRow(row: string[], rowIndex: number): SheetContact | null {
  // Skip header row
  if (rowIndex === 0) return null;

  // Skip empty rows
  const firstName = row[COLUMNS.FIRST_NAME] || "";
  const lastName = row[COLUMNS.LAST_NAME] || "";
  const orgName = row[COLUMNS.ORG_NAME] || "";

  // Need at least a name or org
  if (!firstName && !lastName && !orgName) return null;

  const labels = parseLabels(row[COLUMNS.LABELS] || "");
  const category = categorizeFromLabels(labels);

  return {
    rowIndex,
    firstName: firstName.trim(),
    middleName: (row[COLUMNS.MIDDLE_NAME] || "").trim(),
    lastName: lastName.trim(),
    organizationName: orgName.trim(),
    organizationTitle: (row[COLUMNS.ORG_TITLE] || "").trim(),
    organizationDepartment: (row[COLUMNS.ORG_DEPARTMENT] || "").trim(),
    labels,
    email: (row[COLUMNS.EMAIL_1_VALUE] || "").trim(),
    phone: (row[COLUMNS.PHONE_1_VALUE] || "").trim(),
    address: (row[COLUMNS.ADDRESS_1_FORMATTED] || "").trim(),
    notes: (row[COLUMNS.NOTES] || "").trim(),
    category,
  };
}

// Summary function for contacts
function summarizeContacts(contacts: SheetContact[]) {
  const byCategory: Record<string, number> = {};
  const byLabelGroup: Record<string, number> = {};

  for (const contact of contacts) {
    byCategory[contact.category] = (byCategory[contact.category] || 0) + 1;

    for (const label of contact.labels) {
      byLabelGroup[label] = (byLabelGroup[label] || 0) + 1;
    }
  }

  console.log("\n=== Contact Analysis Summary ===\n");
  console.log(`Total contacts: ${contacts.length}\n`);

  console.log("By Category:");
  for (const [category, count] of Object.entries(byCategory).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${category}: ${count}`);
  }

  console.log("\nTop Labels:");
  const sortedLabels = Object.entries(byLabelGroup)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  for (const [label, count] of sortedLabels) {
    console.log(`  ${label}: ${count}`);
  }

  // Sample contacts by category
  console.log("\n=== Sample Contacts by Category ===\n");

  const categories = ["driver", "parent", "school", "school_staff", "other"];
  for (const cat of categories) {
    const samples = contacts.filter((c) => c.category === cat).slice(0, 3);
    if (samples.length > 0) {
      console.log(`\n--- ${cat.toUpperCase()} ---`);
      for (const s of samples) {
        const name = `${s.firstName} ${s.lastName}`.trim() || s.organizationName;
        console.log(`  ${name} | ${s.phone} | ${s.organizationTitle}`);
      }
    }
  }
}

// Export for use in Convex import
export function prepareContactsForImport(sheetData: string[][]): SheetContact[] {
  const contacts: SheetContact[] = [];

  for (let i = 0; i < sheetData.length; i++) {
    const contact = parseSheetRow(sheetData[i], i);
    if (contact) {
      contacts.push(contact);
    }
  }

  return contacts;
}

// If running directly, show summary
if (require.main === module) {
  console.log("Run this script to analyze Google Sheet contacts.");
  console.log("Usage: Import prepareContactsForImport() and pass sheet data.");
}

export { SheetContact, summarizeContacts };
