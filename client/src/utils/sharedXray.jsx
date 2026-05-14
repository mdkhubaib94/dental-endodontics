const SHARED_XRAY_PREFIX = 'sharedXrayImage:';
const SHARED_XRAY_LAST_KEY = 'sharedXrayImage:last';

export const getCurrentPatientId = () => {
  const candidates = [
    localStorage.getItem('CurrentpatientId'),
    localStorage.getItem('currentPatientId'),
    localStorage.getItem('patientId'),
  ];

  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (value) return value;
  }

  return '';
};

const getSharedXrayKey = (patientId) => `${SHARED_XRAY_PREFIX}${patientId}`;

export const saveSharedXrayImage = (patientId, payload) => {
  if (!patientId || !payload?.dataUrl) return;

  const record = JSON.stringify({
    dataUrl: payload.dataUrl,
    name: payload.name || 'xray-image',
    type: payload.type || 'image/jpeg',
    size: Number(payload.size || 0),
    uploadedAt: payload.uploadedAt || new Date().toISOString(),
    patientId,
  });

  localStorage.setItem(getSharedXrayKey(patientId), record);
  localStorage.setItem(SHARED_XRAY_LAST_KEY, record);
};

export const getSharedXrayImage = (patientId) => {
  const primaryKey = patientId ? getSharedXrayKey(patientId) : null;
  const raw = (primaryKey ? localStorage.getItem(primaryKey) : null) || localStorage.getItem(SHARED_XRAY_LAST_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.dataUrl) return null;
    return parsed;
  } catch {
    return null;
  }
};
