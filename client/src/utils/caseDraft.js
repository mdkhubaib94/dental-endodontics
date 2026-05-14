import { API_BASE_URL } from '../config/api';

const sanitizeForStorage = (value) => {
  if (value instanceof File) return null;
  if (Array.isArray(value)) return value.map(sanitizeForStorage);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, sanitizeForStorage(val)])
    );
  }
  return value;
};

const getAuthHeaders = () => {
  const token = String(localStorage.getItem('token') || '').trim();
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
};

const getApiUrl = (path) => {
  const base = String(API_BASE_URL || '').trim();
  return `${base}${path}`;
};

export const saveCaseDraft = async ({ patientId, routeKey, step = 0, data = {} }) => {
  const normalizedPatientId = String(patientId || '').trim();
  const normalizedRouteKey = String(routeKey || '').trim();
  if (!normalizedPatientId || !normalizedRouteKey) {
    console.warn('[saveCaseDraft] Missing patientId or routeKey', { normalizedPatientId, normalizedRouteKey });
    return;
  }
  const authHeaders = getAuthHeaders();
  if (!authHeaders) {
    console.warn('[saveCaseDraft] No auth headers - check token in localStorage');
    return;
  }

  const payload = {
    patientId: normalizedPatientId,
    routeKey: normalizedRouteKey,
    step: Number.isFinite(step) ? Number(step) : 0,
    data: sanitizeForStorage(data),
  };

  try {
    console.log('[saveCaseDraft] Saving:', { patientId: normalizedPatientId, routeKey: normalizedRouteKey });
    const response = await fetch(getApiUrl('/api/case-drafts'), {
      method: 'PUT',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      // Use keepalive to ensure request completes even if page is unloading
      keepalive: true,
    });
    if (!response.ok) {
      console.warn('[saveCaseDraft] Save failed:', response.status, response.statusText);
    } else {
      console.log('[saveCaseDraft] Saved successfully');
    }
  } catch (error) {
    console.error('[saveCaseDraft] Error:', error);
  }
};

export const loadCaseDraft = async ({ patientId, routeKey }) => {
  const normalizedPatientId = String(patientId || '').trim();
  const normalizedRouteKey = String(routeKey || '').trim();
  if (!normalizedPatientId || !normalizedRouteKey) {
    console.warn('[loadCaseDraft] Missing patientId or routeKey', { normalizedPatientId, normalizedRouteKey });
    return null;
  }
  const authHeaders = getAuthHeaders();
  if (!authHeaders) {
    console.warn('[loadCaseDraft] No auth headers - check token in localStorage');
    return null;
  }

  try {
    console.log('[loadCaseDraft] Loading draft:', { patientId: normalizedPatientId, routeKey: normalizedRouteKey });
    const params = new URLSearchParams({
      patientId: normalizedPatientId,
      routeKey: normalizedRouteKey,
    });
    const response = await fetch(getApiUrl(`/api/case-drafts?${params.toString()}`), {
      method: 'GET',
      headers: authHeaders,
    });

    if (!response.ok) {
      console.warn('[loadCaseDraft] Fetch failed:', response.status, response.statusText);
      return null;
    }
    const payload = await response.json();
    if (payload?.draft) {
      console.log('[loadCaseDraft] Draft loaded successfully:', payload.draft);
    } else {
      console.log('[loadCaseDraft] No draft found for this patient/route');
    }
    return payload?.draft || null;
  } catch (error) {
    console.error('[loadCaseDraft] Error:', error);
    return null;
  }
};

export const clearCaseDraft = async ({ patientId, routeKey }) => {
  const normalizedPatientId = String(patientId || '').trim();
  const normalizedRouteKey = String(routeKey || '').trim();
  if (!normalizedPatientId || !normalizedRouteKey) return;
  const authHeaders = getAuthHeaders();
  if (!authHeaders) return;

  try {
    const params = new URLSearchParams({
      patientId: normalizedPatientId,
      routeKey: normalizedRouteKey,
    });
    await fetch(getApiUrl(`/api/case-drafts?${params.toString()}`), {
      method: 'DELETE',
      headers: authHeaders,
    });
  } catch {
    // Best-effort cleanup.
  }
};

export const getPatientResumeTarget = async (patientId) => {
  const normalizedPatientId = String(patientId || '').trim();
  if (!normalizedPatientId) return null;
  const authHeaders = getAuthHeaders();
  if (!authHeaders) return null;

  try {
    const response = await fetch(
      getApiUrl(`/api/case-drafts/last/${encodeURIComponent(normalizedPatientId)}`),
      {
        method: 'GET',
        headers: authHeaders,
      }
    );
    if (!response.ok) return null;

    const payload = await response.json();
    const resumeTarget = payload?.resumeTarget;
    if (!resumeTarget?.routeKey) return null;

    return {
      routeKey: resumeTarget.routeKey,
      step: Number.isFinite(resumeTarget.step) ? Number(resumeTarget.step) : 0,
    };
  } catch {
    return null;
  }
};

export const getDashboardRouteForCurrentUser = () => {
  const role = String(localStorage.getItem('role') || '').trim().toLowerCase();
  if (role === 'pg') return '/pg-dashboard';
  if (role === 'chief' || role === 'chief-doctor') return '/chief-doctor-dashboard';
  return '/doctor-dashboard';
};
