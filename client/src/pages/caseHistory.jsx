import React, { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import "./caseHistory.css";
import { API_BASE_URL } from "../config/api";

const CaseHistory = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [patientInfo, setPatientInfo] = useState(null);
  const { user } = useAuth();
  const buildApiUrl = (path) =>
    `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  useEffect(() => {
    const patientId = localStorage.getItem("CurrentpatientId");
    const patientName = localStorage.getItem("CurrentpatientName");

    if (patientId && patientName) {
      setPatientInfo({ id: patientId, name: patientName });
      fetchDoctorPatientCases(patientId, user?.id);
    } else {
      setError("No patient selected. Please select a patient first.");
      setLoading(false);
    }
  }, [user?.id]);

  const fetchDoctorPatientCases = async (patientId, doctorId) => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const endpoints = [
        { url: buildApiUrl(`/api/pedodontics/patient/${encodeURIComponent(patientId)}`), department: "Pedodontics" },
        { url: buildApiUrl(`/api/complete-denture/patient/${encodeURIComponent(patientId)}`), department: "Complete Denture" },
        { url: buildApiUrl(`/api/fpd/patient/${encodeURIComponent(patientId)}`), department: "FPD" },
        { url: buildApiUrl(`/api/implant/patient/${encodeURIComponent(patientId)}`), department: "Implant" },
        { url: buildApiUrl(`/api/ImplantPatient/patient/${encodeURIComponent(patientId)}`), department: "Implant Patient Surgery" },
        { url: buildApiUrl(`/api/partial/patient/${encodeURIComponent(patientId)}`), department: "Partial Denture" },
        { url: buildApiUrl(`/api/oral/patient/${encodeURIComponent(patientId)}`), department: "Oral Medicine and Radiology" },
        { url: buildApiUrl(`/api/general/patient/${encodeURIComponent(patientId)}`), department: "General" },
      ];

      const results = await Promise.all(
        endpoints.map(async ({ url, department }) => {
          const res = await fetch(url, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          const text = await res.text();
          const parsed = text ? JSON.parse(text) : null;

          if (parsed?.data && Array.isArray(parsed.data)) {
            return parsed.data.map((item) => ({ department, ...item }));
          }

          if (Array.isArray(parsed)) {
            return parsed.map((item) => ({ department, ...item }));
          }

          return [];
        })
      );

      let merged = [];
      results.forEach((r) => {
        if (Array.isArray(r)) merged.push(...r);
      });

      merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setCases(merged);
    } catch (err) {
      console.error(err);
      setError("Failed to load case history");
    } finally {
      setLoading(false);
    }
  };

  const viewCaseSheet = (caseId) => {
    window.open(`/case-sheet-view/${caseId}`, "_blank");
  };

  const viewPrescription = (caseItem) => {
    (async () => {
      try {
        if (patientInfo) {
          localStorage.setItem('CurrentpatientId', patientInfo.id);
          localStorage.setItem('CurrentpatientName', patientInfo.name);
        }

        if (caseItem?._id) {
          localStorage.setItem('linkedCaseId', caseItem._id);
          localStorage.setItem('linkedCaseData', JSON.stringify(caseItem));
        }

        const patientId = patientInfo?.id || caseItem?.patientId;
        const token = localStorage.getItem('token');

        const caseId = caseItem?._id;

        // Prefer case-linked prescriptions (per-case-sheet) when possible
        if (caseId) {
          const resByCase = await fetch(buildApiUrl(`/api/prescriptions/case/${encodeURIComponent(caseId)}?page=1&limit=1`), {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });

          if (resByCase.ok) {
            const json = await resByCase.json();
            const prescriptions = json.data || [];
            if (prescriptions.length > 0) {
              const prescId = prescriptions[0]._id;
              window.open(`/prescription-view?id=${prescId}&format=pdf`, '_blank');
              return;
            }
          }
        }

        if (!patientId) {
          window.open('/prescriptions', '_blank');
          return;
        }

        const res = await fetch(buildApiUrl(`/api/prescriptions/patient/${encodeURIComponent(patientId)}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (res.ok) {
          const json = await res.json();
          const prescriptions = json.data || [];
          if (prescriptions.length > 0) {
            const prescId = prescriptions[0]._id;
            window.open(`/prescription-view?id=${prescId}&format=pdf`, '_blank');
            return;
          }
        }

        // fallback to creation page
        window.open('/prescriptions', '_blank');
      } catch (err) {
        console.error('Error opening prescription view from case history:', err);
        window.open('/prescriptions', '_blank');
      }
    })();
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (loading) {
    return <div className="case-history-container">Loading cases...</div>;
  }

  return (
    <div className="case-history-page">
      <div className="case-history-container">
        <h1>Patient Case Overview</h1>

        {patientInfo && (
          <div className="patient-info-section">
            <h2>Patient: {patientInfo.name}</h2>
            <p>Patient ID: {patientInfo.id}</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
            <button
              onClick={() =>
                fetchDoctorPatientCases(patientInfo.id, user?.id)
              }
            >
              Retry
            </button>
          </div>
        )}

        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Date</th>
              <th>Department</th>
              <th>Doctor</th>
              <th>Case Sheet</th>
              <th>Prescription</th>
            </tr>
          </thead>
          <tbody>
            {cases.length ? (
              cases.map((c, index) => {
                return (
                  <tr key={c._id}>
                    <td>{index + 1}</td>
                    <td>{formatDate(c.createdAt)}</td>
                    <td>{c.department || "—"}</td>
                    <td>{c.doctorName}</td>
                    <td>
                      <button onClick={() => viewCaseSheet(c._id)}>View</button>
                    </td>
                    <td>
                      <button onClick={() => viewPrescription(c)}>View</button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6">No cases found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CaseHistory;
