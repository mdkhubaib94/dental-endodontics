const departmentNames = {
  pedodontics: 'Pedodontics',
  completeDenture: 'Complete Denture',
  fpd: 'Fixed Partial Denture',
  implant: 'Implant',
  implantPatient: 'Implant Patient',
  partial: 'Partial Denture'
};

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
};

const formatDate = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const getOtherPatients = (data) => {
  if (!data) return 0;
  if (data.otherPatients !== undefined && data.otherPatients !== null) return data.otherPatients;
  const uniqueSeen = data.uniqueSeenCount || 0;
  const male = data.malePatients || 0;
  const female = data.femalePatients || 0;
  return Math.max(0, uniqueSeen - male - female);
};

const sumCaseSheets = (counts) => {
  if (!counts) return 0;
  return Object.values(counts).reduce((sum, value) => sum + (value || 0), 0);
};

export const buildSummaryRows = ({ data, title = '', periodLabel = '' }) => {
  if (!data) return [];
  const rows = [];

  rows.push(['Report Title', title]);
  if (periodLabel) rows.push(['Period', periodLabel]);

  if (data.windowStart) rows.push(['Window Start', formatDate(data.windowStart)]);
  if (data.windowEnd) rows.push(['Window End', formatDate(data.windowEnd)]);

  rows.push(['Total Case Sheets', sumCaseSheets(data.caseSheetCounts)]);
  if (data.newPatients !== undefined) rows.push(['New Registrations', data.newPatients || 0]);
  rows.push(['New Patients Visited', data.newPatientsVisited || 0]);
  rows.push(['Old Patients Visited', data.oldPatientsVisited || 0]);
  rows.push(['Male Patients', data.malePatients || 0]);
  rows.push(['Female Patients', data.femalePatients || 0]);
  rows.push(['Other Patients', getOtherPatients(data)]);

  const counts = data.caseSheetCounts || {};
  Object.keys(counts).forEach((key) => {
    const label = departmentNames[key] || key;
    rows.push([`Case Sheets - ${label}`, counts[key] || 0]);
  });

  return rows;
};

export const buildWeeklyRows = (weeks) => {
  if (!Array.isArray(weeks) || !weeks.length) return [];

  const headers = [
    'Week Start',
    'Week End',
    'Total Case Sheets',
    'New Patients Visited',
    'Old Patients Visited',
    'Male Patients',
    'Female Patients',
    'Other Patients',
    'Case Sheets - Pedodontics',
    'Case Sheets - Complete Denture',
    'Case Sheets - Fixed Partial Denture',
    'Case Sheets - Implant',
    'Case Sheets - Implant Patient',
    'Case Sheets - Partial Denture'
  ];

  const rows = [headers];

  weeks.forEach((week) => {
    const counts = week.caseSheetCounts || {};
    rows.push([
      formatDate(week.weekStart),
      formatDate(week.weekEnd),
      sumCaseSheets(counts),
      week.newPatientsVisited || 0,
      week.oldPatientsVisited || 0,
      week.malePatients || 0,
      week.femalePatients || 0,
      getOtherPatients(week),
      counts.pedodontics || 0,
      counts.completeDenture || 0,
      counts.fpd || 0,
      counts.implant || 0,
      counts.implantPatient || 0,
      counts.partial || 0
    ]);
  });

  return rows;
};

export const downloadCsv = ({ filename, rows }) => {
  if (!rows || !rows.length) return;
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename || 'report.csv';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

export const getReportFilename = (prefix, label) => {
  const safeLabel = label
    ? String(label)
        .replace(/\s+/g, '_')
        .replace(/[^A-Za-z0-9_-]/g, '')
    : '';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const parts = [prefix, safeLabel, timestamp].filter(Boolean);
  return parts.join('_') + '.csv';
};
