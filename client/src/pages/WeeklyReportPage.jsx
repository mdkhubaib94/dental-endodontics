import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WeeklyReport from '../components/WeeklyReport';
import { useAuth } from './context/AuthContext';
import { buildSummaryRows, buildWeeklyRows, downloadCsv, getReportFilename } from '../utils/reportExport';
import './AdminDashboard.css';

const mainDepartments = [
  { key: 'pedodontics', name: 'Pedodontics', color: '#6C5CE7' },
  { key: 'prosthodontics', name: 'Prosthodontics', color: '#00B894', },
];

const prosthoSubDepartments = [
  { key: 'completeDenture', name: 'Complete Denture', color: '#00B894' },
  { key: 'fpd', name: 'Fixed Partial Denture (FPD)', color: '#0984E3' },
  { key: 'implant', name: 'Implant', color: '#E17055' },
  { key: 'implantPatient', name: 'Implant Patient', color: '#ff7675' },
  { key: 'partial', name: 'Partial Denture', color: '#FDCB6E' }
];

const WeeklyReportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMainDept, setSelectedMainDept] = useState(null);
  const [selectedSubDept, setSelectedSubDept] = useState(null);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);

  const loadReport = async () => {
    const token = user?.token || localStorage.getItem('token');

    if (!token) {
      setError('Admin token not found. Please log in again.');
      setReports([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch('http://localhost:5000/api/reports/weekly?weeks=4', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Failed to fetch weekly report (${res.status})`);
      }

      const data = await res.json();
      if (data.success === false) {
        throw new Error(data.message || 'Failed to fetch weekly report');
      }

      if (Array.isArray(data.weeks)) {
        setReports(data.weeks);
      } else {
        setReports(data ? [data] : []);
      }
    } catch (err) {
      setError(err.message || 'Unable to load weekly report');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  useEffect(() => {
    // Reset week selection when changing departments
    setSelectedWeekIndex(0);
  }, [selectedMainDept, selectedSubDept]);

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
    if (!reports.length) return;

    if (!selectedMainDept) {
      const rows = buildWeeklyRows(reports);
      downloadCsv({
        filename: getReportFilename('weekly_report_all_weeks'),
        rows
      });
      return;
    }

    const week = reports[selectedWeekIndex] || reports[0];
    if (!week) return;

    const start = week.weekStart ? new Date(week.weekStart) : null;
    const end = week.weekEnd ? new Date(week.weekEnd) : null;
    const periodLabel = start && end
      ? `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : 'Weekly window';

    let reportData = { ...week };
    const deptKey = selectedSubDept?.key || selectedMainDept?.key;

    if (selectedMainDept?.key === 'prosthodontics' && !selectedSubDept) {
      reportData = {
        ...week,
        caseSheetCounts: {
          completeDenture: week.caseSheetCounts?.completeDenture || 0,
          fpd: week.caseSheetCounts?.fpd || 0,
          implant: week.caseSheetCounts?.implant || 0,
          implantPatient: week.caseSheetCounts?.implantPatient || 0,
          partial: week.caseSheetCounts?.partial || 0
        }
      };
    } else if (deptKey) {
      reportData = {
        ...week,
        caseSheetCounts: {
          [deptKey]: week.caseSheetCounts?.[deptKey] || 0
        },
        malePatients: week[deptKey + 'MalePatients'] ?? week.malePatients,
        femalePatients: week[deptKey + 'FemalePatients'] ?? week.femalePatients,
        otherPatients: week[deptKey + 'OtherPatients'] ?? week.otherPatients,
        newPatientsVisited: week[deptKey + 'NewPatientsVisited'] ?? week.newPatientsVisited,
        oldPatientsVisited: week[deptKey + 'OldPatientsVisited'] ?? week.oldPatientsVisited,
        uniqueSeenCount: week[deptKey + 'UniqueSeenCount'] ?? week.uniqueSeenCount
      };
    }

    const rows = buildSummaryRows({
      data: reportData,
      title: getPageTitle(),
      periodLabel
    });

    downloadCsv({
      filename: getReportFilename('weekly_report', periodLabel),
      rows
    });
  };

  const getDepartmentStats = (deptKey) => {
    return reports.reduce((sum, week) => {
      return sum + (week.caseSheetCounts?.[deptKey] || 0);
    }, 0);
  };

  const getProsthoTotalStats = () => {
    return prosthoSubDepartments.reduce((sum, subDept) => {
      return sum + getDepartmentStats(subDept.key);
    }, 0);
  };

  const getPageTitle = () => {
    if (selectedSubDept) return selectedSubDept.name;
    if (selectedMainDept?.key === 'prosthodontics') return 'Prosthodontics - Case Sheets';
    if (selectedMainDept) return selectedMainDept.name;
    return 'Weekly Report';
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>{getPageTitle()}</h1>
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
          <button className="btn-primary" onClick={loadReport} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button className="btn-primary" onClick={handleDownloadCsv} disabled={loading || !reports.length}>
            Download CSV
          </button>
        </div>
      </header>

      <div className="admin-content">
        <div className="main-content" style={{ flex: 1 }}>
          <div className="tab-content">
            {error && <p className="error-text">{error}</p>}
            {!error && loading && <p className="muted-text">Loading weekly report...</p>}
            
            {!selectedMainDept ? (
              /* Main Department Selection */
              <div>
                <p className="muted-text" style={{ marginBottom: '20px' }}>
                  Select a department to view weekly reports
                </p>
                <div className="department-grid">
                  {mainDepartments.map((dept) => {
                    const totalCases = dept.key === 'prosthodontics' 
                      ? getProsthoTotalStats() 
                      : getDepartmentStats(dept.key);
                    return (
                      <div
                        key={dept.key}
                        className="department-card"
                        onClick={() => handleMainDeptClick(dept)}
                        style={{ borderLeftColor: dept.color }}
                      >
                        <div className="dept-card-header">
                          <span className="dept-icon">{dept.icon}</span>
                          <h3>{dept.name}</h3>
                        </div>
                        <div className="dept-card-stats">
                          <div className="dept-stat">
                            <span className="stat-label">Total Case Sheets (4 weeks)</span>
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
              </div>
            ) : selectedMainDept.key === 'prosthodontics' && !selectedSubDept ? (
              /* Prosthodontics Subdepartments View with Comparison */
              <div>
                <p className="muted-text" style={{ marginBottom: '20px' }}>
                  Prosthodontics case sheets - Click to view detailed weekly reports
                </p>
                <div className="department-grid">
                  {prosthoSubDepartments.map((subDept) => {
                    const totalCases = getDepartmentStats(subDept.key);
                    return (
                      <div
                        key={subDept.key}
                        className="department-card"
                        onClick={() => handleSubDeptClick(subDept)}
                        style={{ borderLeftColor: subDept.color }}
                      >
                        <div className="dept-card-header">
                          <span className="dept-icon">🦷</span>
                          <h3>{subDept.name}</h3>
                        </div>
                        <div className="dept-card-stats">
                          <div className="dept-stat">
                            <span className="stat-label">Total Case Sheets (4 weeks)</span>
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

                {/* Week Selector Dropdown */}
                {reports && reports.length > 0 && (
                  <div style={{ marginTop: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                      <label htmlFor="week-select" style={{ fontWeight: '500', color: '#e0e2e7' }}>
                        Select Week:
                      </label>
                      <select
                        id="week-select"
                        value={selectedWeekIndex}
                        onChange={(e) => setSelectedWeekIndex(Number(e.target.value))}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '14px',
                          cursor: 'pointer',
                          backgroundColor: 'white'
                        }}
                      >
                        {reports.map((week, idx) => {
                          const start = week.weekStart ? new Date(week.weekStart) : null;
                          const end = week.weekEnd ? new Date(week.weekEnd) : null;
                          const label = start && end
                            ? `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                            : `Week ${idx + 1}`;
                          return (
                            <option key={idx} value={idx}>
                              {idx === 0 ? `${label} (Latest)` : label}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    
                    {/* Display selected week report */}
                    {(() => {
                      const week = reports[selectedWeekIndex];
                      const start = week.weekStart ? new Date(week.weekStart) : null;
                      const end = week.weekEnd ? new Date(week.weekEnd) : null;
                      const title = start && end
                        ? `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : 'Weekly window';
                      const pill = selectedWeekIndex === 0 ? 'Latest week' : `Week ${selectedWeekIndex + 1}`;
                      
                      // Filter to only show prostho subdepartments (including Implant Patient)
                      const prosthoData = {
                        ...week,
                        caseSheetCounts: {
                          completeDenture: week.caseSheetCounts?.completeDenture || 0,
                          fpd: week.caseSheetCounts?.fpd || 0,
                          implant: week.caseSheetCounts?.implant || 0,
                          implantPatient: week.caseSheetCounts?.implantPatient || 0,
                          partial: week.caseSheetCounts?.partial || 0
                        }
                      };
                      
                      return (
                        <WeeklyReport
                          key={week.weekStart || selectedWeekIndex}
                          data={prosthoData}
                          title={title}
                          pillText={pill}
                          showChart={true}
                        />
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              /* Individual Department/Subdepartment Weekly Reports */
              <div>
                <p className="muted-text" style={{ marginBottom: '20px' }}>
                  Weekly reports for {selectedSubDept?.name || selectedMainDept?.name} - Last 4 weeks
                </p>
                
                {/* Week Selector Dropdown */}
                {reports && reports.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                      <label htmlFor="week-select-dept" style={{ fontWeight: '500', color: '#0f172a' }}>
                        Select Week:
                      </label>
                      <select
                        id="week-select-dept"
                        value={selectedWeekIndex}
                        onChange={(e) => setSelectedWeekIndex(Number(e.target.value))}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '14px',
                          cursor: 'pointer',
                          backgroundColor: 'white'
                        }}
                      >
                        {reports.map((week, idx) => {
                          const start = week.weekStart ? new Date(week.weekStart) : null;
                          const end = week.weekEnd ? new Date(week.weekEnd) : null;
                          const label = start && end
                            ? `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                            : `Week ${idx + 1}`;
                          return (
                            <option key={idx} value={idx}>
                              {idx === 0 ? `${label} (Latest)` : label}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    
                    {/* Display selected week report */}
                    {(() => {
                      const week = reports[selectedWeekIndex];
                      const start = week.weekStart ? new Date(week.weekStart) : null;
                      const end = week.weekEnd ? new Date(week.weekEnd) : null;
                      const title = start && end
                        ? `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : 'Weekly window';
                      const pill = selectedWeekIndex === 0 ? 'Latest week' : `Week ${selectedWeekIndex + 1}`;
                      const deptKey = selectedSubDept?.key || selectedMainDept?.key;

                      // Prepare filtered data for selected prostho subdepartment
                      let filteredData = { ...week };
                      if (selectedSubDept) {
                        filteredData = {
                          ...week,
                          caseSheetCounts: {
                            [deptKey]: week.caseSheetCounts?.[deptKey] || 0
                          },
                          // Filter gender and patient type counts for this case sheet if available
                          malePatients: week[deptKey + 'MalePatients'] ?? week.malePatients,
                          femalePatients: week[deptKey + 'FemalePatients'] ?? week.femalePatients,
                          otherPatients: week[deptKey + 'OtherPatients'] ?? week.otherPatients,
                          newPatientsVisited: week[deptKey + 'NewPatientsVisited'] ?? week.newPatientsVisited,
                          oldPatientsVisited: week[deptKey + 'OldPatientsVisited'] ?? week.oldPatientsVisited,
                          uniqueSeenCount: week[deptKey + 'UniqueSeenCount'] ?? week.uniqueSeenCount
                        };
                      }

                      return (
                        <WeeklyReport
                          key={week.weekStart || selectedWeekIndex}
                          data={filteredData}
                          title={title}
                          pillText={pill}
                          departmentFilter={deptKey}
                        />
                      );
                    })()}
                  </div>
                )}
                
                {!loading && reports.length === 0 && (
                  <p className="muted-text">No data available for this department.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyReportPage;
