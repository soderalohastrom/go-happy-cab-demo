/**
 * Import Google Contacts from Sheet to Convex CRM
 *
 * This script fetches all contacts from the Google Sheet and imports them
 * into the Convex crmContacts table.
 *
 * Usage: node scripts/import-google-contacts.js
 */

const { ConvexHttpClient } = require("convex/browser");

const CONVEX_URL = "https://colorful-wildcat-524.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

// Column indices based on the header row
const COLUMNS = {
  firstName: 0,
  middleName: 1,
  lastName: 2,
  organizationName: 10,
  organizationTitle: 11,
  organizationDepartment: 12,
  notes: 14,
  labels: 16,
  email1: 18,
  email2: 20,
  phone1: 24,
  phone2: 26,
  phone3: 28,
  address1Formatted: 34,
};

function parseLabels(labelString) {
  if (!labelString) return [];
  // Labels are separated by " ::: "
  return labelString
    .split(" ::: ")
    .map(l => l.trim())
    .filter(l => l.length > 0);
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
  const email = row[COLUMNS.email1]?.trim() || row[COLUMNS.email2]?.trim() || undefined;

  // Get first non-empty phone
  const phone = row[COLUMNS.phone1]?.trim() || row[COLUMNS.phone2]?.trim() || row[COLUMNS.phone3]?.trim() || undefined;

  // Get alternate phone if primary exists
  let alternatePhone = undefined;
  if (phone === row[COLUMNS.phone1]?.trim()) {
    alternatePhone = row[COLUMNS.phone2]?.trim() || row[COLUMNS.phone3]?.trim() || undefined;
  } else if (phone === row[COLUMNS.phone2]?.trim()) {
    alternatePhone = row[COLUMNS.phone3]?.trim() || undefined;
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
    source: "google_contacts_import",
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
      const result = await client.mutation("crm:bulkCreate", { contacts: batch });
      totalImported += result.created;
      console.log(`  Imported ${result.created} contacts (total: ${totalImported})`);
    } catch (error) {
      console.error(`  Error importing batch:`, error.message);
    }
  }

  return totalImported;
}

// Main execution - expects data to be piped in as JSON
async function main() {
  let data = "";

  process.stdin.setEncoding("utf8");

  for await (const chunk of process.stdin) {
    data += chunk;
  }

  const rows = JSON.parse(data);
  console.log(`Received ${rows.length} rows from Google Sheet`);

  // Skip header row and parse contacts
  const contacts = rows
    .slice(1) // Skip header
    .map((row, index) => parseContact(row, index))
    .filter(c => c !== null);

  console.log(`Parsed ${contacts.length} valid contacts`);

  // Import to Convex
  const imported = await importContacts(contacts);
  console.log(`\nImport complete! Imported ${imported} contacts.`);
}

main().catch(console.error);
