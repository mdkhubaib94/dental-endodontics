import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { API_BASE_URL } from '../config/api';

// Clean single-component SlotBookingModal (no duplicate imports/exports)
export default function SlotBookingModal({ isOpen, onClose, onSlotBooked, patientId, patientEmail }) {
  const [selectedDateForSlot, setSelectedDateForSlot] = useState('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [maxSlotsPerTime, setMaxSlotsPerTime] = useState(1);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const selectedBg = '#1e3a8a';

  useEffect(() => {
    if (isOpen) {
      const t = new Date();
      setCurrentMonth(t.getMonth());
      setCurrentYear(t.getFullYear());
      setSelectedDateForSlot('');
      setAvailableTimeSlots([]);
      setBookedSlots({});
      setMaxSlotsPerTime(1);
    }
  }, [isOpen]);

  const formatMinutesToTime = (mins) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    const m = minutes < 10 ? '0' + minutes : minutes;
    return `${h}:${m} ${ampm}`;
  };

  const convertTo24HourFormat = (timeStr) => {
    if (!timeStr) return '';
    if (timeStr.includes(':') && !/AM|PM/i.test(timeStr)) return timeStr;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return timeStr;
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  };

  const generateTimeSlots = () => {
    const rawDept = String(
      localStorage.getItem('doctorDepartment') ||
      localStorage.getItem('pgDepartment') ||
      localStorage.getItem('ugDepartment') ||
      ''
    ).trim().toLowerCase().replace(/[\s_]+/g, '');

    const isOralDept = rawDept.includes('oral');

    if (isOralDept) {
      const slotStartsInMinutes = [];
      const lunchStart = 13 * 60;
      const lunchEnd = 14 * 60;
      const breakSlot = 11 * 60;
      for (let t = 9 * 60; t <= 14 * 60; t += 15) {
        if (t >= lunchStart && t < lunchEnd) continue;
        if (t === breakSlot) continue;
        slotStartsInMinutes.push(t);
      }
      return slotStartsInMinutes.map((start) => ({ start, end: start + 15, time: formatMinutesToTime(start) }));
    }

    const slotStartsInMinutes = [9 * 60, 9 * 60 + 30, 10 * 60, 10 * 60 + 30, 11 * 60 + 30, 12 * 60, 12 * 60 + 30, 14 * 60];
    return slotStartsInMinutes.map((start) => ({ start, end: start + 30, time: formatMinutesToTime(start) }));
  };

  const generateCalendarDates = (month, year) => {
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const isCurrentMonth = date.getMonth() === month;
      const isSunday = date.getDay() === 0;
      const isSaturday = date.getDay() === 6;

      const isPast = date < today;
      const isToday = date.getTime() === today.getTime();

      const maxAllowedDays = firstDay.getMonth() === 1
        ? 35
        : (new Date(year, month + 1, 0).getDate() === 31 ? 35 : 34);

      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + maxAllowedDays);

      const isBeyondLimit = date > currentDate;

      dates.push({
        date: new Date(date),
        day: date.getDate(),
        isCurrentMonth,
        isSunday,
        isSaturday,
        isPast,
        isToday,
        isBeyondLimit,
        fullDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,

        isAvailable:
          isCurrentMonth &&
          !isSunday &&
          !isPast &&
          !isBeyondLimit,
      });
    }
    return dates;
  };

  const fetchBookedSlotsForDate = async (date) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/appointment/booked-slots/${date}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.bookedSlots) {
          setBookedSlots(data.bookedSlots || {});
          setMaxSlotsPerTime(Number.isFinite(data.maxSlotsPerTime) ? data.maxSlotsPerTime : 1);
        } else {
          setBookedSlots({});
          setMaxSlotsPerTime(1);
        }
      } else {
        setBookedSlots({});
        setMaxSlotsPerTime(1);
      }
    } catch (err) {
      console.error('Error fetching booked slots:', err);
      setBookedSlots({});
      setMaxSlotsPerTime(1);
    }
  };

  const handleOpenDate = (date) => {
    setSelectedDateForSlot(date);
    const slots = generateTimeSlots();
    setAvailableTimeSlots(slots);
    fetchBookedSlotsForDate(date);
  };

  const navigateCalendar = (direction) => {
    if (direction === 'prev') {
      if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
      else setCurrentMonth(currentMonth - 1);
    } else {
      if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
      else setCurrentMonth(currentMonth + 1);
    }
  };

  const isSlotBooked = (time) => {
    const bookedCount = bookedSlots[time] || 0;
    return bookedCount >= (maxSlotsPerTime || 1);
  };

  const handleSlotSelection = async (date, time) => {
    if (!patientId || (typeof patientId === 'string' && patientId.trim() === '')) {
      alert('Patient ID is missing. Please select a patient first.');
      return;
    }

    try {
      const emailToUse = patientEmail || `${patientId}@temp.com`;
      const appointmentData = { patientId, patientEmail: emailToUse, chiefComplaint: 'Follow ups', appointmentDate: date, appointmentTime: time };
      const response = await fetch(`${API_BASE_URL}/api/appointment/appointments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(appointmentData) });
      if (response.ok) {
        await response.json().catch(() => null);
        const time24 = convertTo24HourFormat(time);
        if (typeof onSlotBooked === 'function') onSlotBooked(date, time24);
        setSelectedDateForSlot('');
        setAvailableTimeSlots([]);
        setBookedSlots({});
        if (typeof onClose === 'function') onClose();
      } else {
        const err = await response.json().catch(() => ({}));
        const msg = (err && err.message) || 'Booking failed';
        alert('Failed to book appointment: ' + msg);
      }
    } catch (err) {
      console.error('Error booking appointment:', err);
      alert('Error booking appointment. Please try again.');
    }
  };

  if (!isOpen) return null;

  const overlay = (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, backgroundColor: 'rgba(41, 51, 160, 0.6)' }}>
      <div style={{ width: '100%', maxWidth: 920, maxHeight: '86vh', overflow: 'auto', margin: '0 12px', background: '#291d57ff', borderRadius: 8, padding: 20 }}>
        <h3 style={{ marginBottom: 16, color: '#fff', textAlign: 'center' }}>Select Next Visit Date & Time</h3>

        {!selectedDateForSlot ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <button type="button" onClick={() => navigateCalendar('prev')} className="calendar-nav-btn">‹</button>
              <div style={{ color: '#fff', fontWeight: 700 }}>{new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
              <button type="button" onClick={() => navigateCalendar('next')} className="calendar-nav-btn">›</button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8 }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} style={{ textAlign: 'center', color: '#ddd', fontWeight: 600 }}>{d}</div>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {generateCalendarDates(currentMonth, currentYear).map((dateObj, idx) => {
                  const isSelectable = dateObj.isAvailable;
                  const isSelectedDate = selectedDateForSlot && dateObj.fullDate === selectedDateForSlot;
                  const isToday = dateObj.isToday;
                  const selectedBg = '#1e3a8a'; // exact blue used by .calendar-nav-btn
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => isSelectable && handleOpenDate(dateObj.fullDate)}
                      disabled={!isSelectable}
                      className={`calendar-date-btn ${isSelectedDate ? 'selected' : ''} ${isSelectable ? 'available' : 'unavailable'} ${isToday ? 'today' : ''}`}
                      style={{
                        padding: 10,
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: (isSelectedDate || isToday)
                          ? selectedBg
                          : 'rgba(255,255,255,0.03)',
                        color: (isSelectedDate || isToday) ? '#fff' : (isSelectable ? '#fff' : 'rgba(255,255,255,0.4)'),
                        cursor: isSelectable ? 'pointer' : 'not-allowed'
                      }}
                    >{dateObj.day}</button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" onClick={() => { if (typeof onClose === 'function') onClose(); }} className="modal-cancel-btn">Cancel</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 12, color: '#fff' }}><strong>Date:</strong> <span style={{ color: '#8fc9ff' }}>{new Date(selectedDateForSlot).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
            <div style={{ marginBottom: 12 }} className="time-slots-container">
              {availableTimeSlots.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {availableTimeSlots.map((slot) => {
                    const isBooked = isSlotBooked(slot.time);
                    const isSelectedTS = selectedTimeSlot === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => {
                          if (isBooked) return;
                          setSelectedTimeSlot(slot.time);
                          handleSlotSelection(selectedDateForSlot, slot.time);
                        }}
                        disabled={isBooked}
                        className={`time-slot-btn ${isSelectedTS ? 'selected' : ''}`}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 6,
                          background: isBooked ? 'rgba(255,0,0,0.12)' : (isSelectedTS ? selectedBg : 'rgba(255,255,255,0.06)'),
                          color: isBooked ? 'rgba(255,255,255,0.5)' : '#fff',
                          border: 'none',
                          cursor: isBooked ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {slot.time}
                        {isBooked && <div style={{ fontSize: 11, opacity: 0.8 }}>Booked</div>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.7)' }}>No time slots available for this date. Please select another date.</div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <button type="button" onClick={() => { setSelectedDateForSlot(''); setAvailableTimeSlots([]); setBookedSlots({}); }} className="modal-cancel-btn">Back to Calendar</button>
              <button type="button" onClick={() => { if (typeof onClose === 'function') onClose(); setSelectedDateForSlot(''); setAvailableTimeSlots([]); setBookedSlots({}); }} className="modal-cancel-btn">Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(overlay, document.body);
}
