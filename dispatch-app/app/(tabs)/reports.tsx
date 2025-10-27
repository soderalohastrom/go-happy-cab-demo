import React, { useState } from "react";
import { StyleSheet, SafeAreaView } from "react-native";
import { DateRangePicker } from "../../components/DateRangePicker";
import { PayrollReport } from "../../components/PayrollReport";
import { getCurrentPayPeriod } from "../../hooks/usePayrollReport";

/**
 * Reports Screen
 *
 * Payroll reporting interface for dispatch app.
 * Allows selection of date ranges and export of payroll data.
 */
export default function ReportsScreen() {
  const currentPeriod = getCurrentPayPeriod();

  const [startDate, setStartDate] = useState(currentPeriod.startDate);
  const [endDate, setEndDate] = useState(currentPeriod.endDate);

  const handleDateRangeChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  return (
    <SafeAreaView style={styles.container}>
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={handleDateRangeChange}
      />

      <PayrollReport startDate={startDate} endDate={endDate} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
});
