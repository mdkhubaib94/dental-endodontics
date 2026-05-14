import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from "../config/api";

const CASE_CONSENT_NAV_STATE_KEY = 'caseSheetConsentApproved';
const campusBg = '/images/campus.png';
const logo = '/images/logo.png';

const getSafeRedirectTarget = (search) => {
  const redirectParam = new URLSearchParams(search).get('redirect');

  if (!redirectParam) return '/casePortal';
  if (!redirectParam.startsWith('/')) return '/casePortal';
  if (redirectParam.startsWith('//')) return '/casePortal';

  return redirectParam;
};

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTarget = getSafeRedirectTarget(location.search);

  const [formData, setFormData] = useState({
    patientName: '',
    date: new Date().toISOString().split('T')[0],
    agreed: false,
    signatureImage: null
  });

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const fileInputRef = useRef(null);

  // Media recording states
  const [mediaStream, setMediaStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordedVideoURL, setRecordedVideoURL] = useState(null);
  const [recordedVideoData, setRecordedVideoData] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const patientId =
    localStorage.getItem("CurrentpatientId") ||
    localStorage.getItem("patientId") ||
    null;

  const videoRef = useRef(null);

  // Attach stream to video element after state updates
  useEffect(() => {
    if (mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch((err) => console.error("Video play error:", err));
    }
  }, [mediaStream]);

  // Auto-fill patient name from current context/local storage and fallback API lookup.
  useEffect(() => {
    let isCancelled = false;

    const setPatientNameIfEmpty = (name) => {
      const trimmed = String(name || '').trim();
      if (!trimmed) return;

      setFormData((prev) => {
        if (String(prev.patientName || '').trim()) return prev;
        return { ...prev, patientName: trimmed };
      });
    };

    const storedPatientName =
      localStorage.getItem('CurrentpatientName') ||
      localStorage.getItem('patientName') ||
      '';

    if (storedPatientName) {
      setPatientNameIfEmpty(storedPatientName);
      return () => {
        isCancelled = true;
      };
    }

    if (!patientId) {
      return () => {
        isCancelled = true;
      };
    }

    const extractPatientName = (payload) => {
      const patient = payload?.data || payload?.patient || payload || {};
      const directName = String(patient.name || patient.patientName || '').trim();
      if (directName) return directName;

      const firstName = String(patient.personalInfo?.firstName || '').trim();
      const middleName = String(patient.personalInfo?.middleName || '').trim();
      const lastName = String(patient.personalInfo?.lastName || '').trim();

      return [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
    };

    const fetchPatientName = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/patient-details/by-patient-id/${encodeURIComponent(patientId)}`);
        if (!response.ok) return;

        const json = await response.json();
        const resolvedName = extractPatientName(json);

        if (!isCancelled) {
          setPatientNameIfEmpty(resolvedName);
        }
      } catch (error) {
        console.error('Failed to auto-fill consent form patient name:', error);
      }
    };

    fetchPatientName();

    return () => {
      isCancelled = true;
    };
  }, [patientId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());
    };
  }, [mediaStream]);

  // Revoke created object URLs to avoid memory leaks.
  useEffect(() => {
    return () => {
      if (recordedVideoURL && recordedVideoURL.startsWith("blob:")) {
        URL.revokeObjectURL(recordedVideoURL);
      }
    };
  }, [recordedVideoURL]);

  const blobToDataURL = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to convert recorded video"));
      reader.readAsDataURL(blob);
    });

  const objectUrlToDataURL = async (objectUrl) => {
    const response = await fetch(objectUrl);
    if (!response.ok) {
      throw new Error("Failed to read recorded video");
    }

    const blob = await response.blob();
    return blobToDataURL(blob);
  };

  const createVideoThumbnail = (videoSrc) =>
    new Promise((resolve) => {
      if (!videoSrc) {
        resolve(null);
        return;
      }

      const tempVideo = document.createElement('video');
      tempVideo.src = videoSrc;
      tempVideo.muted = true;
      tempVideo.playsInline = true;
      tempVideo.preload = 'auto';
      tempVideo.crossOrigin = 'anonymous';

      const cleanup = () => {
        tempVideo.pause();
        tempVideo.removeAttribute('src');
        tempVideo.load();
      };

      const captureFrame = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = tempVideo.videoWidth || 640;
          canvas.height = tempVideo.videoHeight || 360;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
          const frame = canvas.toDataURL('image/png');
          cleanup();
          resolve(frame);
        } catch {
          cleanup();
          resolve(null);
        }
      };

      tempVideo.addEventListener('loadeddata', () => {
        const seekTime = tempVideo.duration && Number.isFinite(tempVideo.duration)
          ? Math.min(0.2, Math.max(tempVideo.duration / 4, 0))
          : 0;

        if (seekTime > 0) {
          tempVideo.currentTime = seekTime;
        } else {
          captureFrame();
        }
      }, { once: true });

      tempVideo.addEventListener('seeked', captureFrame, { once: true });
      tempVideo.addEventListener('error', () => {
        cleanup();
        resolve(null);
      }, { once: true });
    });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2000000) {
        alert("File is too large. Please upload an image smaller than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, signatureImage: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSignature = () => {
    setFormData(prev => ({ ...prev, signatureImage: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Camera & Mic permission
  const requestMediaPermission = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Your browser does not support camera/microphone access.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setMediaStream(stream);
      setPermissionGranted(true);
      setPermissionDenied(false);
      setPermissionError("");
    } catch (err) {
      console.error("Permission error:", err.name, err.message);
      let msg = "Permission denied.";
      if (err.name === "NotAllowedError") {
        msg = "NotAllowedError: Access was denied. Click the 🔒 icon in your address bar → Site Settings → Allow Camera & Microphone → Refresh page.";
      } else if (err.name === "NotFoundError") {
        msg = "NotFoundError: No camera or microphone found on this device.";
      } else if (err.name === "NotReadableError") {
        msg = "NotReadableError: Camera/Microphone is already in use by another application.";
      } else {
        msg = `Error: ${err.name} - ${err.message}`;
      }
      setPermissionDenied(true);
      setPermissionError(msg);
      setPermissionGranted(false);
    }
  };

  const startRecording = () => {
    if (!mediaStream) return;
    const chunks = [];
    const recorder = new MediaRecorder(mediaStream);
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const nextObjectUrl = URL.createObjectURL(blob);

      setRecordedVideoURL((previousUrl) => {
        if (previousUrl && previousUrl.startsWith("blob:")) {
          URL.revokeObjectURL(previousUrl);
        }
        return nextObjectUrl;
      });

      try {
        const dataUrl = await blobToDataURL(blob);
        setRecordedVideoData(dataUrl);
      } catch (error) {
        console.error("Video conversion failed:", error);
        setRecordedVideoData(null);
      }
    };
    recorder.start();
    setMediaRecorder(recorder);
    setRecording(true);
    setRecordedVideoURL((previousUrl) => {
      if (previousUrl && previousUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previousUrl);
      }
      return null;
    });
    setRecordedVideoData(null);
    setSubmitError("");
  };

  const stopRecording = () => {
    if (mediaRecorder) { mediaRecorder.stop(); setRecording(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!formData.agreed) {
      alert("Please agree to the terms by checking the consent box.");
      return;
    }
    if (!formData.signatureImage) {
      alert("Please upload your signature image.");
      return;
    }
    if (!recordedVideoURL) {
      alert("Please record a video consent before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const videoConsentData =
        (typeof recordedVideoData === "string" && recordedVideoData.trim())
          ? recordedVideoData
          : await objectUrlToDataURL(recordedVideoURL);

      const response = await fetch(`${API_BASE_URL}/api/consent-forms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId,
          patientName: formData.patientName.trim(),
          date: formData.date,
          agreed: formData.agreed,
          signatureImage: formData.signatureImage,
          videoConsentData,
          videoMimeType: "video/webm",
        }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok || !data?.success) {
        const message = data?.message || "Failed to submit consent form. Please try again.";
        setSubmitError(message);
        return;
      }

      setSubmitted(true);
    } catch (error) {
      console.error("Consent submission failed:", error);
      setSubmitError("Consent submission failed. Please check your network and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = async () => {
    let frameUrl = null;
    const printLogoSrc = `${window.location.origin}/images/logo2.png`;
    if (recordedVideoURL) {
      frameUrl = await createVideoThumbnail(recordedVideoURL);
    }

    const sigHtml = formData.signatureImage
      ? `<img src="${formData.signatureImage}" alt="Patient Signature" style="max-height:100px;max-width:220px;object-fit:contain;" />`
      : '<p style="color:#888;font-style:italic;">No signature uploaded</p>';

    const videoHtml = frameUrl
      ? `<div style="margin-top:6px;">
           <img src="${frameUrl}" alt="Video Consent Frame" style="width:100%;max-width:520px;border:1px solid #ccc;border-radius:6px;display:block;" />
           <p style="font-size:12px;color:#555;margin-top:4px;">Printed preview of recorded video consent on ${formData.date}</p>
         </div>`
      : recordedVideoURL
        ? `<p style="color:#2e7d32;font-weight:bold;">&#10003; Video consent was recorded on ${formData.date}</p>`
        : '<p style="color:#888;font-style:italic;">No video consent recorded</p>';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Consent Form - ${formData.patientName}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #222; }
    .header { border-bottom: 2px solid #1f3c88; padding-bottom: 20px; margin-bottom: 24px; }
    .header-top { display: flex; align-items: flex-start; gap: 18px; }
    .header img { width: 96px; height: 96px; flex-shrink: 0; background: #fff; border: 1px solid #d8deea; border-radius: 50%; padding: 6px; object-fit: contain; }
    .header-text { flex: 1; text-align: center; padding-right: 98px; }
    h1 { font-size: 20px; margin: 6px 0; text-transform: uppercase; letter-spacing: 1px; }
    .dept { font-size: 13px; font-weight: 600; color: #1f3c88; letter-spacing: 2px; text-transform: uppercase; margin: 4px 0; }
    .subtitle { font-size: 17px; font-weight: 500; margin-top: 10px; color: #333; }
    .section { margin-bottom: 18px; }
    .consent-box { background: #f7f8fa; border-left: 4px solid #1f3c88; padding: 16px 20px; font-style: italic; font-size: 14px; line-height: 1.8; text-align: justify; margin-bottom: 20px; border-radius: 4px; }
    .row { display: flex; gap: 40px; margin-bottom: 20px; flex-wrap: wrap; }
    .field { margin-bottom: 10px; }
    .field-label { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #666; display: block; margin-bottom: 4px; }
    .field-value { font-size: 15px; font-weight: 500; margin: 0; }
    .agreed { color: #2e7d32; font-weight: bold; }
    .sig-box { border: 1px solid #ddd; border-radius: 8px; padding: 10px; display: inline-block; min-width: 200px; min-height: 80px; vertical-align: middle; }
    .video-label { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #666; display: block; margin-bottom: 6px; }
    .footer { margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; text-align: center; font-size: 11px; color: #aaa; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-top">
      <img src="${printLogoSrc}" alt="SRM Dental College Logo" />
      <div class="header-text">
        <h1>SRM Dental College</h1>
        <p class="dept">Department of Prosthodontics</p>
        <p class="subtitle">சம்மதப் படிவம் (Consent Form)</p>
      </div>
    </div>
  </div>

  <div class="section">
    <span class="field-label">பெயர் (Name)</span>
    <p class="field-value">${formData.patientName || '—'}</p>
  </div>

  <p style="font-size:15px;line-height:1.7;color:#444;text-align:justify;margin-bottom:16px;">
    ஆகிய நான், இராமாபுரம், எஸ்.ஆர்.எம். பல் மருத்துவக் கல்லூரியில் செயற்கை பல் கட்டும் பிரிவு மருத்துவர்களுக்கு முழு மனதுடன் எழுதிக்கொடுக்கும் சம்மதப்படிவம்.
  </p>

  <div class="consent-box">
    <p>செயற்கை பல் கட்டும் மருத்துவத்துறையின் சிகிச்சைப் பற்றி அனைத்து விவரங்களையும் அதற்கான சிகிச்சைக் காலம், எத்தனை முறை சிகிச்சைக்கு வரவேண்டும், அதற்குண்டான கட்டணம், தேவையான இதர பல் சிகிச்சைகள் மற்றும் முன்காப்பு, பின் விளைவுகள் பற்றி விவரமாக என்னிடம் தெரிவிக்கப்பட்டது.</p>
    <p style="margin-top:10px">சிகிச்சை காலத்தில் ஏற்படக்கூடிய சிகிச்சை மாற்றங்களை தெளிவாக விளக்கப்பட்டது. செயற்கைப் பல் சிகிச்சைக்கான காலம் மற்றும் சிகிச்சைக் கட்டணம் தோராயமாகக் கூறப்பட்டது.</p>
    <p style="margin-top:10px;font-weight:bold;color:#222;">இந்த பல் சிகிச்சையினால் எனக்கு ஏற்படக்கூடிய, தவிர்க்க முடியாத பின் விளைவுகளுக்கு செயற்கை பல் கட்டும் மருத்துவக் குழுவை காரணமாக சொல்ல மாட்டேன் என்று உறுதியாக கூறுகிறேன்.</p>
  </div>

  <div class="row">
    <div class="field">
      <span class="field-label">📅 Date (தேதி)</span>
      <p class="field-value">${formData.date}</p>
    </div>
    <div class="field">
      <span class="field-label">✅ Consent</span>
      <p class="field-value agreed">${formData.agreed ? '✓ I agree to the terms (சம்மதிக்கிறேன்)' : '✗ Not agreed'}</p>
    </div>
  </div>

  <div class="section">
    <span class="field-label">✒️ Signature (கையெப்பம்)</span>
    <div class="sig-box" style="margin-top:8px;">
      ${sigHtml}
    </div>
  </div>

  <div class="section">
    <span class="video-label">🎥 Video Consent</span>
    ${videoHtml}
  </div>

  <div class="footer">
    Official Patient Consent Document &bull; SRM Dental College, Ramapuram
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=960,height=720');
    if (!printWindow) { window.print(); return; }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 600);
  };

  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, textAlign: "center", padding: "40px" }}>
          <div style={styles.successIcon}>✅</div>
          <h2 style={{ fontSize: "22px", fontWeight: "bold", margin: "12px 0 8px" }}>Consent Submitted</h2>
          <p style={{ color: "#555", marginBottom: "20px" }}>
            The digital consent form for <b>{formData.patientName}</b> has been recorded.
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setSubmitted(false)} style={styles.backBtn}>Back to Form</button>
            <button
              onClick={() =>
                navigate(redirectTarget, {
                  replace: true,
                  state: { [CASE_CONSENT_NAV_STATE_KEY]: true },
                })
              }
              style={styles.continueBtn}
            >
              Continue
            </button>
            <button onClick={handlePrint} style={styles.printBtn}>🖨️ Print</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* HEADER */}
        <div style={styles.header}>
          <img src={logo} alt="SRM Dental College Logo" style={styles.logo} />
          <h1 style={styles.title}>SRM Dental College</h1>
          <p style={styles.dept}>Department of Prosthodontics</p>
          <div style={styles.divider}></div>
          <h2 style={styles.subtitle}>சம்மதப் படிவம் (Consent Form)</h2>
        </div>

        <form onSubmit={handleSubmit} style={styles.formBody}>

          {/* Patient Name */}
          <div style={styles.nameRow}>
            <label style={styles.nameLabel}>பெயர் (Name):</label>
            <input
              required
              type="text"
              name="patientName"
              value={formData.patientName}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              style={styles.nameInput}
            />
          </div>

          {/* Tamil Consent Text */}
          <p style={styles.bodyText}>
            ஆகிய நான், இராமாபுரம், எஸ்.ஆர்.எம். பல் மருத்துவக் கல்லூரியில் செயற்கை பல் கட்டும் பிரிவு மருத்துவர்களுக்கு முழு மனதுடன் எழுதிக்கொடுக்கும் சம்மதப்படிவம்.
          </p>

          <div style={styles.consentBox}>
            <p>செயற்கை பல் கட்டும் மருத்துவத்துறையின் சிகிச்சைப் பற்றி அனைத்து விவரங்களையும் அதற்கான சிகிச்சைக் காலம், எத்தனை முறை சிகிச்சைக்கு வரவேண்டும், அதற்குண்டான கட்டணம், தேவையான இதர பல் சிகிச்சைகள் மற்றும் முன்காப்பு, பின் விளைவுகள் பற்றி விவரமாக என்னிடம் தெரிவிக்கப்பட்டது.</p>
            <p style={{ marginTop: "10px" }}>சிகிச்சை காலத்தில் ஏற்படக்கூடிய சிகிச்சை மாற்றங்களை தெளிவாக விளக்கப்பட்டது. செயற்கைப் பல் சிகிச்சைக்கான காலம் மற்றும் சிகிச்சைக் கட்டணம் தோராயமாகக் கூறப்பட்டது.</p>
            <p style={{ marginTop: "10px", fontWeight: "bold", color: "#222" }}>இந்த பல் சிகிச்சையினால் எனக்கு ஏற்படக்கூடிய, தவிர்க்க முடியாத பின் விளைவுகளுக்கு செயற்கை பல் கட்டும் மருத்துவக் குழுவை காரணமாக சொல்ல மாட்டேன் என்று உறுதியாக கூறுகிறேன்.</p>
          </div>

          {/* Date + Consent Checkbox + Signature */}
          <div style={styles.inputGrid}>

            {/* Left: Date + Checkbox */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={styles.fieldLabel}>📅 Date (தேதி)</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  style={styles.dateInput}
                />
              </div>
              <div>
                <label style={styles.fieldLabel}>✅ Consent</label>
                <div style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    id="agreed"
                    name="agreed"
                    checked={formData.agreed}
                    onChange={handleInputChange}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <label htmlFor="agreed" style={{ fontSize: "13px", color: "#555", cursor: "pointer" }}>
                    I agree to the terms (சம்மதிக்கிறேன்)
                  </label>
                </div>
              </div>
            </div>

            {/* Right: Signature Upload */}
            <div>
              <label style={styles.fieldLabel}>✒️ Signature (கையெப்பம்)</label>
              {!formData.signatureImage ? (
                <div onClick={() => fileInputRef.current.click()} style={styles.uploadBox}>
                  <span style={{ fontSize: "24px" }}>⬆️</span>
                  <span style={{ fontSize: "12px", color: "#777", marginTop: "4px" }}>Upload Signature Image</span>
                  <span style={{ fontSize: "10px", color: "#aaa" }}>PNG, JPG up to 2MB</span>
                  <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/*" onChange={handleSignatureUpload} />
                </div>
              ) : (
                <div style={styles.sigPreview}>
                  <img src={formData.signatureImage} alt="Signature" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                  <button type="button" onClick={removeSignature} style={styles.removeBtn}>✕</button>
                </div>
              )}
            </div>
          </div>

          {/* VIDEO CONSENT SECTION */}
          <div style={styles.videoSection}>
            <p style={styles.videoTitle}>🎥 Record Video Consent <span style={{ color: "#c62828" }}>*</span></p>
            <p style={styles.videoNote}>
              Video consent is required. Click the button below to allow camera and microphone access, then record your consent before submitting.
            </p>

            {!permissionGranted && (
              <button type="button" style={styles.permissionButton} onClick={requestMediaPermission}>
                Allow Camera & Microphone
              </button>
            )}

            {permissionDenied && (
              <div style={styles.deniedBox}>
                <p style={styles.deniedText}>⚠️ {permissionError}</p>
                <button type="button" style={{ ...styles.permissionButton, marginTop: "8px" }} onClick={requestMediaPermission}>
                  🔄 Try Again
                </button>
              </div>
            )}

            {permissionGranted && (
              <div>
                <video ref={videoRef} autoPlay muted playsInline style={styles.videoPreview} />
                <div style={{ marginTop: "10px" }}>
                  {!recording ? (
                    <button type="button" style={styles.startButton} onClick={startRecording}>⏺ Start Recording</button>
                  ) : (
                    <button type="button" style={styles.stopButton} onClick={stopRecording}>⏹ Stop Recording</button>
                  )}
                </div>
                {recordedVideoURL && (
                  <div style={{ marginTop: "12px" }}>
                    <p style={{ fontWeight: "bold", color: "green", marginBottom: "6px" }}>✅ Recording saved!</p>
                    <video src={recordedVideoURL} controls style={styles.videoPreview} />
                    <a href={recordedVideoURL} download="consent-video.webm" style={styles.downloadLink}>
                      ⬇️ Download Recording
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {submitError && <p style={styles.errorText}>{submitError}</p>}
          <div style={styles.actionRow}>
            <button
              type="submit"
              style={{
                ...styles.submitBtn,
                ...(isSubmitting ? styles.submitBtnDisabled : {}),
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "📄 Submit Consent"}
            </button>
            <button type="button" onClick={handlePrint} style={styles.printBtn2}>
              🖨️ Print Form
            </button>
          </div>
        </form>

        {/* Footer */}
        <div style={styles.footer}>
          Official Patient Consent Document • SRM Dental College, Ramapuram
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    backgroundImage: `url(${campusBg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    padding: "30px",
  },
  card: {
    maxWidth: "820px",
    margin: "auto",
    background: "#ffffff",
    borderRadius: "10px",
    boxShadow: "0 6px 15px rgba(0,0,0,0.25)",
    overflow: "hidden",
  },
  header: {
    textAlign: "center",
    borderBottom: "2px solid #eee",
    paddingBottom: "20px",
    padding: "24px 24px 20px",
  },
  logo: {
    width: "90px",
    height: "90px",
    display: "block",
    margin: "0 auto 10px",
  },
  title: {
    fontSize: "22px",
    fontWeight: "bold",
    margin: "4px 0",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  dept: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#1f3c88",
    letterSpacing: "2px",
    textTransform: "uppercase",
    margin: "4px 0",
  },
  divider: {
    height: "4px",
    width: "60px",
    background: "#1f3c88",
    margin: "10px auto",
    borderRadius: "2px",
  },
  subtitle: {
    fontSize: "18px",
    fontWeight: "500",
    marginTop: "10px",
    color: "#333",
  },
  formBody: {
    padding: "28px",
  },
  nameRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    borderBottom: "1px solid #ccc",
    paddingBottom: "8px",
    marginBottom: "18px",
  },
  nameLabel: {
    fontWeight: "bold",
    whiteSpace: "nowrap",
    fontSize: "15px",
  },
  nameInput: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: "15px",
    color: "#1f3c88",
    fontWeight: "500",
    background: "transparent",
  },
  bodyText: {
    fontSize: "15px",
    lineHeight: "1.7",
    color: "#444",
    marginBottom: "16px",
    textAlign: "justify",
  },
  consentBox: {
    background: "#f7f8fa",
    borderLeft: "4px solid #1f3c88",
    borderRadius: "6px",
    padding: "18px 20px",
    fontSize: "14px",
    fontStyle: "italic",
    color: "#444",
    lineHeight: "1.8",
    marginBottom: "24px",
    textAlign: "justify",
  },
  inputGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
    marginBottom: "24px",
  },
  fieldLabel: {
    display: "block",
    fontSize: "12px",
    fontWeight: "700",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: "1px",
    marginBottom: "8px",
  },
  dateInput: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "14px",
    background: "#f9f9f9",
    outline: "none",
    boxSizing: "border-box",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px",
    background: "#f9f9f9",
    border: "1px solid #ddd",
    borderRadius: "8px",
  },
  uploadBox: {
    border: "2px dashed #ccc",
    borderRadius: "10px",
    height: "120px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "border-color 0.2s",
  },
  sigPreview: {
    position: "relative",
    border: "1px solid #ddd",
    borderRadius: "10px",
    height: "120px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px",
  },
  removeBtn: {
    position: "absolute",
    top: "6px",
    right: "6px",
    background: "#fde8e8",
    color: "#c62828",
    border: "none",
    borderRadius: "50%",
    width: "24px",
    height: "24px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
  },
  videoSection: {
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "24px",
    background: "#f9f9f9",
  },
  videoTitle: {
    fontWeight: "bold",
    fontSize: "15px",
    marginBottom: "6px",
  },
  videoNote: {
    fontSize: "13px",
    color: "#555",
    marginBottom: "12px",
  },
  permissionButton: {
    padding: "10px 18px",
    background: "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
  },
  deniedBox: {
    marginTop: "10px",
    padding: "12px",
    background: "#fff3f3",
    border: "1px solid #f5c6cb",
    borderRadius: "6px",
  },
  deniedText: {
    color: "#c62828",
    fontSize: "13px",
    margin: 0,
  },
  videoPreview: {
    width: "100%",
    maxHeight: "280px",
    borderRadius: "6px",
    marginTop: "10px",
    background: "#000",
  },
  startButton: {
    padding: "9px 16px",
    background: "#d32f2f",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
  },
  stopButton: {
    padding: "9px 16px",
    background: "#616161",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
  },
  downloadLink: {
    display: "inline-block",
    marginTop: "8px",
    color: "#1f3c88",
    fontWeight: "bold",
    textDecoration: "underline",
    cursor: "pointer",
  },
  actionRow: {
    display: "flex",
    gap: "12px",
  },
  errorText: {
    color: "#b71c1c",
    background: "#fdecea",
    border: "1px solid #f5c2c0",
    borderRadius: "8px",
    padding: "10px 12px",
    marginTop: "0",
    marginBottom: "12px",
    fontSize: "13px",
  },
  submitBtn: {
    flex: 1,
    padding: "14px",
    background: "#1f3c88",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  submitBtnDisabled: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
  printBtn2: {
    padding: "14px 20px",
    background: "#f0f0f0",
    color: "#444",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
  },
  successIcon: {
    fontSize: "48px",
    marginBottom: "8px",
  },
  backBtn: {
    flex: 1,
    padding: "10px",
    background: "#eee",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },
  printBtn: {
    flex: 1,
    padding: "10px",
    background: "#1f3c88",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },
  continueBtn: {
    flex: 1,
    padding: "10px",
    background: "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },
  footer: {
    background: "#f7f7f7",
    padding: "16px",
    borderTop: "1px solid #eee",
    textAlign: "center",
    fontSize: "12px",
    color: "#999",
  },
};

export default App;
