import React, { useState, useEffect } from "react";
import axios from "axios";
import "./UpdatePatient.css";
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from "../config/api";
import { getStoredPatientId } from '../utils/patientIdentity';

const UpdatePatientDetails = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const patientId = getStoredPatientId(); // Supports legacy and current storage keys
  const navigate = useNavigate();

  const buildApiUrl = (path) =>
    `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const loadPatientDetails = async () => {
    const savedData = localStorage.getItem("patientDetails");
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        setName(String(data.name || "").trim());
        setEmail(String(data.email || "").trim());
        setPhone(String(data.phone || "").trim());
      } catch {
        // Ignore invalid cached data and continue to API fetch.
      }
    }

    if (!patientId) return;

    setIsLoadingDetails(true);
    try {
      const response = await fetch(buildApiUrl(`/api/auth/patient-basic-details/${encodeURIComponent(patientId)}`));
      if (!response.ok) return;

      const data = await response.json();
      const nextName = String(data?.name || "").trim();
      const nextEmail = String(data?.email || "").trim();
      const nextPhone = String(data?.phone || "").trim();

      setName(nextName);
      setEmail(nextEmail);
      setPhone(nextPhone);
      localStorage.setItem("patientDetails", JSON.stringify({ name: nextName, email: nextEmail, phone: nextPhone }));
      localStorage.setItem("patientName", nextName);
    } catch {
      // Keep cached values if API fetch fails.
    } finally {
      setIsLoadingDetails(false);
    }
  };

  useEffect(() => {
    loadPatientDetails();
  }, [patientId]);

  const sendOtp = async () => {
    try {
      setOtpVerified(false);
      setOtp("");
      if (!email.trim()) {
        setMessage("Please add an email address before requesting OTP.");
        return;
      }
      await axios.post(buildApiUrl("/api/otp/send-otp"), {
        name: name || "Patient",
        email,
        patientId,
        method: "email",
      });
      setOtpSent(true);
      setMessage("OTP sent successfully");
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to send OTP");
    }
  };

  const verifyOtp = async () => {
    try {
      const verifyRes = await axios.post(buildApiUrl("/api/otp/verify-otp"), {
        email,
        otp,
        method: "email",
      });

      if (verifyRes.data.success) {
        setOtpVerified(true);
        setMessage("OTP verified. You can now update your details.");
      } else {
        setMessage("OTP verification failed");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Update failed");
    }
  };

  const updatePatientDetails = async () => {
    if (!otpVerified) {
      setMessage("Please verify OTP first.");
      return;
    }

    setIsSaving(true);
    try {
      const updateRes = await axios.post(buildApiUrl("/api/otp/update"), {
        Identity: patientId,
        name,
        email,
        phone,
      });

      setMessage(updateRes.data.message || "Details updated successfully.");
      await loadPatientDetails();
    } catch (err) {
      setMessage(err.response?.data?.message || "Update failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="updatebody" style={{ backgroundImage: "url('/images/campus.png')" }}>
    <div className="update-form-container">
    <h1 className="form-title">Update Your Details</h1>

    {message && (
      <div className="message-box">
        <button
          type="button"
          className="message-close-btn"
          onClick={() => setMessage("")}
          aria-label="Close message"
        >
          ×
        </button>
        <p>{message}</p>
      </div>
    )}

    <form className="form-group">
     <div className="form-group">
        <label htmlFor="name">Name</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="form-group-input"
          readOnly={!otpVerified}
          aria-readonly={otpVerified ? "false" : "true"}
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="form-group-input"
          readOnly={!otpVerified}
          aria-readonly={otpVerified ? "false" : "true"}
        />
      </div>

      <div className="form-group">
        <label htmlFor="phone">Phone</label>
        <input
          type="tel"
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="form-group-input"
          readOnly={!otpVerified}
          aria-readonly={otpVerified ? "false" : "true"}
        />
      </div>

      {isLoadingDetails && <div className="message-box">Loading saved patient details...</div>}

      {!otpSent ? (
        <button
          type="button"
          className="button"
          onClick={() => {
            if (email.trim() !== "") {
              sendOtp();
            }
          }}
        >
          Send OTP via Email
        </button>
      ) : (
        <>
          <div className="form-group">
            <label htmlFor="otp">Enter OTP</label>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="form-group-input"
            />
          </div>
          <button
            type="button"
            className="button"
            onClick={verifyOtp}
          >
            Verify OTP
          </button>
        </>
      )}

      {otpVerified && (
        <button
          type="button"
          className="button"
          onClick={updatePatientDetails}
          disabled={isSaving}
        >
          {isSaving ? "Updating..." : "Update Details"}
        </button>
      )}

      <button
        type="button"
        className="button"
        onClick={() => window.location.href = "/patient-dashboard"}
      >
        Back to Dashboard
      </button>
    </form>
  </div>
</div>
  );
};

export default UpdatePatientDetails;
