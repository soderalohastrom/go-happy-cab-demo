import os
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from convex import ConvexClient

# Configuration
CONVEX_URL = os.environ.get("CONVEX_URL", "https://colorful-wildcat-524.convex.cloud")
SERVICE_ACCOUNT_FILE = "service_account.json"

# Spreadsheets
SHEET_ID_CHILDREN = "11HTH-AfDomCVXHsLeRR_hq89rh3nadIjaLjPy9W02S0"
SHEET_ID_DRIVERS = "1EufHplSBVl4rFZRNos4z39IHYQ1EJonf-FSG9lb81QE"

# Sheet Names
SHEET_NAME_CHILDREN = "Sheet1"
SHEET_NAME_DRIVERS = "2025 Active Drivers"

def get_convex_client():
    return ConvexClient(CONVEX_URL)

def get_sheets_service():
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=['https://www.googleapis.com/auth/spreadsheets.readonly'])
    return build('sheets', 'v4', credentials=creds)

def get_sheet_data(service, spreadsheet_id, sheet_name):
    sheet = service.spreadsheets()
    result = sheet.values().get(spreadsheetId=spreadsheet_id, range=sheet_name).execute()
    values = result.get('values', [])
    
    if not values:
        return []
    
    headers = values[0]
    data = []
    for row in values[1:]:
        # Pad row with empty strings if it's shorter than headers
        row += [''] * (len(headers) - len(row))
        data.append(dict(zip(headers, row)))
    return data

def parse_bool(value):
    return value.strip().upper() == 'Y'

def import_drivers(client, data):
    print(f"Processing {len(data)} drivers...")
    drivers_to_import = []
    
    for row in data:
        first_name = row.get("Driver_FirstNm", "").strip()
        last_name = row.get("Driver_LastNm", "").strip()
        email = row.get("Email", "").strip()
        
        if not first_name or not last_name:
            continue
            
        drivers_to_import.append({
            "firstName": first_name,
            "middleName": row.get("Driver_MiddleNm", "").strip(),
            "lastName": last_name,
            "email": email,
            "phone": row.get("Cell", "").strip(),
            "address": {
                "street": row.get("Street", "").strip(),
                "street2": row.get("Street2", "").strip(),
                "city": row.get("City", "").strip(),
                "state": row.get("State", "").strip(),
                "zip": row.get("ZIP", "").strip(),
            },
            "ssn": row.get("Driver_SS#", "").strip(),
            "itin": row.get("Driver_ITIN", "").strip(),
            "licenseNumber": row.get("DL/CDL #", "").strip(),
            "fingerprintsOnFile": parse_bool(row.get("Fingerprints on File", "")),
            "fingerprintsVerified": parse_bool(row.get("Fingerprints Verified with DOJ", "")),
            "tbTestVerified": parse_bool(row.get("TB Test Results Verified", "")),
            "taxiApplicationStatus": row.get("Taxi Application completed", "").strip(),
            "mvrStatus": row.get("MVR", "").strip(),
            "startDate": row.get("Date Contracted", "").strip(),
            "specialEquipment": "TCP" if row.get("Need Commercial Plate for TCP", "") == "Y" else "",
            # "primaryLanguage": row.get("Driver_Language", "").strip(), # Not in new sheet?
            # "availabilityAM": row.get("AM Availability", "").strip(), # Not in new sheet?
        })
    
    if drivers_to_import:
        # Batching
        batch_size = 50
        for i in range(0, len(drivers_to_import), batch_size):
            batch = drivers_to_import[i:i + batch_size]
            print(f"Importing drivers batch {i} to {i+batch_size}...")
            result = client.mutation("importData:importDrivers", {"drivers": batch})
            print(f"Batch Result: {result}")
    else:
        print("No drivers to import.")

def import_children(client, data):
    print(f"Processing {len(data)} children...")
    children_to_import = []
    
    for row in data:
        first_name = row.get("Rider_FirstNm", "").strip()
        last_name = row.get("Rider_LastNm", "").strip()
        
        if not first_name or not last_name:
            continue
            
        children_to_import.append({
            "firstName": first_name,
            "lastName": last_name,
            "schoolName": row.get("School Name", "").strip(),
            "studentId": row.get("Rider Code", "").strip(),
            "rideType": row.get("Ryder Type", "").strip(),
            "pickupTime": row.get("AM Pickup Time", "").strip(),
            "classStartTime": row.get("Class Start Time", "").strip(),
            "classEndTime": row.get("Class End Time", "").strip(),
            "homeAddress": {
                "street": row.get("HmLocation1_Street", "").strip(),
                "city": "Unknown", 
                "state": "CA",
                "zip": ""
            },
            "parent1": {
                "firstName": row.get("Parent1_FirstNm", "").strip(),
                "lastName": row.get("Parent1_LastNm", "").strip(),
                "phone": row.get("Parent1_Cell", "").strip(),
            },
            # New fields mapping (Sheet1 doesn't have all of them, but we map what we can)
            # "notes": row.get("Notes", "").strip(), 
        })
        
    if children_to_import:
        batch_size = 50
        for i in range(0, len(children_to_import), batch_size):
            batch = children_to_import[i:i + batch_size]
            print(f"Importing children batch {i} to {i+batch_size}...")
            result = client.mutation("importData:importChildren", {"children": batch})
            print(f"Batch Result: {result}")
    else:
        print("No children to import.")

def import_assignments(client, data):
    print("Processing assignments...")
    assignments_to_import = []
    
    for row in data:
        child_first = row.get("Rider_FirstNm", "").strip()
        child_last = row.get("Rider_LastNm", "").strip()
        am_driver = row.get("2025/26 PU1_Drv_FirstNm", "").strip()
        pm_driver = row.get("PU2_Drv_FirstNm", "").strip()
        
        if not child_first or not child_last:
            continue
            
        if am_driver:
            assignments_to_import.append({
                "childFirstName": child_first,
                "childLastName": child_last,
                "driverFirstName": am_driver,
                "period": "AM",
                "type": "pickup"
            })
            
        if pm_driver:
             assignments_to_import.append({
                "childFirstName": child_first,
                "childLastName": child_last,
                "driverFirstName": pm_driver,
                "period": "PM",
                "type": "dropoff"
            })
            
    if assignments_to_import:
        print(f"Found {len(assignments_to_import)} assignments.")
        batch_size = 50
        for i in range(0, len(assignments_to_import), batch_size):
            batch = assignments_to_import[i:i + batch_size]
            print(f"Importing assignments batch {i} to {i+batch_size}...")
            result = client.mutation("importData:importAssignments", {"assignments": batch})
            print(f"Batch Result: {result}")
    else:
        print("No assignments found.")

def main():
    client = get_convex_client()
    service = get_sheets_service()
    
    # 1. Import Drivers (from New Sheet)
    print("--- Importing Drivers ---")
    drivers_data = get_sheet_data(service, SHEET_ID_DRIVERS, SHEET_NAME_DRIVERS)
    import_drivers(client, drivers_data)
    
    # 2. Import Children (from Original Sheet)
    print("\n--- Importing Children ---")
    children_data = get_sheet_data(service, SHEET_ID_CHILDREN, SHEET_NAME_CHILDREN)
    import_children(client, children_data)
    
    # 3. Import Assignments (from Original Sheet)
    print("\n--- Importing Assignments ---")
    import_assignments(client, children_data)
    
    print("\nDone!")

if __name__ == "__main__":
    main()
