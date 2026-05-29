// SlotBooking.jsx
import React, { useState, useEffect, useRef } from 'react';
import './SlotBooking.css';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { getStoredPatientId } from '../utils/patientIdentity';

const COMPLAINT_OPTIONS = [
  'Oral ulcer',
  'Dental caries',
  'Sensitivity',
  'Gingivites and gum problem',
  'Missing teeth / tooth replacement',
  'Post filling complaints',
  'Intra oral swelling',
  'General',
];

const SlotBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // State variables
  const [patientEmail, setPatientEmail] = useState('');
  const [fetchingEmail, setFetchingEmail] = useState(false);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [generalInput, setGeneralInput] = useState('');
  const [showGeneralInput, setShowGeneralInput] = useState(false);
  const [showDateSelection, setShowDateSelection] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState({});
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [assignedDoctorName, setAssignedDoctorName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [maxSlotsPerTime, setMaxSlotsPerTime] = useState(1);
  const patientId = getStoredPatientId();

  const buildApiUrl = (path) =>
    `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  // Ref for cleanup
  const abortControllerRef = useRef(null);

  // Refs for focus management
  const bookNowButtonRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const confirmationModalRef = useRef(null);

  const rescheduleState = location?.state || null;
  const isRescheduleFlow = Boolean(rescheduleState?.reschedule);

  const complaintOptions = COMPLAINT_OPTIONS;

  // Fetch patient email on component mount
  useEffect(() => {
    if (patientId) {
      fetchPatientEmail();
    } else {
      setErrorMessage('Patient ID not found. Please log in again.');
    }
  }, [patientId]);

  // Prefill complaint for reschedule flow (if provided)
  useEffect(() => {
    if (!rescheduleState) return;
    const storedComplaintRaw = String(rescheduleState.chiefComplaint || '').trim();
    if (!storedComplaintRaw) return;

    const noDetailsText = 'General (No specific details provided)';
    const storedComplaint = storedComplaintRaw === noDetailsText ? '' : storedComplaintRaw;

    // If the stored complaint matches one of the fixed options, select it.
    if (complaintOptions.includes(storedComplaintRaw)) {
      setChiefComplaint(storedComplaintRaw);
      setShowGeneralInput(storedComplaintRaw === 'General');
      if (storedComplaintRaw === 'General') {
        setGeneralInput('');
      }
      return;
    }

    // Otherwise, it was likely stored as free-text (General) — restore it.
    setChiefComplaint('General');
    setShowGeneralInput(true);
    setGeneralInput(storedComplaint);
  }, [rescheduleState]);

  // For reschedule flow, go straight to date selection once complaint is known.
  useEffect(() => {
    if (!isRescheduleFlow) return;
    if (!chiefComplaint) return;
    setShowDateSelection(true);
  }, [isRescheduleFlow, chiefComplaint]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Move focus to the next step after a slot is selected
  useEffect(() => {
    if (!selectedSlot) return;

    // The "Book Your Slot" button is conditionally rendered, so wait a tick.
    const id = window.setTimeout(() => {
      const el = bookNowButtonRef.current;
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
    }, 0);

    return () => window.clearTimeout(id);
  }, [selectedSlot]);

  // When confirmation modal opens, focus the primary confirm button
  useEffect(() => {
    if (!showConfirmationModal) return;

    const id = window.setTimeout(() => {
      const el = confirmationModalRef.current;
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
    }, 0);

    return () => window.clearTimeout(id);
  }, [showConfirmationModal]);

  // Utility functions
  const formatMinutesToTime = (mins) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    const m = minutes < 10 ? '0' + minutes : minutes;
    return `${h}:${m} ${ampm}`;
  };

  const generateTimeSlots = () => {
    // Strict schedule: 30-minute slots from 9:00 AM to 2:00 PM (last start 2:00 PM, ends 2:30 PM)
    // Lunch break (1:00–2:00) removes 1:00 and 1:30.
    // Break (11:00–11:10) removes the 11:00–11:30 slot; next slot remains 11:30 (no 11:10 slot).
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

    return slotStartsInMinutes.map((start) => ({
      start,
      end: start + 30,
      time: formatMinutesToTime(start),
    }));
  };

  const generateUpcomingDates = (numWeekdays) => {
    const dates = [];
    const start = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric' };

    let offset = 0;
    while (dates.length < numWeekdays) {
      const futureDate = new Date(start);
      futureDate.setDate(start.getDate() + offset);
      offset += 1;

      const day = futureDate.getDay();
      // Skip weekends (Sun=0, Sat=6)
      if (day === 0 || day === 6) continue;

      const yyyy = futureDate.getFullYear();
      const mm = String(futureDate.getMonth() + 1).padStart(2, '0');
      const dd = String(futureDate.getDate()).padStart(2, '0');
      dates.push({
        fullDate: `${yyyy}-${mm}-${dd}`,
        displayDate: futureDate.toLocaleDateString('en-US', options),
      });
    }

    return dates;
  };

  // Fetch booked slots for a specific date
  const fetchBookedSlots = async (date, complaint) => {
    setFetchingSlots(true);
    
    try {
      const response = await fetch(
  buildApiUrl(`/api/appointment/booked-slots/${date}/${encodeURIComponent(
    complaint.toLowerCase()
  )}`),
        {
          method: 'GET',
          headers: {                
            'Content-Type': 'application/json',
          },
        }
      );
      const data = await response.json();

      if (data.success) {
        return {
          bookedSlots: data.bookedSlots || {},
          maxSlotsPerTime: Number.isFinite(data.maxSlotsPerTime) ? data.maxSlotsPerTime : 1,
        };
} else {
  console.warn("Booked-slots API returned failure, using default slots");
  return { bookedSlots: {}, maxSlotsPerTime: 1 };
}

    } catch (error) {
      console.error('Error fetching booked slots:', error);
      console.warn("Booked-slots API not found, continuing with default slots");
      setErrorMessage('Unable to connect to server. Please try again later.');
      return { bookedSlots: {}, maxSlotsPerTime: 1 };
    } finally {
      setFetchingSlots(false);
    }
  };

  // Event handlers
  const handleComplaintChange = (value) => {
    setChiefComplaint(value);
    setShowGeneralInput(value === 'General');
    if (value !== 'General') {
      setGeneralInput('');
    }
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleShowDates = () => {
    if (!chiefComplaint) {
      setErrorMessage('Please select a chief complaint first!');
      return;
    }
    setErrorMessage('');
    setShowDateSelection(true);
    setSelectedDate('');
    setSelectedSlot(null);
    setAvailableSlots({});
  };

  const handleDateSelection = async (dateStr) => {
    // Block weekends for both booking + reschedule.
    const dateObj = new Date(dateStr);
    const day = dateObj.getDay();
    if (Number.isNaN(dateObj.getTime())) {
      setErrorMessage('Please select a valid date.');
      return;
    }
    if (day === 0 || day === 6) {
      setErrorMessage('Weekend slots are not available. Please select a weekday.');
      setSelectedDate('');
      setSelectedSlot(null);
      setAvailableSlots({});
      return;
    }

    if (errorMessage) {
      setErrorMessage('');
    }

    setSelectedDate(dateStr);
    setSelectedSlot(null);
    
    // Fetch booked slots for the selected date
    const { bookedSlots, maxSlotsPerTime: serverCapacity } = await fetchBookedSlots(
      dateStr,
      chiefComplaint
    );
    setMaxSlotsPerTime(serverCapacity || 1);
    
    // Generate all possible time slots
    const allSlots = generateTimeSlots();
    const schedule = {};

    // Hide past slots for the current day (local time)
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yyyy = todayLocal.getFullYear();
    const mm = String(todayLocal.getMonth() + 1).padStart(2, '0');
    const dd = String(todayLocal.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Mark slots as available or unavailable based on booking count
    allSlots.forEach((slot) => {
      // If booking for today, don't show slots that are already in the past
      if (dateStr === todayStr && slot.start <= nowMinutes) {
        return;
      }
      const bookedCount = bookedSlots[slot.time] || 0;
      schedule[slot.time] = bookedCount < (serverCapacity || 1);
    });

    setAvailableSlots(schedule);
  };

  const handleSlotSelection = (time) => {
    if (availableSlots[time]) { // Only allow selection if slot is available
      setSelectedSlot({ time, date: selectedDate });
    }
  };

  const handleBookingConfirmation = () => {
    if (selectedSlot) {
      setShowConfirmationModal(true);
    }
  };

  // Fetch patient email from backend
  const fetchPatientEmail = async () => {
    setFetchingEmail(true);
    try {
      const response = await fetch(buildApiUrl(`/api/auth/email-retrieve/${patientId}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setPatientEmail(data.email);
      } else {
        setErrorMessage('Failed to load patient information.');
      }
    } catch (error) {
      console.error('Error fetching patient email:', error);
      setErrorMessage('Unable to connect to server. Please try again later.');
    } finally {
      setFetchingEmail(false);
    }
  };

  const proceedBooking = async () => {
    setShowConfirmationModal(false);
    setIsLoading(true);
    
    if (selectedSlot) {
      let finalComplaint = chiefComplaint;
      if (chiefComplaint === 'General') {
        finalComplaint = generalInput.trim() || 'General (No specific details provided)';
      }

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        // API call to save appointment to backend
        const response = await fetch(buildApiUrl('/api/appointment/appointments'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            patientId,
            patientEmail,
            chiefComplaint: finalComplaint,
            appointmentDate: selectedSlot.date,
            appointmentTime: selectedSlot.time,
          }),
          signal: abortControllerRef.current.signal,
        });

        let data = null;
        try {
          data = await response.json();
        } catch (e) {
          console.error('Failed to parse booking response JSON', e);
        }

        console.log('Booking response:', response.status, data);

        const bookingSuccess =
          response.ok &&
          data &&
          (data.success === true || !!data.appointment);

        if (bookingSuccess) {
          setBookingConfirmed(true);
          setAssignedDoctorName(
            (data.appointment && data.appointment.doctorName) || ''
          );
          setBookingId(
            (data.appointment && data.appointment.bookingId) ||
              data.bookingId ||
              ''
          );
          setErrorMessage('');

          // If this booking was initiated as a reschedule, cancel the old booking
          if (rescheduleState?.reschedule && rescheduleState?.oldAppointmentId) {
            try {
              await fetch(
                buildApiUrl(`/api/appointment/${rescheduleState.oldAppointmentId}/cancel`),
                {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ patientId }),
                }
              );
            } catch (cancelErr) {
              console.warn('Failed to cancel old appointment during reschedule', cancelErr);
            }
          }
        } else {
          const detailedMessage =
            (data && data.error && (data.error.message || data.error)) ||
            (data && data.message) ||
            'Booking failed. Please try again.';
          setErrorMessage(detailedMessage);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          setErrorMessage('Booking failed. Please try again.');
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  const cancelBooking = () => {
    setShowConfirmationModal(false);
  };

  const handleSuccessOk = () => {
    navigate('/patient-dashboard');
  };

  // Get final complaint text for display
  const getFinalComplaint = () => {
    if (chiefComplaint === 'General') {
      return generalInput.trim() || 'General (No specific details provided)';
    }
    return chiefComplaint;
  };

  const upcomingDates = generateUpcomingDates(5);
  const availableTimes = Object.keys(availableSlots).sort((a, b) => {
    const parse = t => {
      let [h, mS] = t.split(':');
      let [m, ap] = mS.split(' ');
      h = parseInt(h);
      m = parseInt(m);
      if (ap === 'PM' && h !== 12) h += 12;
      if (ap === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };
    return parse(a) - parse(b);
  });

  console.log('RENDER UI', {showDateSelection, errorMessage, fetchingSlots});
  return (
    <div className='slot-body'>
      <div className="slot-booking-container">
        <h1 className="slot-booking-heading">Book Your Slot</h1>

        {fetchingEmail && (
          <div className="loading-state">
            <p className="loading-text">Loading your information...</p>
          </div>
        )}

        {!fetchingEmail && !bookingConfirmed ? (
          <>
            {/* Patient Information Section */}
            <div className="patient-info-section">
              <p className="patient-info">
                <strong>Patient ID:</strong> {patientId || 'Not available'}
              </p>
              <p className="patient-info">
                <strong>Email:</strong> {patientEmail || 'Not available'}
              </p>
            </div>

            {/* Chief Complaint Section */}
            <div className="complaint-section">
              <label className="complaint-label">Chief Complaint:</label>
              <div className="complaint-options-grid">
                {complaintOptions.map((option) => (
                  <label key={option} className="complaint-option">
                    <input
                      type="radio"
                      name="chiefComplaint"
                      value={option}
                      checked={chiefComplaint === option}
                      onChange={(e) => handleComplaintChange(e.target.value)}
                      className="complaint-radio"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              
              {showGeneralInput && (
                <input
                  type="text"
                  value={generalInput}
                  onChange={(e) => setGeneralInput(e.target.value)}
                  placeholder="e.g., tooth pain, swelling, bleeding gums"
                  className="general-input"
                  maxLength={200}
                />
              )}
            </div>

            {/* Show Dates Button */}
            {!isRescheduleFlow && (
              <button
                onClick={handleShowDates}
                className="show-dates-button"
                disabled={isLoading || !patientEmail}
              >
                {showDateSelection ? "Select Another Date" : "Show Available Dates"}
              </button>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="error-message">
                <p className="error-title">Error!</p>
                <p>{errorMessage}</p>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="loading-state">
                <p className="loading-text">Processing...</p>
                <p>Please wait while we book your appointment.</p>
              </div>
            )}

            {/* Fetching Slots State */}
            {fetchingSlots && (
              <div className="loading-state">
                <p className="loading-text">Checking available slots...</p>
              </div>
            )}

            {/* Date Selection */}
            {showDateSelection && !errorMessage && !fetchingSlots && (
              <div className="date-selection-section">
                <p className="date-selection-title">Select a Date:</p>
                {isRescheduleFlow ? (
                  <input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleDateSelection(e.target.value)}
                    className="general-input slot-date-input"
                    aria-label="Select appointment date"
                  />
                ) : (
                  <div className="date-grid">
                    {upcomingDates.map((date) => (
                      <div
                        key={date.fullDate}
                        onClick={() => handleDateSelection(date.fullDate)}
                        className={`date-item ${selectedDate === date.fullDate ? 'selected-date' : ''}`}
                      >
                        <span>{date.displayDate}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Time Slots */}
            {selectedDate && !fetchingSlots && (
              <div className="time-slots-section">
                <p className="time-slots-title">Available Slots for {selectedDate}:</p>
                {availableTimes.length === 0 ? (
                  <p className="no-slots-message">No available slots for {selectedDate}.</p>
                ) : (
                  <div className="slots-grid">
                    {availableTimes.map((time) => {
                      const isSelected = selectedSlot?.time === time;
                      const isAvailable = availableSlots[time];
                      return (
                        <div
                          key={time}
                          onClick={() => handleSlotSelection(time)}
                          className={`slot-item ${isSelected ? 'selected-slot' : ''} ${
                            !isAvailable ? 'unavailable-slot' : ''
                          }`}
                          title={!isAvailable ? 'This slot is already booked' : ''}
                        >
                          <span>{time}</span>
                          {!isAvailable && <span className="slot-full-badge">Booked</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Book Now Button */}
            {selectedSlot && (
              <button
                onClick={handleBookingConfirmation}
                className="book-now-button"
                disabled={isLoading || !patientEmail}
                ref={bookNowButtonRef}
                type="button"
              >
                {isLoading ? 'Booking...' : 'Book Your Slot'}
              </button>
            )}
          </>
        ) : (
          /* Booking Confirmed */
          !fetchingEmail && (
            <div className="booking-confirmed-section">
              <div className="confirmed-complaint">
                <label className="complaint-label">Chief Complaint:</label>
                <p className="complaint-value">{getFinalComplaint()}</p>
              </div>
              
              <div className="success-message">
                <p className="success-title">✅ Booking Confirmed!</p>
                <p className="booking-details">
                  For: <span className="highlight">{getFinalComplaint()}</span> on{' '}
                  <span className="highlight">{selectedSlot?.date}</span> at{' '}
                  <span className="highlight">{selectedSlot?.time}</span>
                </p>
                <p className="booking-note">
                  A confirmation email has been sent to {patientEmail}. 
                  A doctor will be assigned based on availability.
                </p>
                {assignedDoctorName && (
                  <p className="booking-note">
                    Assigned Doctor: <span className="highlight">{assignedDoctorName}</span>
                  </p>
                )}
                <p className="booking-id">
                  Booking ID: <span className="highlight">{bookingId}</span>
                </p>
                <p className="redirect-message">
                  Click OK to go to your dashboard.
                </p>
                <button
                  onClick={handleSuccessOk}
                  className="confirm-button"
                  type="button"
                >
                  OK
                </button>
              </div>
            </div>
          )
        )}

        {/* Confirmation Modal */}
        {showConfirmationModal && (
          <div className="modal-overlay">
            <div className="modal-content" ref={confirmationModalRef} tabIndex={-1}>
              <h2 className="modal-title">Confirm Your Booking</h2>
              <p className="modal-detail">
                Complaint: <span className="modal-highlight">{getFinalComplaint()}</span>
              </p>
              <p className="modal-detail">
                Date: <span className="modal-highlight">{selectedSlot?.date}</span>
              </p>
              <p className="modal-detail">
                Time: <span className="modal-highlight">{selectedSlot?.time}</span>
              </p>
              <p className="modal-detail">
                Email: <span className="modal-highlight">{patientEmail}</span>
              </p>
              <div className="modal-buttons">
                <button
                  onClick={proceedBooking}
                  className="confirm-button"
                  disabled={isLoading || !patientEmail}
                  ref={confirmButtonRef}
                  type="button"
                >
                  {isLoading ? 'Confirming...' : 'Yes, Confirm'}
                </button>
                <button
                  onClick={cancelBooking}
                  className="cancel-button"
                  disabled={isLoading}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlotBooking;
