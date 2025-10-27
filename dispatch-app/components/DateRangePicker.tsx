import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { getCurrentPayPeriod, getPayPeriodDates } from "../hooks/usePayrollReport";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onDateRangeChange: (startDate: string, endDate: string) => void;
}

/**
 * DateRangePicker Component
 *
 * Provides quick access to standard pay periods (1st-15th, 16th-end)
 * with option for current period.
 */
export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onDateRangeChange,
}) => {
  const currentPeriod = getCurrentPayPeriod();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const handleQuickSelect = (period: "first-half" | "second-half", month?: number, year?: number) => {
    const targetMonth = month ?? currentMonth;
    const targetYear = year ?? currentYear;
    const dates = getPayPeriodDates(targetYear, targetMonth, period);
    onDateRangeChange(dates.startDate, dates.endDate);
  };

  const handleCurrentPeriod = () => {
    onDateRangeChange(currentPeriod.startDate, currentPeriod.endDate);
  };

  const handlePreviousPeriod = () => {
    // Calculate previous pay period
    let targetMonth = currentMonth;
    let targetYear = currentYear;
    let period: "first-half" | "second-half" = currentPeriod.period;

    if (period === "second-half") {
      // Previous period is first-half of same month
      period = "first-half";
    } else {
      // Previous period is second-half of previous month
      period = "second-half";
      targetMonth = targetMonth - 1;
      if (targetMonth < 1) {
        targetMonth = 12;
        targetYear = targetYear - 1;
      }
    }

    const dates = getPayPeriodDates(targetYear, targetMonth, period);
    onDateRangeChange(dates.startDate, dates.endDate);
  };

  const formatDateRange = (start: string, end: string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    if (startDate.getMonth() === endDate.getMonth()) {
      // Same month
      return `${monthNames[startDate.getMonth()]} ${startDate.getDate()}-${endDate.getDate()}, ${startDate.getFullYear()}`;
    } else {
      // Different months
      return `${monthNames[startDate.getMonth()]} ${startDate.getDate()} - ${monthNames[endDate.getMonth()]} ${endDate.getDate()}, ${startDate.getFullYear()}`;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Pay Period</Text>

      <View style={styles.currentRange}>
        <Text style={styles.currentRangeText}>
          {formatDateRange(startDate, endDate)}
        </Text>
      </View>

      <View style={styles.quickButtons}>
        <TouchableOpacity
          style={[
            styles.quickButton,
            startDate === currentPeriod.startDate && endDate === currentPeriod.endDate
              ? styles.quickButtonActive
              : null,
          ]}
          onPress={handleCurrentPeriod}
        >
          <Text style={styles.quickButtonText}>Current Period</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickButton} onPress={handlePreviousPeriod}>
          <Text style={styles.quickButtonText}>Previous Period</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickButtons}>
        <TouchableOpacity
          style={styles.smallButton}
          onPress={() => handleQuickSelect("first-half")}
        >
          <Text style={styles.smallButtonText}>1st-15th</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.smallButton}
          onPress={() => handleQuickSelect("second-half")}
        >
          <Text style={styles.smallButtonText}>16th-End</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        Tap buttons to select different pay periods
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  currentRange: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  currentRangeText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    color: "#007AFF",
  },
  quickButtons: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  quickButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  quickButtonActive: {
    backgroundColor: "#34C759",
  },
  quickButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  smallButton: {
    flex: 1,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  smallButtonText: {
    color: "#007AFF",
    fontSize: 13,
    fontWeight: "500",
  },
  hint: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },
});
