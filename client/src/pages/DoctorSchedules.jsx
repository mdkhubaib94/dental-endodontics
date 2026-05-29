import React, { useEffect, useState } from "react";
import axios from "axios";
import "./DoctorSchedules.css";
import { API_BASE_URL } from "../config/api";

const DoctorSchedule = () => {
  const [appointments, setAppointments] = useState([]);
  const storedRole = (localStorage.getItem("role") || "").toLowerCase();
  const isDoctorOnly = storedRole === "doctor";
  const canManageAppointments = storedRole === "doctor" || storedRole === "chief-doctor";
  const [viewMode, setViewMode] = useState(isDoctorOnly ? "my" : "all"); // 'all' | 'my'
  const [showModal, setShowModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [bookedSlots, setBookedSlots] = useState({});
  const [maxSlotsPerTime, setMaxSlotsPerTime] = useState(1);
  const [message, setMessage] = useState({ text: "", type: "" });

  const buildApiUrl = (path) =>
    `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  /* ================= MESSAGE ================= */
  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  /* ================= TOKEN ================= */
  const getToken = () =>
    localStorage.getItem("doctorToken") || localStorage.getItem("token");

  const normalizeScheduleStatus = (status) =>
    String(status || "pending").trim().toLowerCase();

  const isExpiredPendingAppointment = (item) => {
    if (item.sourceType !== "appointment") return false;

    const appointmentDate = new Date(item.appointmentDate);
    if (Number.isNaN(appointmentDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    appointmentDate.setHours(0, 0, 0, 0);

    return appointmentDate < today && item.status === "pending";
  };

  const getSortDate = (item) => {
    const rawValue = item.appointmentDate;

    const date = new Date(rawValue);
    if (Number.isNaN(date.getTime())) {
      return new Date(0);
    }

    date.setHours(0, 0, 0, 0);
    return date;
  };

  const sortScheduleItems = (items) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return items.sort((a, b) => {
      const dateA = getSortDate(a);
      const dateB = getSortDate(b);

      const aIsExpired = isExpiredPendingAppointment(a);
      const bIsExpired = isExpiredPendingAppointment(b);

      const aIsPendingValid = a.status === "pending" && !aIsExpired;
      const bIsPendingValid = b.status === "pending" && !bIsExpired;

      if (aIsPendingValid && !bIsPendingValid) return -1;
      if (!aIsPendingValid && bIsPendingValid) return 1;

      const aIsOther = a.status !== "pending";
      const bIsOther = b.status !== "pending";

      if (aIsOther && aIsExpired) return 1;
      if (bIsOther && bIsExpired) return -1;
      if (aIsOther && bIsExpired) return -1;
      if (bIsOther && aIsExpired) return 1;

      if (aIsExpired && !bIsExpired) return 1;
      if (!aIsExpired && bIsExpired) return -1;

      return dateA - dateB;
    });
  };

  const mapAppointmentToScheduleItem = (appointment) => ({
    ...appointment,
    sourceType: "appointment",
    sourceId: appointment.bookingId,
    patientName: appointment.patientName || appointment.patientId,
    status: normalizeScheduleStatus(appointment.status),
  });

  /* ================= FETCH APPOINTMENTS ================= */
  const fetchAppointments = async (mode = viewMode) => {
    try {
      const token = getToken();
      if (!token) return showMessage("Login required", "error");

      const effectiveMode = isDoctorOnly ? "my" : mode;
      if (effectiveMode !== mode && viewMode !== "my") {
        setViewMode("my");
      }

      const url =
        effectiveMode === "my"
          ? buildApiUrl("/api/appointment/my-appointments")
          : buildApiUrl("/api/appointment/all-appointments");

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        const sortedAppointments = sortScheduleItems(
          (res.data.appointments || []).map(mapAppointmentToScheduleItem)
        );

        setAppointments(sortedAppointments);
      } else {
        showMessage(res.data.message || "Failed to load appointments", "error");
      }
    } catch (error) {
      console.error("Error loading appointments:", error.response || error);
      if (error.response && error.response.status === 401) {
        showMessage("Login required or session expired. Please log in again.", "error");
      } else {
        showMessage("Failed to load appointments from server.", "error");
      }
    }
  };

  useEffect(() => {
    fetchAppointments(isDoctorOnly ? "my" : "all");
  }, []);

  /* ================= APPROVE ================= */
  const confirmAppointment = async (bookingId) => {
    try {
      const token = getToken();
      await axios.put(
        buildApiUrl(`/api/appointment/${bookingId}/approve`),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showMessage("Appointment approved", "success");
      fetchAppointments();
    } catch (err) {
      const msg = err?.response?.data?.message || "Error approving appointment";
      showMessage(msg, "error");
    }
  };

  /* ================= RESCHEDULE ================= */
  const openReschedule = (appointment) => {
    setSelectedAppointment(appointment);
    setSelectedDate("");
    setSelectedTime("");
    setBookedSlots({});
    setMaxSlotsPerTime(1);
    setShowModal(true);
  };

  const selectNewDate = async (dateStr) => {
    setSelectedDate(dateStr);
    setSelectedTime("");
    try {
      const res = await axios.get(
        buildApiUrl(`/api/appointment/booked-slots/${dateStr}`)
      );
      setBookedSlots((res.data && res.data.bookedSlots) || {});
      setMaxSlotsPerTime(
        Number.isFinite(res.data?.maxSlotsPerTime) ? res.data.maxSlotsPerTime : 1
      );
    } catch {
      setBookedSlots({});
      setMaxSlotsPerTime(1);
    }
  };

  const rescheduleAppointment = async () => {
    if (!selectedDate || !selectedTime)
      return showMessage("Select date & time", "error");

    try {
      const token = getToken();
      await axios.put(
        buildApiUrl(`/api/appointment/${selectedAppointment.bookingId}/reschedule`),
        {
          appointmentDate: selectedDate,
          appointmentTime: selectedTime,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showMessage("Appointment rescheduled", "success");
      setShowModal(false);
      fetchAppointments();
    } catch (err) {
      const msg = err?.response?.data?.message || "Reschedule failed";
      showMessage(msg, "error");
    }
  };

  /* ================= TIME SLOTS ================= */
  const formatMinutesToTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${m < 10 ? "0" : ""}${m} ${ampm}`;
  };

  const generateDoctorTimeSlots = () => {
    const slotStartsInMinutes = [
      9 * 60,
      9 * 60 + 30,
      10 * 60,
      10 * 60 + 30,
      11 * 60 + 30,
      12 * 60,
      12 * 60 + 30,
      14 * 60,
    ];

    return slotStartsInMinutes.map(formatMinutesToTime);
  };

  /* ================= STATUS FORMAT ================= */
  const formatStatus = (status) =>
    status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <div className="DoctorSchedule-page">
      {message.text && (
        <div className={`message-box ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="schedule-container">
        <div className="header">
          {/* ✅ PUBLIC FOLDER IMAGE (NO IMPORT ERROR) */}
          <img
            src="/images/logo2.png"
            alt="SRM Dental College"
            className="logo"
          />
          <h1>SRM DENTAL COLLEGE</h1>
          <h2 className="subtitle" style={{ color: "black" }}>
            {viewMode === "all" ? "All Appointments" : "My Appointments"}
          </h2>
          <div className="view-toggle">
            {!isDoctorOnly && (
              <>
                <button
                  className={viewMode === "all" ? "active" : ""}
                  onClick={() => {
                    setViewMode("all");
                    fetchAppointments("all");
                  }}
                >
                  All
                </button>
              </>
            )}
          </div>
        </div>

        <table className="appointments-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Patient Name</th>
              <th>Patient ID</th>
              <th>Email</th>
              <th>Date & Time</th>
              <th>Complaint</th>
            </tr>
          </thead>

          <tbody>
            {appointments.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "16px", color: "#6b7280" }}>
                  {viewMode === "my"
                    ? "No upcoming appointments found."
                    : "No appointments found."}
                </td>
              </tr>
            )}

            {appointments.map((a, i) => (
              <tr key={a.bookingId}>
                <td>{i + 1}</td>
                <td>{a.patientName}</td>
                <td>{a.patientId}</td>
                <td>{a.patientEmail || "-"}</td>

                {/* ✅ DATE & TIME — CLEAN ALIGNMENT */}
                <td className="date-time-cell">
                  <div className="date-line">{a.appointmentDate || "-"}</div>
                  <div className="time-line">{a.appointmentTime || "-"}</div>
                </td>

                <td>
                  {String(a.chiefComplaint || '').trim().toLowerCase() ===
                  'follow-up appointment from prescription'
                    ? 'Follow ups'
                    : a.chiefComplaint}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================= RESCHEDULE MODAL ================= */}
      {showModal && (
        <div className="modal-overlay">
          <div className="reschedule-modal">
            <div className="modal-header">
              <div>
                <h3>Reschedule Appointment</h3>
                <p className="modal-subtitle">Select a new date and time for the appointment</p>
              </div>
              <button 
                className="btn-close-modal"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="appointment-date">Select New Date</label>
                <input
                  id="appointment-date"
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => selectNewDate(e.target.value)}
                  className="date-input"
                />
              </div>

              {selectedDate && (
                <div className="form-group">
                  <label>Select New Time</label>
                  <div className="time-grid">
                    {generateDoctorTimeSlots().map((time) => {
                      const bookedCount = bookedSlots[time] || 0;
                      const booked = bookedCount >= (maxSlotsPerTime || 1);
                      return (
                        <div
                          key={time}
                          className={`time-slot ${
                            booked
                              ? "booked"
                              : selectedTime === time
                              ? "selected"
                              : ""
                          }`}
                          onClick={() => !booked && setSelectedTime(time)}
                          title={booked ? "This slot is booked" : ""}
                          aria-disabled={booked}
                        >
                          <div className="time-slot-content">
                            <div>{time}</div>
                            {booked && (
                              <div className="slot-badge" aria-hidden="true">
                                Booked
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedDate && selectedTime && (
                <div className="appointment-summary">
                  <h4>New Appointment Details</h4>
                  <div className="summary-item">
                    <span className="summary-label">Date:</span>
                    <span className="summary-value">{selectedDate}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Time:</span>
                    <span className="summary-value">{selectedTime}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-modal-cancel"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-modal-submit"
                onClick={rescheduleAppointment}
                disabled={!selectedDate || !selectedTime}
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorSchedule;
