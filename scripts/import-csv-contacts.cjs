/**
 * Import Google Contacts from CSV to Convex CRM
 *
 * Usage: node scripts/import-csv-contacts.js
 */

const { ConvexHttpClient } = require("convex/browser");
const fs = require("fs");
const path = require("path");

const CONVEX_URL = "https://colorful-wildcat-524.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

const CSV_FILE = path.join(__dirname, "contacts_cathey.csv");

// Column indices based on the header row (0-indexed)
const COLUMNS = {
  firstName: 0,
  middleName: 1,
  lastName: 2,
  organizationName: 10,
  organizationTitle: 11,
  organizationDepartment: 12,
  notes: 14,
  labels: 16,
  email1Value: 18,
  email2Value: 20,
  phone1Value: 24,
  phone2Value: 26,
  phone3Value: 28,
  address1Formatted: 34,
};

function parseLabels(labelString) {
  if (!labelString) return [];
  return labelString
    .split(" ::: ")
    .map(l => l.trim())
    .filter(l => l.length > 0);
}

function parseCSV(csvContent) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++;
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
      } else if (char === ',') {
        // Field separator
        currentRow.push(currentField);
        currentField = "";
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        // Row separator
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
        if (char === '\r') i++; // Skip \n in \r\n
      } else if (char === '\r') {
        // Row separator (just \r)
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  // Handle last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

function parseContact(row, rowIndex) {
  const firstName = row[COLUMNS.firstName]?.trim() || undefined;
  const middleName = row[COLUMNS.middleName]?.trim() || undefined;
  const lastName = row[COLUMNS.lastName]?.trim() || undefined;
  const organizationName = row[COLUMNS.organizationName]?.trim() || undefined;
  const organizationTitle = row[COLUMNS.organizationTitle]?.trim() || undefined;
  const organizationDepartment = row[COLUMNS.organizationDepartment]?.trim() || undefined;
  const notes = row[COLUMNS.notes]?.trim() || undefined;
  const labels = parseLabels(row[COLUMNS.labels]);

  // Get first non-empty email
  const email = row[COLUMNS.email1Value]?.trim() || row[COLUMNS.email2Value]?.trim() || undefined;

  // Get first non-empty phone
  const phone = row[COLUMNS.phone1Value]?.trim() || row[COLUMNS.phone2Value]?.trim() || row[COLUMNS.phone3Value]?.trim() || undefined;

  // Get alternate phone if primary exists
  let alternatePhone = undefined;
  if (phone === row[COLUMNS.phone1Value]?.trim()) {
    alternatePhone = row[COLUMNS.phone2Value]?.trim() || row[COLUMNS.phone3Value]?.trim() || undefined;
  } else if (phone === row[COLUMNS.phone2Value]?.trim()) {
    alternatePhone = row[COLUMNS.phone3Value]?.trim() || undefined;
  }

  // Get formatted address
  const address = row[COLUMNS.address1Formatted]?.trim() || undefined;

  // Skip completely empty rows
  if (!firstName && !lastName && !organizationName && !email && !phone) {
    return null;
  }

  return {
    firstName,
    middleName,
    lastName,
    organizationName,
    organizationTitle,
    organizationDepartment,
    email,
    phone,
    alternatePhone,
    address,
    labels,
    notes,
    source: "google_contacts_csv",
    sourceRowId: `row_${rowIndex + 2}`, // +2 for 1-indexed and header row
  };
}

async function importContacts(contacts) {
  const BATCH_SIZE = 50;
  let totalImported = 0;

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    console.log(`Importing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(contacts.length / BATCH_SIZE)} (${batch.length} contacts)...`);

    try {
      const result = await client.mutation("crmImport:bulkCreate", { contacts: batch });
      totalImported += result.created;
      console.log(`  Imported ${result.created} contacts (total: ${totalImported})`);
    } catch (error) {
      console.error(`  Error importing batch:`, error.message);
    }
  }

  return totalImported;
}

async function main() {
  console.log(`Reading CSV from: ${CSV_FILE}`);
  const csvContent = fs.readFileSync(CSV_FILE, "utf8");

  console.log("Parsing CSV...");
  const rows = parseCSV(csvContent);
  console.log(`Parsed ${rows.length} rows from CSV`);

  // Skip header row and parse contacts
  const contacts = rows
    .slice(1)
    .map((row, index) => parseContact(row, index))
    .filter(c => c !== null);

  console.log(`Found ${contacts.length} valid contacts`);

  // Show some sample labels found
  const allLabels = new Set();
  contacts.forEach(c => c.labels.forEach(l => allLabels.add(l)));
  console.log(`\nUnique labels found: ${allLabels.size}`);
  console.log("Sample labels:", Array.from(allLabels).slice(0, 10).join(", "));

  // Import to Convex
  console.log("\nStarting import to Convex CRM...");
  const imported = await importContacts(contacts);
  console.log(`\n✅ Import complete! Imported ${imported} contacts.`);
}

main().catch(console.error);
