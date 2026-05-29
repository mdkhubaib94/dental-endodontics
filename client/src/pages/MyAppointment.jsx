// MyAppointment.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./MyAppointment.css";
import { API_BASE_URL } from "../config/api";
import { getStoredPatientId } from '../utils/patientIdentity';

const MyAppointment = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const patientId = getStoredPatientId();

  const buildApiUrl = (path) =>
    `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  useEffect(() => {
    if (patientId) {
      fetchAppointments();
    } else {
      setError("Please log in to view your appointments");
      setLoading(false);
    }
  }, [patientId]);

  /* 🔥 ADD: refresh when user comes back from slot-booking */
  useEffect(() => {
    const onFocus = () => {
      if (patientId) {
        fetchAppointments();
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [patientId]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        buildApiUrl(`/api/appointment/appointments/patient/${encodeURIComponent(patientId)}`),
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setAppointments(data.appointments);
      } else {
        setError("Failed to load appointments.");
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      setError("Unable to connect to server. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }

    try {
      const response = await fetch(
        buildApiUrl(`/api/appointment/${appointmentId}/cancel`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ patientId }),
        }
      );

      const data = await response.json();

      if (data.success) {
        fetchAppointments(); // ✅ refresh
        alert("Appointment cancelled successfully.");
      } else {
        alert("Failed to cancel appointment.");
      }
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      alert("Unable to cancel appointment. Please try again later.");
    }
  };

  const handleReschedule = async (appointment) => {
    if (
      !window.confirm(
        "Are you sure you want to reschedule this appointment?"
      )
    ) {
      return;
    }

    try {
      navigate("/slot-booking", {
        state: {
          reschedule: true,
          oldAppointmentId: appointment.bookingId,
          chiefComplaint: appointment.chiefComplaint,
          currentDate: appointment.appointmentDate,
          currentTime: appointment.appointmentTime,
        },
      });
    } catch (error) {
      console.error("Error during reschedule:", error);
      alert("Unable to process rescheduling. Please try again later.");
    }
  };

  const getStatusTag = (status, appointmentDate, appointmentTime) => {
    try {
      const now = new Date();
      const appointmentDateTime = new Date(
        `${appointmentDate}T${convertTo24Hour(appointmentTime)}`
      );

      if (now > appointmentDateTime && status !== "cancelled") {
        return <span className="status-tag status-cancelled">Cancelled</span>;
      }

      switch (status) {
        case "confirmed":
          return <span className="status-tag status-confirmed">Confirmed</span>;
        case "cancelled":
          return <span className="status-tag status-cancelled">Cancelled</span>;
        case "rescheduled":
          return <span className="status-tag status-rescheduled">Rescheduled</span>;
        default:
          return (
            <span className="status-tag status-waiting">
              Waiting for Confirmation
            </span>
          );
      }
    } catch {
      return (
        <span className="status-tag status-waiting">
          Waiting for Confirmation
        </span>
      );
    }
  };

  const convertTo24Hour = (timeStr) => {
    if (!timeStr) return "00:00";
    const [time, modifier] = timeStr.split(" ");
    if (!modifier) return time;

    let [hours, minutes] = time.split(":");
    if (modifier === "PM" && hours !== "12") hours = String(+hours + 12);
    if (modifier === "AM" && hours === "12") hours = "00";
    return `${hours.padStart(2, "0")}:${minutes}`;
  };

  const isFutureAppointment = (date, time) => {
    const now = new Date();
    const appt = new Date(`${date}T${convertTo24Hour(time)}`);
    return appt > now;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <p>Loading appointments...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-container">
          <p>{error}</p>
          <button type="button" className="btn-book-now" onClick={fetchAppointments}>
            Retry
          </button>
        </div>
      );
    }

    if (appointments.length === 0) {
      return <p>No appointments found.</p>;
    }

    return (
      <div className="table-container">
        <table className="appointment-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Booking ID</th>
              <th>Patient Name</th>
              <th>Patient ID</th>
              <th>Email</th>
              <th>Date & Time</th>
              <th>Complaint</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a, index) => (
              <tr key={a.bookingId}>
                <td>{index + 1}</td>
                <td>{a.bookingId}</td>
                <td>{a.patientName || '-'}</td>
                <td>{a.patientId}</td>
                <td>{a.patientEmail}</td>
                <td>
                  {a.appointmentDate}
                  <span className="date-time-separator">•</span>
                  {a.appointmentTime}
                </td>
                <td>{a.chiefComplaint}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="appointment-dashboard">
      <header className="portal-header">
        <div className="header-left">
          <img
            src="/images/dental logo.png"
            alt="SRM Dental Logo"
            className="logo"
          />
          <h3 className="logo-text">SRM Dental College</h3>
        </div>

        <button
          className="btn-back-dashboard"
          onClick={() => navigate("/patient-dashboard")}
        >
          Back to Dashboard
        </button>
      </header>

      

      <main className="container">
        <h1>My Appointments</h1>
        {renderContent()}
      </main>
    </div>
  );
};

export default MyAppointment;
