import React, { useState } from "react";
import { StyleSheet, SafeAreaView } from "react-native";
import { DateRangePicker } from "../../components/DateRangePicker";
import { PayrollReport } from "../../components/PayrollReport";
import { getCurrentPayPeriod } from "../../hooks/usePayrollReport";
import ReportTabs from "../../components/ReportTabs";
import DriverChildReport from "../../components/DriverChildReport";
import DistrictSchoolReport from "../../components/DistrictSchoolReport";

type TabType = 'payroll' | 'assignments' | 'districts';

/**
 * Reports Screen
 *
 * Multi-report interface with tabbed navigation:
 * - Payroll: Date range export for driver compensation
 * - Assignments: Driver/child pairings for specific dates
 * - Districts: Hierarchical district → school → children report
 */
export default function ReportsScreen() {
  const currentPeriod = getCurrentPayPeriod();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('payroll');

  // Payroll report state (date range)
  const [startDate, setStartDate] = useState(currentPeriod.startDate);
  const [endDate, setEndDate] = useState(currentPeriod.endDate);

  const handleDateRangeChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ReportTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'payroll' && (
        <>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDateRangeChange={handleDateRangeChange}
          />
          <PayrollReport startDate={startDate} endDate={endDate} />
        </>
      )}

      {activeTab === 'assignments' && <DriverChildReport />}

      {activeTab === 'districts' && <DistrictSchoolReport />}
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
