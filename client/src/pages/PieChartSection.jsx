// PieChartSection.jsx
import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#FF69B4', '#FFBB28'];
const NEW_OLD_COLORS = ['#00C49F', '#8884d8'];

export default function PieChartSection({ male, female, others, newPatients, oldPatients }) {
  const genderData = [
    { name: 'Male', value: male },
    { name: 'Female', value: female },
    { name: 'Others', value: others },
  ];
  const newOldData = [
    { name: 'New', value: newPatients },
    { name: 'Old', value: oldPatients },
  ];
  // Always show chart, even if all values are zero
  const chartStyle = {
    minWidth: 340,
    height: 340,
    background: 'linear-gradient(135deg, #e0f7fa 0%, #fffde4 100%)',
    borderRadius: 24,
    boxShadow: '0 4px 24px 0 rgba(0,0,0,0.10)',
    padding: 24,
    marginBottom: 16,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  };
  const titleStyle = {
    textAlign: 'center',
    fontWeight: 700,
    fontSize: 20,
    color: '#0f2b3a',
    marginBottom: 8,
    letterSpacing: 1,
    textShadow: '0 2px 8px #fff',
  };
  return (
    <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', marginTop: 32, justifyContent: 'center' }}>
      <div style={chartStyle}>
        <div style={titleStyle}>Today's Gender Comparison</div>
        <ResponsiveContainer width={240} height={240}>
          <PieChart>
            <Pie
              data={genderData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, value }) => `${name}: ${value}`}
              isAnimationActive={true}
              stroke="#fff"
            >
              {genderData.map((entry, idx) => (
                <Cell key={`cell-gender-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend iconType="circle" layout="horizontal" align="center" verticalAlign="bottom"/>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={chartStyle}>
        <div style={titleStyle}>Today: New vs Old</div>
        <ResponsiveContainer width={240} height={240}>
          <PieChart>
            <Pie
              data={newOldData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, value }) => `${name}: ${value}`}
              isAnimationActive={true}
              stroke="#fff"
            >
              {newOldData.map((entry, idx) => (
                <Cell key={`cell-newold-${idx}`} fill={NEW_OLD_COLORS[idx % NEW_OLD_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend iconType="circle" layout="horizontal" align="center" verticalAlign="bottom"/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
