import { Platform } from "react-native";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";

/**
 * Assignment Export Utilities
 *
 * Generates CSV files from driver-child assignment data.
 * Handles file saving and sharing via React Native APIs.
 */

export interface DriverAssignment {
  driverId: string;
  driverName: string;
  children: Array<{
    childId: string;
    childName: string;
    grade: string;
    schoolName: string;
    districtName?: string;
  }>;
}

export interface AssignmentReportResponse {
  assignments: DriverAssignment[];
  unassignedDrivers: Array<{ driverId: string; driverName: string }>;
  unassignedChildren: Array<{
    childId: string;
    childName: string;
    grade: string;
    schoolName: string;
    districtName?: string;
  }>;
}

/**
 * Generate CSV from assignment report data
 * Flattens driver-child pairings into rows
 * Appends Unassigned Drivers and Children
 */
export const generateCSV = (data: AssignmentReportResponse): string => {
  const { assignments, unassignedDrivers, unassignedChildren } = data;

  // Header row
  let csv = "Driver Name,Driver ID,Child Name,Child ID,grade,School,District\n";

  // 1. Assigned Rows
  assignments.forEach((driver) => {
    driver.children.forEach((child) => {
      const district = child.districtName || "";
      csv += `"${driver.driverName}","${driver.driverId}","${child.childName}","${child.childId}","${child.grade}","${child.schoolName}","${district}"\n`;
    });
  });

  // 2. Unassigned Drivers
  if (unassignedDrivers.length > 0) {
    csv += "\nUnassigned Drivers,,,,,,\n"; // Section Header (optional or just rows)
    unassignedDrivers.forEach((driver) => {
      csv += `"${driver.driverName}","${driver.driverId}",,,,,\n`;
    });
  }

  // 3. Unassigned Children
  if (unassignedChildren.length > 0) {
    csv += "\n,,Unassigned Children,,,,\n"; // Section Header
    unassignedChildren.forEach((child) => {
      const district = child.districtName || "";
      csv += `,,"${child.childName}","${child.childId}","${child.grade}","${child.schoolName}","${district}"\n`;
    });
  }

  return csv;
};

/**
 * Save and share a file
 *
 * @param content - File content (string)
 * @param filename - Name of the file
 * @param mimeType - MIME type for sharing
 * @returns Success status
 */
export const saveAndShareFile = async (
  content: string,
  filename: string,
  mimeType: string = "text/plain"
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return { success: true };
    }

    // Create file path in cache directory
    // @ts-ignore
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    // Write file to cache
    await FileSystem.writeAsStringAsync(fileUri, content, {
      // @ts-ignore
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();

    if (!isAvailable) {
      return {
        success: false,
        error: "Sharing is not available on this device",
      };
    }

    // Share the file
    await Sharing.shareAsync(fileUri, {
      mimeType,
      dialogTitle: `Share ${filename}`,
      UTI: mimeType,
    });

    return { success: true };
  } catch (error) {
    console.error("Error saving/sharing file:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Export assignment report as CSV
 */
export const exportCSV = async (
  data: AssignmentReportResponse,
  date: string,
  period: string
): Promise<{ success: boolean; error?: string }> => {
  const csv = generateCSV(data);
  const filename = `assignments_${date}_${period}.csv`;
  return saveAndShareFile(csv, filename, "text/csv");
};
