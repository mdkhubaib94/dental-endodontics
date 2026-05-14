const PATIENT_ID_KEYS = ['CurrentpatientId', 'currentPatientId', 'patientId'];

export const getStoredPatientId = () => {
  for (const key of PATIENT_ID_KEYS) {
    const value = String(localStorage.getItem(key) || '').trim();
    if (value) return value;
  }

  return '';
};

export const setStoredPatientId = (patientId) => {
  const normalizedId = String(patientId || '').trim();

  if (!normalizedId) {
    PATIENT_ID_KEYS.forEach((key) => localStorage.removeItem(key));
    return '';
  }

  PATIENT_ID_KEYS.forEach((key) => localStorage.setItem(key, normalizedId));
  return normalizedId;
};
