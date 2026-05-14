import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { downloadCsv, getReportFilename } from "../utils/reportExport";
import { API_BASE_URL } from "../config/api";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import "./ChiefDoctorReportsPage.css";

const formatDateInput = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatDisplayDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

const normalizeDepartment = (value) =>
  String(value || "").trim().toLowerCase().replace(/[_\s]+/g, "");

const allowedCaseDepartmentsByChiefDepartment = {
  pedodontics: ["pedodontics"],
  prosthodontics: ["completeDenture", "fpd", "implant", "implantPatient", "partial"],
  prothodontics: ["completeDenture", "fpd", "implant", "implantPatient", "partial"],
  prosthondontics: ["completeDenture", "fpd", "implant", "implantPatient", "partial"],
  completedenture: ["completeDenture"],
  fpd: ["fpd"],
  fixedpartialdenture: ["fpd"],
  implantology: ["implant", "implantPatient"],
  implant: ["implant"],
  implantpatient: ["implantPatient"],
  partialdenture: ["partial"],
  partial: ["partial"]
};

const ChiefDoctorReportsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

 const [fromDate, setFromDate] = useState(formatDateInput(new Date()));
  const [toDate, setToDate] = useState(formatDateInput(new Date()));
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReport = async () => {
    const token = user?.token || localStorage.getItem("token");
    if (!token) {
      setError("Authentication token missing. Please log in again.");
      setReportData(null);
      return;
    }

    // Validate date range
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    if (from > to) {
      setError("'From Date' cannot be later than 'To Date'");
      setReportData(null);
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      // Calculate number of days in the date range
      const daysDifference = Math.ceil((to - from) / (1000 * 60 * 60 * 24));
      
      // Fetch enough weeks to cover the date range (with some buffer)
      const weeksToFetch = Math.min(Math.ceil(daysDifference / 7) + 2, 52);

      // Use the same endpoint as weekly/monthly reports
      const res = await fetch(`${API_BASE_URL}/api/reports/weekly?weeks=${weeksToFetch}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Failed to load report (${res.status})`);
      }

      const json = await res.json();
      if (json.success === false) {
        throw new Error(json.message || "Failed to load report");
      }

      const weeks = Array.isArray(json.weeks) ? json.weeks : (Array.isArray(json) ? json : [json]);
      
      // Aggregate the weeks data based on date range
      const aggregatedData = aggregateWeeksDataByDateRange(weeks, from, to);
      
      setReportData(aggregatedData);
    } catch (err) {
      setError(err.message || "Unable to load report");
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to aggregate weekly data based on date range
  const aggregateWeeksDataByDateRange = (weeks, fromDate, toDate) => {
    if (!weeks || weeks.length === 0) {
      return {
        windowStart: fromDate.toISOString(),
        windowEnd: toDate.toISOString(),
        totalPatientsVisited: 0,
        malePatients: 0,
        femalePatients: 0,
        newPatientsVisited: 0,
        oldPatientsVisited: 0,
        totalCaseSheets: 0,
        caseSheetCounts: {},
        departmentBreakdown: []
      };
    }

    // Filter weeks that overlap with the selected date range
    const filteredWeeks = weeks.filter(week => {
      const weekStart = new Date(week.weekStart);
      const weekEnd = new Date(week.weekEnd);
      
      // Check if week overlaps with the selected range
      return weekStart < toDate && weekEnd > fromDate;
    });

    if (filteredWeeks.length === 0) {
      return {
        windowStart: fromDate.toISOString(),
        windowEnd: toDate.toISOString(),
        totalPatientsVisited: 0,
        malePatients: 0,
        femalePatients: 0,
        newPatientsVisited: 0,
        oldPatientsVisited: 0,
        totalCaseSheets: 0,
        caseSheetCounts: {},
        departmentBreakdown: []
      };
    }

    // Aggregate data from filtered weeks
    let aggregatedCounts = {};
    let malePatients = 0;
    let femalePatients = 0;
    let newPatientsVisited = 0;
    let oldPatientsVisited = 0;
    const chiefDepartment = normalizeDepartment(localStorage.getItem("doctorDepartment") || user?.department || "");
    const allowedDepartmentKeys = allowedCaseDepartmentsByChiefDepartment[chiefDepartment] || [];
    const hasDepartmentScope = allowedDepartmentKeys.length > 0;

    filteredWeeks.forEach(week => {
      Object.entries(week.caseSheetCounts || {}).forEach(([key, value]) => {
        if (hasDepartmentScope && !allowedDepartmentKeys.includes(key)) {
          return;
        }
        aggregatedCounts[key] = (aggregatedCounts[key] || 0) + (value || 0);
      });
      malePatients += week.malePatients || 0;
      femalePatients += week.femalePatients || 0;
      newPatientsVisited += week.newPatientsVisited || 0;
      oldPatientsVisited += week.oldPatientsVisited || 0;
    });

    // Total patients visited = sum of male + female (or new + old)
    const totalPatientsVisited = malePatients + femalePatients;
    const totalCaseSheets = Object.values(aggregatedCounts).reduce((sum, val) => sum + (val || 0), 0);

    // Build department breakdown
    const departmentBreakdown = buildDepartmentBreakdown(aggregatedCounts, filteredWeeks);

    return {
      windowStart: fromDate.toISOString(),
      windowEnd: toDate.toISOString(),
      totalPatientsVisited,
      malePatients,
      femalePatients,
      newPatientsVisited,
      oldPatientsVisited,
      totalCaseSheets,
      caseSheetCounts: aggregatedCounts,
      departmentBreakdown
    };
  };

  const buildDepartmentBreakdown = (caseSheetCounts, weeks) => {
    const departmentNames = {
      pedodontics: 'Pedodontics',
      completeDenture: 'Complete Denture',
      fpd: 'Fixed Partial Denture',
      implant: 'Implant',
      implantPatient: 'Implant Patient',
      partial: 'Partial Denture'
    };

    return Object.entries(caseSheetCounts).map(([key, totalCaseSheets]) => {
      // Aggregate patient counts for this department from all weeks
      let malePatients = 0;
      let femalePatients = 0;
      let newPatients = 0;
      let oldPatients = 0;

      // Use proportional distribution since weekly API doesn't break down by department
      weeks.forEach(week => {
        const deptCount = week.caseSheetCounts?.[key] || 0;
        const weekTotal = Object.values(week.caseSheetCounts || {}).reduce((sum, val) => sum + (val || 0), 0);
        
        if (weekTotal > 0) {
          const ratio = deptCount / weekTotal;
          malePatients += Math.round((week.malePatients || 0) * ratio);
          femalePatients += Math.round((week.femalePatients || 0) * ratio);
          newPatients += Math.round((week.newPatientsVisited || 0) * ratio);
          oldPatients += Math.round((week.oldPatientsVisited || 0) * ratio);
        }
      });

      // Total patients visited for this department = male + female
      const totalPatientsVisited = malePatients + femalePatients;

      return {
        key,
        department: departmentNames[key] || key,
        totalPatientsVisited,
        malePatients,
        femalePatients,
        newPatients,
        oldPatients,
        totalCaseSheets: totalCaseSheets || 0
      };
    }).filter(dept => dept.totalCaseSheets > 0);
  };

  useEffect(() => {
    loadReport();
  }, [fromDate, toDate]);

  const totals = useMemo(() => {
    if (!reportData?.departmentBreakdown) {
      return {
        totalPatientsVisited: 0,
        malePatients: 0,
        femalePatients: 0,
        newPatients: 0,
        oldPatients: 0,
        totalCaseSheets: 0
      };
    }

    return reportData.departmentBreakdown.reduce(
      (acc, dept) => {
        acc.totalPatientsVisited += dept.totalPatientsVisited || 0;
        acc.malePatients += dept.malePatients || 0;
        acc.femalePatients += dept.femalePatients || 0;
        acc.newPatients += dept.newPatients || 0;
        acc.oldPatients += dept.oldPatients || 0;
        acc.totalCaseSheets += dept.totalCaseSheets || 0;
        return acc;
      },
      {
        totalPatientsVisited: 0,
        malePatients: 0,
        femalePatients: 0,
        newPatients: 0,
        oldPatients: 0,
        totalCaseSheets: 0
      }
    );
  }, [reportData]);

  // Prepare data for gender pie chart
  const genderChartData = useMemo(() => {
    if (!reportData) return [];
    const male = reportData.malePatients || 0;
    const female = reportData.femalePatients || 0;
    return [
      { name: "Male", value: male, color: "#3b82f6" },
      { name: "Female", value: female, color: "#ec4899" }
    ].filter(item => item.value > 0);
  }, [reportData]);

  // Prepare data for new vs old patients pie chart
  const patientTypeChartData = useMemo(() => {
    if (!reportData) return [];
    const newPatients = reportData.newPatientsVisited || 0;
    const oldPatients = reportData.oldPatientsVisited || 0;
    return [
      { name: "New Patients", value: newPatients, color: "#10b981" },
      { name: "Old Patients", value: oldPatients, color: "#8b5cf6" }
    ].filter(item => item.value > 0);
  }, [reportData]);

  // Prepare data for department case sheets pie chart
  const departmentChartData = useMemo(() => {
    if (!reportData?.departmentBreakdown) return [];
    const colors = ["#f59e0b", "#06b6d4", "#14b8a6", "#f43f5e", "#6366f1", "#a855f7", "#84cc16"];
    return reportData.departmentBreakdown.map((dept, index) => ({
      name: dept.department,
      value: dept.totalCaseSheets || 0,
      color: colors[index % colors.length]
    })).filter(item => item.value > 0);
  }, [reportData]);

  const handleDownloadCsv = () => {
    if (!reportData?.departmentBreakdown?.length) return;

    const rows = [
      ["Report Type", "Date Range"],
      ["From Date", formatDisplayDate(reportData.windowStart)],
      ["To Date", formatDisplayDate(reportData.windowEnd)],
      [],
      ["Summary", "Value"],
      ["Total Patients Visited", reportData.totalPatientsVisited || 0],
      ["Male Patients", reportData.malePatients || 0],
      ["Female Patients", reportData.femalePatients || 0],
      ["New Patients", reportData.newPatientsVisited || 0],
      ["Old Patients", reportData.oldPatientsVisited || 0],
      ["Total Case Sheets", reportData.totalCaseSheets || 0],
      [],
      ["Department", "Total Patients Visited", "Male", "Female", "New", "Old", "Total Case Sheets"]
    ];

    reportData.departmentBreakdown.forEach((dept) => {
      rows.push([
        dept.department,
        dept.totalPatientsVisited || 0,
        dept.malePatients || 0,
        dept.femalePatients || 0,
        dept.newPatients || 0,
        dept.oldPatients || 0,
        dept.totalCaseSheets || 0
      ]);
    });

    rows.push([
      "Grand Total",
      totals.totalPatientsVisited,
      totals.malePatients,
      totals.femalePatients,
      totals.newPatients,
      totals.oldPatients,
      totals.totalCaseSheets
    ]);

    downloadCsv({
      filename: getReportFilename(`chief_doctor_report`, fromDate),
      rows
    });
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '10px', 
          border: '1px solid #ccc', 
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{payload[0].name}</p>
          <p style={{ margin: '4px 0 0 0', color: payload[0].payload.color }}>
            Count: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chief-reports-page">
      <header className="chief-reports-header">
        <h1>Chief Doctor Reports</h1>
        <div className="chief-reports-header-actions">
          <button type="button" className="chief-reports-btn secondary" onClick={() => navigate("/chief-doctor-dashboard")}>
            Back to Dashboard
          </button>
          <button type="button" className="chief-reports-btn" onClick={loadReport} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            className="chief-reports-btn"
            onClick={handleDownloadCsv}
            disabled={loading || !reportData?.departmentBreakdown?.length}
          >
            Download Excel CSV
          </button>
        </div>
      </header>

      <section className="chief-reports-filters">
        <label>
          <span className="filter-label">From Date</span>
          <input 
            type="date" 
            value={fromDate} 
            onChange={(e) => setFromDate(e.target.value)} 
            className="filter-date"
          />
        </label>

        <label>
          <span className="filter-label">To Date</span>
          <input 
            type="date" 
            value={toDate} 
            onChange={(e) => setToDate(e.target.value)} 
            className="filter-date"
          />
        </label>

        <div className="chief-reports-window">
          <span className="filter-label">Report Window</span>
          <strong>
            {formatDisplayDate(reportData?.windowStart)} to {formatDisplayDate(reportData?.windowEnd)}
          </strong>
        </div>
      </section>

      {error && <div className="chief-reports-error">{error}</div>}

      {/* Show helpful message when no data found */}
      {!error && !loading && reportData && (reportData.totalPatientsVisited === 0 || reportData.totalCaseSheets === 0) && (
        <div className="chief-reports-info-banner">
          <div className="info-banner-icon">ℹ️</div>
          <div className="info-banner-content">
            <strong>No data found for the selected period.</strong>
            <p>Try selecting a different date range. Check when your case sheets were created and select dates within that range.</p>
          </div>
        </div>
      )}

      {!error && (
        <>
          <section className="chief-reports-summary-grid">
            <article className="chief-reports-card">
              <h3>Total Patients Visited</h3>
              <p className="big-number">{reportData?.totalPatientsVisited || 0}</p>
            </article>
            <article className="chief-reports-card">
              <h3>Male Patients</h3>
              <p className="big-number male-color">{reportData?.malePatients || 0}</p>
            </article>
            <article className="chief-reports-card">
              <h3>Female Patients</h3>
              <p className="big-number female-color">{reportData?.femalePatients || 0}</p>
            </article>
            <article className="chief-reports-card">
              <h3>New Patients</h3>
              <p className="big-number new-color">{reportData?.newPatientsVisited || 0}</p>
            </article>
            <article className="chief-reports-card">
              <h3>Old Patients</h3>
              <p className="big-number old-color">{reportData?.oldPatientsVisited || 0}</p>
            </article>
            <article className="chief-reports-card">
              <h3>Total Case Sheets</h3>
              <p className="big-number">{reportData?.totalCaseSheets || 0}</p>
            </article>
          </section>

          {/* Pie Charts Section */}
          <section className="chief-reports-charts-section">
            <h2 className="charts-section-title">Visual Analytics</h2>
            
            <div className="chief-reports-charts-grid">
              {/* Gender Distribution Chart */}
              <div className="chart-container">
                <h3 className="chart-title">Gender Distribution</h3>
                {genderChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={genderChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {genderChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="no-data-message">No gender data available</div>
                )}
              </div>

              {/* New vs Old Patients Chart */}
              <div className="chart-container">
                <h3 className="chart-title">New vs Old Patients</h3>
                {patientTypeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={patientTypeChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {patientTypeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="no-data-message">No patient type data available</div>
                )}
              </div>

              {/* Department Case Sheets Chart */}
              <div className="chart-container full-width">
                <h3 className="chart-title">Department-wise Case Sheets</h3>
                {departmentChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={departmentChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {departmentChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="no-data-message">No department data available</div>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      <section className="chief-reports-table-wrap">
        <h2>Department-wise Detailed Report</h2>
        {loading ? (
          <p className="chief-reports-muted">Loading report...</p>
        ) : !reportData?.departmentBreakdown?.length ? (
          <p className="chief-reports-muted">No data found for the selected period.</p>
        ) : (
          <table className="chief-reports-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Department</th>
                <th>Total Patients Visited</th>
                <th>Male</th>
                <th>Female</th>
                <th>New</th>
                <th>Old</th>
                <th>Total Case Sheets</th>
              </tr>
            </thead>
            <tbody>
              {reportData.departmentBreakdown.map((dept, index) => (
                <tr key={dept.key}>
                  <td>{index + 1}</td>
                  <td>{dept.department}</td>
                  <td>{dept.totalPatientsVisited || 0}</td>
                  <td>{dept.malePatients || 0}</td>
                  <td>{dept.femalePatients || 0}</td>
                  <td>{dept.newPatients || 0}</td>
                  <td>{dept.oldPatients || 0}</td>
                  <td>{dept.totalCaseSheets || 0}</td>
                </tr>
              ))}
              <tr className="chief-reports-total-row">
                <td>—</td>
                <td>Grand Total</td>
                <td>{totals.totalPatientsVisited}</td>
                <td>{totals.malePatients}</td>
                <td>{totals.femalePatients}</td>
                <td>{totals.newPatients}</td>
                <td>{totals.oldPatients}</td>
                <td>{totals.totalCaseSheets}</td>
              </tr>
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default ChiefDoctorReportsPage;
