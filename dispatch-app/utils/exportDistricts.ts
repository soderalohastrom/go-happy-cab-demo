import { Platform } from "react-native";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";

/**
 * District Report Export Utilities
 *
 * Generates CSV files from district/school/children hierarchy data.
 * Handles file saving and sharing via React Native APIs.
 */

export interface DistrictReportData {
  selectedDate: string;
  selectedPeriod: "AM" | "PM";
  districts: Array<{
    districtId: string;
    districtName: string;
    schools: Array<{
      schoolId: string;
      schoolName: string;
      children: Array<{
        childId: string;
        childName: string;
        grade: string;
      }>;
    }>;
  }>;
}

/**
 * Generate CSV from district report data
 * Flattens district → school → children hierarchy into rows
 */
export const generateCSV = (data: DistrictReportData): string => {
  const { districts } = data;

  // Header row
  let csv = "District Name,District ID,School Name,School ID,Child Name,Child ID,Grade\n";

  // Data rows - one row per child
  districts.forEach((district) => {
    district.schools.forEach((school) => {
      school.children.forEach((child) => {
        csv += `"${district.districtName}","${district.districtId}","${school.schoolName}","${school.schoolId}","${child.childName}","${child.childId}","${child.grade}"\n`;
      });
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
 * Export district report as CSV
 */
export const exportCSV = async (
  data: DistrictReportData
): Promise<{ success: boolean; error?: string }> => {
  const csv = generateCSV(data);
  const filename = `districts_${data.selectedDate}_${data.selectedPeriod}.csv`;
  return saveAndShareFile(csv, filename, "text/csv");
};
