import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { usePayrollReport } from "../hooks/usePayrollReport";
import { exportMarkdown, exportCSV } from "../utils/exportPayroll";
import { useGoogleSheetsExport } from '../hooks/useGoogleSheetsExport';
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface PayrollReportProps {
  startDate: string;
  endDate: string;
}

/**
 * PayrollReport Component
 *
 * Displays payroll summary table with:
 * - Driver totals by trip status
 * - Expandable driver details
 * - Export buttons (Markdown & CSV)
 */
export const PayrollReport: React.FC<PayrollReportProps> = ({
  startDate,
  endDate,
}) => {
  const { report, isLoading, hasData } = usePayrollReport(startDate, endDate);
  const [expandedDrivers, setExpandedDrivers] = useState<Set<string>>(
    new Set()
  );
  const [isExporting, setIsExporting] = useState(false);
  const { exportToNewSheet, isExporting: isExportingSheets, exportError } = useGoogleSheetsExport();

  const toggleDriver = (driverId: string) => {
    const newExpanded = new Set(expandedDrivers);
    if (newExpanded.has(driverId)) {
      newExpanded.delete(driverId);
    } else {
      newExpanded.add(driverId);
    }
    setExpandedDrivers(newExpanded);
  };

  const handleExportMarkdown = async () => {
    if (!report) return;

    setIsExporting(true);
    const result = await exportMarkdown(report);
    setIsExporting(false);

    if (!result.success) {
      Alert.alert("Export Failed", result.error || "Unknown error");
    }
  };

  const handleExportCSV = async () => {
    if (!report) return;

    setIsExporting(true);
    const result = await exportCSV(report);
    setIsExporting(false);

    if (!result.success) {
      Alert.alert("Export Failed", result.error || "Unknown error");
    }
  };

  const handleExportToGoogleSheets = async () => {
    if (!report || report.drivers.length === 0) {
      Alert.alert('No Data', 'No payroll data to export');
      return;
    }

    try {
      // Transform report data for Convex action
      const driverPayroll = report.drivers.map(d => ({
        driverName: d.fullName,
        employeeId: d.employeeId,
        totalTrips: d.totalTrips,
        pickups: d.completedTrips,
        noGos: d.noShowTrips,
        preCancels: d.cancelledTrips,
        totalPay: d.totalPay,
      }));

      const config = {
        pickupRate: report.config.baseRate,
        noGoRate: report.drivers[0]?.payBreakdown.noShowRate || 25,
        preCancelRate: report.drivers[0]?.payBreakdown.cancelledRate || 20,
      };

      // Call Convex action directly (service account auth on backend)
      const result = await exportToNewSheet(
        driverPayroll,
        startDate,
        endDate,
        config
      );

      if (result) {
        Alert.alert(
          'Export Successful! 🎉',
          `${result.totalDrivers} drivers\n$${result.totalPay.toFixed(2)} total`,
          [
            { text: 'View Sheet', onPress: () => Linking.openURL(result.spreadsheetUrl) },
            { text: 'Done', style: 'cancel' }
          ]
        );
      }
    } catch (error: any) {
      console.error('Google Sheets export error:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      Alert.alert('Export Failed', errorMessage);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading payroll data...</Text>
      </View>
    );
  }

  if (!hasData || !report) {
    return (
      <View style={styles.centered}>
        <FontAwesome name="file-text-o" size={48} color="#ccc" />
        <Text style={styles.emptyText}>No trips found for this period</Text>
        <Text style={styles.emptySubtext}>
          Try selecting a different date range
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary Stats */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Period Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{report.totals.totalTrips}</Text>
            <Text style={styles.summaryLabel}>Total Trips</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {report.totals.completedTrips}
            </Text>
            <Text style={styles.summaryLabel}>Pick-ups</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{report.totals.noShowTrips}</Text>
            <Text style={styles.summaryLabel}>No-Gos</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {report.totals.cancelledTrips}
            </Text>
            <Text style={styles.summaryLabel}>Pre-Cancels</Text>
          </View>
        </View>
        <View style={styles.totalPayRow}>
          <Text style={styles.totalPayLabel}>Total Payroll:</Text>
          <Text style={styles.totalPayValue}>
            ${report.totals.totalPay.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Export Buttons */}
      <View style={styles.exportButtons}>
        <TouchableOpacity
          style={[styles.exportButton, styles.csvButton, isExporting && styles.exportButtonDisabled]}
          onPress={handleExportCSV}
          disabled={isExporting}
        >
          <FontAwesome name="file-excel-o" size={16} color="white" />
          <Text style={styles.exportButtonText}>CSV</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.exportButton,
            styles.sheetsButton,
            (isExportingSheets || !report?.drivers.length) && styles.exportButtonDisabled
          ]}
          onPress={handleExportToGoogleSheets}
          disabled={isExportingSheets || !report?.drivers.length}
        >
          {isExportingSheets ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <FontAwesome name="google" size={16} color="white" />
              <View>
                <Text style={styles.exportButtonText}>Google Sheets</Text>
                <Text style={styles.exportButtonSubtext}>Formatted</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Error Display */}
      {exportError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {exportError}</Text>
        </View>
      )}

      {/* Driver List */}
      <ScrollView style={styles.driverList}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.nameCell]}>Driver</Text>
          <Text style={[styles.headerCell, styles.numCell]}>Trips</Text>
          <Text style={[styles.headerCell, styles.numCell]}>Pay</Text>
          <View style={styles.expandCell} />
        </View>

        {report.drivers.map((driver) => {
          const isExpanded = expandedDrivers.has(driver.driverId);

          return (
            <View key={driver.driverId} style={styles.driverRow}>
              <TouchableOpacity
                style={styles.driverSummary}
                onPress={() => toggleDriver(driver.driverId)}
              >
                <Text style={[styles.cell, styles.nameCell]}>
                  {driver.fullName}
                </Text>
                <Text style={[styles.cell, styles.numCell]}>
                  {driver.totalTrips}
                </Text>
                <Text style={[styles.cell, styles.numCell]}>
                  ${driver.totalPay.toFixed(2)}
                </Text>
                <View style={styles.expandCell}>
                  <FontAwesome
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={14}
                    color="#666"
                  />
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.driverDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Employee ID:</Text>
                    <Text style={styles.detailValue}>{driver.employeeId}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>AM Trips:</Text>
                    <Text style={styles.detailValue}>{driver.amTrips}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>PM Trips:</Text>
                    <Text style={styles.detailValue}>{driver.pmTrips}</Text>
                  </View>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Pick-ups:</Text>
                    <Text style={styles.detailValue}>
                      {driver.completedTrips} × $
                      {report.config.baseRate.toFixed(2)} = $
                      {driver.payBreakdown.completedPay.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>No-Gos:</Text>
                    <Text style={styles.detailValue}>
                      {driver.noShowTrips} × $
                      {driver.payBreakdown.noShowRate.toFixed(2)} = $
                      {driver.payBreakdown.noShowPay.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Pre-Cancels:</Text>
                    <Text style={styles.detailValue}>
                      {driver.cancelledTrips} × $
                      {driver.payBreakdown.cancelledRate.toFixed(2)} = $
                      {driver.payBreakdown.cancelledPay.toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#999",
  },
  summaryCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  totalPayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  totalPayLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  totalPayValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#34C759",
  },
  exportButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  exportButton: {
    flex: 1,
    flexDirection: "row",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  csvButton: {
    backgroundColor: "#6B7280",
  },
  sheetsButton: {
    backgroundColor: "#0F9D58", // Google green
  },
  exportButtonDisabled: {
    backgroundColor: "#ccc",
    opacity: 0.6,
  },
  exportButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  exportButtonSubtext: {
    color: "white",
    fontSize: 11,
    marginTop: 2,
    opacity: 0.9,
  },
  errorContainer: {
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  errorText: {
    color: "#991B1B",
    fontSize: 13,
  },
  driverList: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  headerCell: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  nameCell: {
    flex: 2,
  },
  numCell: {
    flex: 1,
    textAlign: "right",
  },
  expandCell: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  driverRow: {
    backgroundColor: "white",
    marginBottom: 8,
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  driverSummary: {
    flexDirection: "row",
    padding: 12,
    alignItems: "center",
  },
  cell: {
    fontSize: 14,
    color: "#333",
  },
  driverDetails: {
    padding: 12,
    paddingTop: 0,
    backgroundColor: "#f9f9f9",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: "#666",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#333",
  },
  detailDivider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 8,
  },
});
