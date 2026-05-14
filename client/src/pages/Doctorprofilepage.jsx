import React, { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { API_BASE_URL } from "../config/api";
import "./doctorprofilepage.css";

const DoctorProfile = () => {
  const { user, login } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [doctor, setDoctor] = useState({
    name: "",
    role: "",
    department: "",
    experience: "",
    licenseNo: "",
    phone: "",
    email: "",
    specialization: "",
  });

  const buildApiUrl = (path) =>
    `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const roleLabelMap = {
    "chief-doctor": "Chief Doctor",
    chief: "Chief Doctor",
    doctor: "Doctor",
    pg: "PG",
    admin: "Admin",
    patient: "Patient",
  };

  const formatRoleLabel = (role) => {
    const normalizedRole = String(role || "")
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, "-");
    return roleLabelMap[normalizedRole] || "";
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setIsLoadingProfile(false);
      return;
    }

    const fallbackRole = String(user?.role || localStorage.getItem("role") || "").trim();
    const fallbackData = {
      name: String(user?.name || localStorage.getItem("doctorName") || "").trim(),
      email: String(user?.email || localStorage.getItem("doctorEmail") || "").trim(),
      department: String(user?.department || localStorage.getItem("doctorDepartment") || "").trim(),
      phone: "",
      specialization: "",
      role: formatRoleLabel(fallbackRole),
    };

    const loadProfile = async () => {
      try {
        const response = await fetch(buildApiUrl("/api/auth/doctor/profile"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          setDoctor((prev) => ({ ...prev, ...fallbackData }));
          return;
        }

        const data = await response.json();
        const profile = data?.profile || {};

        setDoctor((prev) => ({
          ...prev,
          name: String(profile.name || fallbackData.name || "").trim(),
          email: String(profile.email || fallbackData.email || "").trim(),
          phone: String(profile.phone || "").trim(),
          department: String(profile.department || fallbackData.department || "").trim(),
          specialization: String(profile.specialization || "").trim(),
          role: formatRoleLabel(profile.role || fallbackRole),
        }));
      } catch {
        setDoctor((prev) => ({ ...prev, ...fallbackData }));
      } finally {
        setIsLoadingProfile(false);
      }
    };

    if (fallbackData.name || fallbackData.email || fallbackData.department) {
      setDoctor((prev) => ({ ...prev, ...fallbackData }));
    }

    loadProfile();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDoctor({ ...doctor, [name]: value });
  };

  const handleEditOrSave = async () => {
    setStatusMessage("");

    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setStatusMessage("Session expired. Please login again.");
      return;
    }

    const payload = {
      name: String(doctor.name || "").trim(),
      email: String(doctor.email || "").trim(),
      phone: String(doctor.phone || "").trim(),
      department: String(doctor.department || "").trim(),
      specialization: String(doctor.specialization || "").trim(),
    };

    if (!payload.name) {
      setStatusMessage("Name is required.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(buildApiUrl("/api/auth/doctor/profile"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 404) {
          setStatusMessage("Profile API route not available on backend. Restart/deploy backend with latest changes.");
          return;
        }
        if (response.status === 503) {
          setStatusMessage("Backend service is unavailable. Check MongoDB connection and server status.");
          return;
        }
        setStatusMessage(data?.message || "Failed to save profile");
        return;
      }

      const profile = data?.profile || {};
      const nextName = String(profile.name || payload.name || "").trim();
      const nextEmail = String(profile.email || payload.email || "").trim();
      const nextDepartment = String(profile.department || payload.department || "").trim();
      const nextPhone = String(profile.phone || payload.phone || "").trim();
      const nextSpecialization = String(profile.specialization || payload.specialization || "").trim();

      setDoctor((prev) => ({
        ...prev,
        name: nextName,
        email: nextEmail,
        department: nextDepartment,
        phone: nextPhone,
        specialization: nextSpecialization,
        role: formatRoleLabel(profile.role || user?.role || localStorage.getItem("role")),
      }));

      localStorage.setItem("doctorName", nextName);
      localStorage.setItem("doctorEmail", nextEmail);
      localStorage.setItem("doctorDepartment", nextDepartment);

      const roleValue = String(user?.role || localStorage.getItem("role") || "").trim();
      const identityValue = String(user?.id || localStorage.getItem("doctorId") || "").trim();
      login({
        token,
        name: nextName,
        Identity: identityValue,
        role: roleValue,
        email: nextEmail,
        department: nextDepartment,
      });

      setStatusMessage("Profile updated successfully.");
      setIsEditing(false);
    } catch {
      setStatusMessage("Failed to save profile. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="doctor-profile-container">
      <div className="doctor-profile-card">
        <div className="google-header">
          <h1>Personal info</h1>
          <p>Info about you and your preferences across our services</p>
        </div>

        <div className="profile-section-box">
          <div className="profile-row main-row">
            <div>
              <h3>Profile</h3>
              <p>Some info may be visible to other people</p>
            </div>
            <img
              src="https://cdn-icons-png.flaticon.com/512/3774/3774299.png"
              alt="Doctor"
              className="doctor-profile-img"
            />
          </div>

          <div className="info-grid">
            {/* NAME SECTION */}
            <div className="info-item">
              <span className="label">NAME</span>
              {isEditing ? (
                <input name="name" value={doctor.name} onChange={handleChange} className="google-input" />
              ) : (
                <span className="value">{doctor.name || "-"}</span>
              )}
            </div>

            {/* ROLE SECTION */}
            <div className="info-item">
              <span className="label">ROLE</span>
              {isEditing ? (
                <input name="role" value={doctor.role} onChange={handleChange} className="google-input" />
              ) : (
                <span className="value">{doctor.role || "-"}</span>
              )}
            </div>

            {/* EMAIL SECTION - Now Separate */}
            <div className="info-item">
              <span className="label">EMAIL</span>
              {isEditing ? (
                <input name="email" value={doctor.email} onChange={handleChange} className="google-input" />
              ) : (
                <span className="value">{doctor.email || "-"}</span>
              )}
            </div>

            {/* PHONE SECTION - Now Separate */}
            <div className="info-item">
              <span className="label">PHONE</span>
              {isEditing ? (
                <input name="phone" value={doctor.phone} onChange={handleChange} className="google-input" />
              ) : (
                <span className="value">{doctor.phone || "-"}</span>
              )}
            </div>
            
            <div className="info-item">
              <span className="label">DEPARTMENT</span>
              {isEditing ? (
                <input name="department" value={doctor.department} onChange={handleChange} className="google-input" />
              ) : (
                <span className="value">{doctor.department || "-"}</span>
              )}
            </div>

            <div className="info-item">
              <span className="label">SPECIALIZATION</span>
              {isEditing ? (
                <input
                  name="specialization"
                  value={doctor.specialization}
                  onChange={handleChange}
                  className="google-input"
                />
              ) : (
                <span className="value">{doctor.specialization || "-"}</span>
              )}
            </div>
          </div>

          {isLoadingProfile && <p className="value">Loading profile...</p>}
          {statusMessage && <p className="value">{statusMessage}</p>}

          <button 
            className={`google-btn ${isEditing ? "save" : ""}`} 
            onClick={handleEditOrSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Edit Profile"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfile;
