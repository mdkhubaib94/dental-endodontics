export const GENERAL_CASE_XRAY_STORAGE_KEY = 'currentGeneralCaseXray';

const XRAY_DATA_URL_PATTERN = /^data:image\/(png|jpeg|jpg);base64,/i;

const normalizePatientId = (value) => String(value || '').trim();

const safeParse = (rawValue) => {
  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
};

export const clearStoredGeneralCaseXray = () => {
  localStorage.removeItem(GENERAL_CASE_XRAY_STORAGE_KEY);
};

export const storeGeneralCaseXray = ({ patientId = '', imageDataUrl = '', sourceCaseId = '' } = {}) => {
  const normalizedPatientId = normalizePatientId(patientId);
  const normalizedImageDataUrl = String(imageDataUrl || '').trim();

  if (!normalizedImageDataUrl || !XRAY_DATA_URL_PATTERN.test(normalizedImageDataUrl)) {
    clearStoredGeneralCaseXray();
    return;
  }

  localStorage.setItem(
    GENERAL_CASE_XRAY_STORAGE_KEY,
    JSON.stringify({
      patientId: normalizedPatientId,
      imageDataUrl: normalizedImageDataUrl,
      sourceCaseId: String(sourceCaseId || '').trim(),
      cachedAt: new Date().toISOString(),
    })
  );
};

export const readStoredGeneralCaseXray = (patientId = '') => {
  const raw = localStorage.getItem(GENERAL_CASE_XRAY_STORAGE_KEY);
  if (!raw) return null;

  const parsed = safeParse(raw);
  if (!parsed || typeof parsed !== 'object') return null;

  const storedPatientId = normalizePatientId(parsed.patientId);
  const requestedPatientId = normalizePatientId(patientId);
  const imageDataUrl = String(parsed.imageDataUrl || '').trim();

  if (!imageDataUrl || !XRAY_DATA_URL_PATTERN.test(imageDataUrl)) return null;
  if (requestedPatientId && storedPatientId && requestedPatientId !== storedPatientId) return null;

  return {
    patientId: storedPatientId,
    imageDataUrl,
    sourceCaseId: String(parsed.sourceCaseId || '').trim(),
    cachedAt: parsed.cachedAt || '',
  };
};
