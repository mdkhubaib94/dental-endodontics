// Add to the top of the file if not present
// npm install react-chartjs-2 chart.js

import React from 'react';
import './WeeklyReport.css';
import { Pie } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';
Chart.register(ArcElement, Tooltip, Legend);

const palette = ['#6C5CE7', '#00B894', '#0984E3', '#E17055', '#FDCB6E'];

const departmentNames = {
  pedodontics: 'Pedodontics',
  completeDenture: 'Complete Denture',
  fpd: 'Fixed Partial Denture',
  implant: 'Implant',
  implantPatient: 'Implant Patient',
  partial: 'Partial Denture'
};

const DonutChart = ({ counts, detailsClass = "donut-details" }) => {
  const entries = Object.entries(counts || {});
  const labels = entries.map(([label]) => departmentNames[label] || label);
  const dataValues = entries.map(([, value]) => value || 0);
  const colors = entries.map((_, idx) => palette[idx % palette.length]);

  const data = {
    labels,
    datasets: [
      {
        data: dataValues,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const options = {
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.label}: ${context.parsed}`;
          },
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className="donut-wrap">
      <div style={{ width: 220, height: 220 }}>
        <Pie data={data} options={options} />
      </div>
      <div className={detailsClass}>
        {entries.map(([label, value], idx) => (
          <div className="donut-detail-line no-box" key={label}>
            <span className="legend-dot" style={{ backgroundColor: palette[idx % palette.length] }} />
            <span className="donut-detail-label">{departmentNames[label] || label}:</span>
            <span className="donut-detail-value">{value || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const WeeklyReport = ({ data, title = 'Weekly Report', pillText = 'Last 7 days', departmentFilter = null, showChart = false }) => {
  if (!data) return null;

  // If department filter is active, show only that department's data
  const caseSheetCount = departmentFilter ? (data.caseSheetCounts?.[departmentFilter] || 0) : 
    Object.values(data.caseSheetCounts || {}).reduce((sum, v) => sum + v, 0);

  // Calculate otherPatients safely
  const otherPatients = data.otherPatients !== undefined 
    ? data.otherPatients 
    : Math.max(0, (data.uniqueSeenCount || 0) - (data.malePatients || 0) - (data.femalePatients || 0));

  // Make sure we have a valid otherPatients count for the gender chart
  const genderChartData = {
    Male: data.malePatients || 0,
    Female: data.femalePatients || 0,
    Other: otherPatients
  };

  return (
    <div className="weekly-report-card">
      <div className="weekly-report-head">
        <h3>{title}</h3>
        <span className="pill">{pillText}</span>
      </div>

      <div className="weekly-tiles">
        <div className="tile tile-purple">
          <div className="tile-label">Case Sheets</div>
          <div className="tile-value">{caseSheetCount}</div>
        </div>
        <div className="tile tile-green">
          <div className="tile-label">Total Patients</div>
          <div className="tile-value">{data.uniqueSeenCount || 0}</div>
        </div>
        <div className="tile tile-blue">
          <div className="tile-label">Male Patients</div>
          <div className="tile-value">{data.malePatients || 0}</div>
        </div>
        <div className="tile tile-pink">
          <div className="tile-label">Female Patients</div>
          <div className="tile-value">{data.femalePatients || 0}</div>
        </div>
        <div className="tile tile-gray">
          <div className="tile-label">Other Patients</div>
          <div className="tile-value">{otherPatients}</div>
        </div>
        <div className="tile tile-orange">
          <div className="tile-label">New Patients</div>
          <div className="tile-value">{data.newPatientsVisited || 0}</div>
        </div>
        <div className="tile tile-teal">
          <div className="tile-label">Old Patients</div>
          <div className="tile-value">{data.oldPatientsVisited || 0}</div>
        </div>
      </div>

      {(showChart || (!departmentFilter && !showChart)) && (
        <div className="chart-area" style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div>
            <div className="chart-head">
              <h4>Case Sheets Comparison</h4>
              
            </div>
            <DonutChart counts={data.caseSheetCounts} detailsClass="donut-details" />
          </div>
          <div>
            <div className="chart-head">
              <h4>Patients Gender</h4>
             
            </div>
            <DonutChart counts={genderChartData} detailsClass="donut-details" />
          </div>
          <div>
            <div className="chart-head">
              <h4>New vs Old Patients</h4>
              
            </div>
            <DonutChart counts={{ 
              New: data.newPatientsVisited || 0, 
              Old: data.oldPatientsVisited || 0 
            }} detailsClass="donut-details" />
          </div>
        </div>
      )}

      {/* ...removed individual case sheet comparison chart as per request... */}
    </div>
  );
};

export default WeeklyReport;
