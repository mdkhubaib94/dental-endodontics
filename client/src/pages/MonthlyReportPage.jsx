import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WeeklyReport from '../components/WeeklyReport';
import { useAuth } from './context/AuthContext';
import { buildSummaryRows, buildWeeklyRows, downloadCsv, getReportFilename } from '../utils/reportExport';
import './AdminDashboard.css';

const mainDepartments = [
  { key: 'pedodontics', name: 'Pedodontics' },
  { key: 'prosthodontics', name: 'Prosthodontics' }
];

const prosthoSubDepartments = [
  { key: 'completeDenture', name: 'Complete Denture' },
  { key: 'fpd', name: 'Fixed Partial Denture (FPD)' },
  { key: 'implant', name: 'Implant' },
  { key: 'implantPatient', name: 'Implant Patient' },
  { key: 'partial', name: 'Partial Denture' }
];

const MonthlyReportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMainDept, setSelectedMainDept] = useState(null);
  const [selectedSubDept, setSelectedSubDept] = useState(null);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);

  const loadMonthly = async () => {
    const token = user?.token || localStorage.getItem('token');

    if (!token) {
      setError('Admin token not found. Please log in again.');
      setWeeks([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // Fetch 52 weeks to cover 12 months
      const res = await fetch('http://localhost:5000/api/reports/weekly?weeks=52', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Failed to fetch monthly report (${res.status})`);
      }

      const data = await res.json();
      if (data.success === false) {
        throw new Error(data.message || 'Failed to fetch monthly report');
      }

      if (Array.isArray(data.weeks)) {
        setWeeks(data.weeks);
      } else if (Array.isArray(data)) {
        setWeeks(data);
      } else {
        setWeeks(data ? [data] : []);
      }
    } catch (err) {
      setError(err.message || 'Unable to load monthly report');
      setWeeks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonthly();
  }, []);

  useEffect(() => {
    // Reset month selection when changing departments
    setSelectedMonthIndex(0);
  }, [selectedMainDept, selectedSubDept]);

  // Group weeks into months (approximate: 4.33 weeks per month)
  const monthlyData = useMemo(() => {
    if (!weeks.length) return [];
    const months = [];
    const weeksPerMonth = 52 / 12; // ≈4.33
    for (let i = 0; i < 12; i++) {
      const startIdx = Math.round(i * weeksPerMonth);
      const endIdx = Math.round((i + 1) * weeksPerMonth);
      const monthWeeks = weeks.slice(startIdx, endIdx);
      if (monthWeeks.length) months.push(monthWeeks);
    }
    return months;
  }, [weeks]);

  // Calculate summary for a specific month
  const getMonthSummary = (monthWeeks) => {
    if (!monthWeeks || !monthWeeks.length) return null;

    const aggregatedCounts = {};
    let uniqueSeenCount = 0;
    let newPatients = 0;
    let malePatients = 0;
    let femalePatients = 0;
    let otherPatients = 0;
    let newPatientsVisited = 0;
    let oldPatientsVisited = 0;

    monthWeeks.forEach((week) => {
      Object.entries(week.caseSheetCounts || {}).forEach(([key, value]) => {
        aggregatedCounts[key] = (aggregatedCounts[key] || 0) + (value || 0);
      });
      uniqueSeenCount += week.uniqueSeenCount || 0;
      newPatients += week.newPatients || 0;
      const weekMale = week.malePatients || 0;
      const weekFemale = week.femalePatients || 0;
      const weekOther = week.otherPatients ?? Math.max(0, (week.uniqueSeenCount || 0) - weekMale - weekFemale);
      malePatients += weekMale;
      femalePatients += weekFemale;
      otherPatients += weekOther;
      newPatientsVisited += week.newPatientsVisited || 0;
      oldPatientsVisited += week.oldPatientsVisited || 0;
    });

    const windowStart = monthWeeks[monthWeeks.length - 1]?.weekStart || monthWeeks[0]?.weekStart;
    const windowEnd = monthWeeks[0]?.weekEnd || monthWeeks[monthWeeks.length - 1]?.weekEnd;

    return {
      caseSheetCounts: aggregatedCounts,
      uniqueSeenCount,
      newPatients,
      malePatients,
      femalePatients,
      otherPatients,
      newPatientsVisited,
      oldPatientsVisited,
      windowStart,
      windowEnd
    };
  };

  const monthlySummary = useMemo(() => {
    if (!monthlyData.length || selectedMonthIndex >= monthlyData.length) return null;
    return getMonthSummary(monthlyData[selectedMonthIndex]);
  }, [monthlyData, selectedMonthIndex]);

  const formatRange = () => {
    if (!monthlySummary?.windowStart || !monthlySummary?.windowEnd) return 'Monthly Report';
    const start = new Date(monthlySummary.windowStart);
    const end = new Date(monthlySummary.windowEnd);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const getMonthLabel = (index) => {
    const monthWeeks = monthlyData[index];
    if (!monthWeeks || !monthWeeks.length) return `Month ${index + 1}`;
    
    const start = new Date(monthWeeks[monthWeeks.length - 1]?.weekStart || monthWeeks[0]?.weekStart);
    const end = new Date(monthWeeks[0]?.weekEnd || monthWeeks[monthWeeks.length - 1]?.weekEnd);
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const hasData = monthlySummary && Object.keys(monthlySummary.caseSheetCounts || {}).length > 0;

  const getMonthlyDeptCount = (deptKey) => {
    return monthlySummary?.caseSheetCounts?.[deptKey] || 0;
  };

  const getProsthoTotal = () => {
    return (
      (monthlySummary?.caseSheetCounts?.completeDenture || 0) +
      (monthlySummary?.caseSheetCounts?.fpd || 0) +
      (monthlySummary?.caseSheetCounts?.implant || 0) +
      (monthlySummary?.caseSheetCounts?.implantPatient || 0) +
      (monthlySummary?.caseSheetCounts?.partial || 0)
    );
  };

  const handleMainDeptClick = (dept) => {
    setSelectedMainDept(dept);
    setSelectedSubDept(null);
  };

  const handleSubDeptClick = (subDept) => {
    setSelectedSubDept(subDept);
  };

  const handleBackToMain = () => {
    setSelectedMainDept(null);
    setSelectedSubDept(null);
  };

  const handleBackToSubDepts = () => {
    setSelectedSubDept(null);
  };

  const handleDownloadCsv = () => {
    if (!monthlySummary) return;

    const periodLabel = formatRange();
    let reportData = { ...monthlySummary };

    if (selectedMainDept?.key === 'prosthodontics' && !selectedSubDept) {
      reportData = {
        ...monthlySummary,
        caseSheetCounts: {
          completeDenture: getMonthlyDeptCount('completeDenture'),
          fpd: getMonthlyDeptCount('fpd'),
          implant: getMonthlyDeptCount('implant'),
          implantPatient: getMonthlyDeptCount('implantPatient'),
          partial: getMonthlyDeptCount('partial')
        }
      };
    } else if (selectedMainDept?.key === 'pedodontics' || selectedSubDept) {
      const deptKey = selectedSubDept?.key || selectedMainDept?.key;
      reportData = {
        ...monthlySummary,
        caseSheetCounts: {
          [deptKey]: monthlySummary.caseSheetCounts?.[deptKey] || 0
        }
      };
    }

    const summaryRows = buildSummaryRows({
      data: reportData,
      title: selectedSubDept?.name || selectedMainDept?.name || 'Monthly Report',
      periodLabel
    });

    const monthWeeks = monthlyData[selectedMonthIndex] || [];
    const weeklyRows = buildWeeklyRows(monthWeeks);
    const rows = [...summaryRows, [], ...weeklyRows];

    downloadCsv({
      filename: getReportFilename('monthly_report', periodLabel),
      rows
    });
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>
          {selectedSubDept ? selectedSubDept.name :
           selectedMainDept ? selectedMainDept.name : 'Monthly Report'}
        </h1>
        <div className="admin-info" style={{ display: 'flex', gap: '0.5rem' }}>
          {selectedSubDept ? (
            <button className="btn-secondary" onClick={handleBackToSubDepts}>
              ← Back to Case Sheets
            </button>
          ) : selectedMainDept ? (
            <button className="btn-secondary" onClick={handleBackToMain}>
              ← Back to Departments
            </button>
          ) : (
            <button className="btn-secondary" onClick={() => navigate('/admin-dashboard')}>
              Back to Dashboard
            </button>
          )}
          <button className="btn-primary" onClick={loadMonthly} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button className="btn-primary" onClick={handleDownloadCsv} disabled={loading || !monthlySummary}>
            Download CSV
          </button>
        </div>
      </header>

      <div className="admin-content">
        <div className="main-content" style={{ flex: 1 }}>
          <div className="tab-content">
            {error && <p className="error-text">{error}</p>}
            {!error && loading && <p className="muted-text">Loading monthly report...</p>}

            {!loading && !error && monthlySummary && (
              <>
                {/* Month Selector Dropdown - Show on all views */}
                {monthlyData.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <label htmlFor="month-select" style={{ fontWeight: '500', color: '#0f172a' }}>
                        Select Month:
                      </label>
                      <select
                        id="month-select"
                        value={selectedMonthIndex}
                        onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '14px',
                          cursor: 'pointer',
                          backgroundColor: 'white'
                        }}
                      >
                        {monthlyData.map((_, idx) => (
                          <option key={idx} value={idx}>
                            {idx === 0 ? `${getMonthLabel(idx)} (Latest)` : getMonthLabel(idx)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Overall Monthly Overview */}
                {!selectedMainDept && (
                  <>
                    <WeeklyReport
                      data={monthlySummary}
                      title={formatRange()}
                      pillText="Monthly overview"
                      showChart
                    />

                    {/* Departments (Pedodontics + Prosthodontics aggregate) */}
                    <div style={{ marginTop: '24px' }}>
                      <h3 style={{ marginBottom: '12px', color: '#0f172a' }}>Departments</h3>
                      <div className="department-grid">
                        {mainDepartments.map((dept) => {
                          const count = dept.key === 'pedodontics'
                            ? getMonthlyDeptCount('pedodontics')
                            : getProsthoTotal();
                          return (
                            <div
                              key={dept.key}
                              className="department-card"
                              onClick={() => handleMainDeptClick(dept)}
                            >
                              <div className="dept-card-header">
                                <span className="dept-icon">🦷</span>
                                <h3>{dept.name}</h3>
                              </div>
                              <div className="dept-card-stats">
                                <div className="dept-stat">
                                  <span className="stat-label">Case Sheets (Selected Month)</span>
                                  <span className="stat-value">{count}</span>
                                </div>
                              </div>
                              <div className="dept-card-footer">
                                <span>View Reports →</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Prosthodontics: Subdepartments view + comparison */}
                {selectedMainDept?.key === 'prosthodontics' && !selectedSubDept && (
                  <div>
                    <p className="muted-text" style={{ marginBottom: '20px' }}>
                      Prosthodontics case sheets for selected month
                    </p>
                    <div className="department-grid">
                      {prosthoSubDepartments.map((subDept) => {
                        const totalCases = getMonthlyDeptCount(subDept.key);
                        return (
                          <div
                            key={subDept.key}
                            className="department-card"
                            onClick={() => handleSubDeptClick(subDept)}
                          >
                            <div className="dept-card-header">
                              <span className="dept-icon">🦷</span>
                              <h3>{subDept.name}</h3>
                            </div>
                            <div className="dept-card-stats">
                              <div className="dept-stat">
                                <span className="stat-label">Case Sheets (Selected Month)</span>
                                <span className="stat-value">{totalCases}</span>
                              </div>
                            </div>
                            <div className="dept-card-footer">
                              <span>View Reports →</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Comparison Chart for Prostho Case Sheets (Monthly) */}
                    <div style={{ marginTop: '30px' }}>
                      <h3 style={{ marginBottom: '15px', color: '#0f172a' }}>Case Sheets Breakdown</h3>
                      {hasData && (
                        <WeeklyReport
                          data={{
                            ...monthlySummary,
                            caseSheetCounts: {
                              completeDenture: getMonthlyDeptCount('completeDenture'),
                              fpd: getMonthlyDeptCount('fpd'),
                              implant: getMonthlyDeptCount('implant'),
                              partial: getMonthlyDeptCount('partial')
                            }
                          }}
                          title={formatRange()}
                          pillText={'Case Sheets'}
                          showChart={true}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Individual Department/Subdepartment Monthly Report */}
                {(selectedMainDept?.key === 'pedodontics' || selectedSubDept) && (
                  <div>
                    <p className="muted-text" style={{ marginBottom: '20px' }}>
                      Monthly report for {selectedSubDept?.name || selectedMainDept?.name}
                    </p>
                    <WeeklyReport
                      data={monthlySummary}
                      title={formatRange()}
                      pillText={'Monthly overview'}
                      departmentFilter={selectedSubDept?.key || selectedMainDept?.key}
                    />
                  </div>
                )}
              </>
            )}

            {!loading && !error && !monthlySummary && (
              <p className="muted-text">No monthly data available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyReportPage;
