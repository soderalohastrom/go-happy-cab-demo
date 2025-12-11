import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";

/**
 * Assignment Export Utilities
 *
 * Generates CSV files from driver-child assignment data.
 * Handles file saving and sharing via React Native APIs.
 */

export interface AssignmentReportData {
  selectedDate: string;
  selectedPeriod: "AM" | "PM";
  drivers: Array<{
    driverId: string;
    driverName: string;
    children: Array<{
      childId: string;
      childName: string;
      grade: string;
      schoolName: string;
    }>;
  }>;
}

/**
 * Generate CSV from assignment report data
 * Flattens driver-child pairings into rows
 */
export const generateCSV = (data: AssignmentReportData): string => {
  const { drivers } = data;

  // Header row
  let csv = "Driver Name,Child Name,Grade,School\n";

  // Data rows - one row per child
  drivers.forEach((driver) => {
    driver.children.forEach((child) => {
      csv += `"${driver.driverName}","${child.childName}","${child.grade}","${child.schoolName}"\n`;
    });
  });

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
    // Create file path in cache directory
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    // Write file to cache
    await FileSystem.writeAsStringAsync(fileUri, content, {
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
  data: AssignmentReportData
): Promise<{ success: boolean; error?: string }> => {
  const csv = generateCSV(data);
  const filename = `assignments_${data.selectedDate}_${data.selectedPeriod}.csv`;
  return saveAndShareFile(csv, filename, "text/csv");
};
