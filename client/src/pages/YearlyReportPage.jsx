import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WeeklyReport from '../components/WeeklyReport';
import { useAuth } from './context/AuthContext';
import { buildSummaryRows, buildWeeklyRows, downloadCsv, getReportFilename } from '../utils/reportExport';
import './AdminDashboard.css';

const YearlyReportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadYearly = async () => {
      const token = user?.token || localStorage.getItem('token');
      if (!token) {
        setError('Admin token not found. Please log in again.');
        setWeeks([]);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('http://localhost:5000/api/reports/weekly?weeks=52', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || `Failed to fetch yearly report (${res.status})`);
        }
        const data = await res.json();
        if (data.success === false) {
          throw new Error(data.message || 'Failed to fetch yearly report');
        }
        setWeeks(Array.isArray(data.weeks) ? data.weeks : []);
      } catch (err) {
        setError(err.message || 'Unable to load yearly report');
        setWeeks([]);
      } finally {
        setLoading(false);
      }
    };
    loadYearly();
  }, [user]);

  // Aggregate all 52 weeks into a yearly summary
  const yearlySummary = useMemo(() => {
    if (!weeks.length) return null;
    const aggregatedCounts = {};
    let uniqueSeenCount = 0;
    let newPatients = 0;
    let malePatients = 0;
    let femalePatients = 0;
    let otherPatients = 0;
    let newPatientsVisited = 0;
    let oldPatientsVisited = 0;
    weeks.forEach((week) => {
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
    return {
      caseSheetCounts: aggregatedCounts,
      uniqueSeenCount,
      newPatients,
      malePatients,
      femalePatients,
      otherPatients,
      newPatientsVisited,
      oldPatientsVisited,
      windowStart: weeks[weeks.length - 1]?.weekStart,
      windowEnd: weeks[0]?.weekEnd
    };
  }, [weeks]);

  const handleDownloadCsv = () => {
    if (!yearlySummary) return;

    const summaryRows = buildSummaryRows({
      data: yearlySummary,
      title: 'Yearly Report',
      periodLabel: 'Yearly overview'
    });

    const weeklyRows = buildWeeklyRows(weeks);
    const rows = [...summaryRows, [], ...weeklyRows];

    downloadCsv({
      filename: getReportFilename('yearly_report'),
      rows
    });
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Yearly Report</h1>
        <div className="admin-info" style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={() => navigate('/admin-dashboard')}>
            Back to Dashboard
          </button>
          <button className="btn-primary" onClick={handleDownloadCsv} disabled={loading || !yearlySummary}>
            Download CSV
          </button>
        </div>
      </header>
      <div className="admin-content">
        <div className="main-content" style={{ flex: 1 }}>
          <div className="tab-content">
            {error && <p className="error-text">{error}</p>}
            {!error && loading && <p className="muted-text">Loading yearly report...</p>}
            {!loading && !error && yearlySummary && (
              <WeeklyReport
                data={yearlySummary}
                title={"Yearly Report"}
                pillText={"Yearly overview"}
                showChart
              />
            )}
            {!loading && !error && !yearlySummary && (
              <p className="muted-text">No yearly data available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default YearlyReportPage;
