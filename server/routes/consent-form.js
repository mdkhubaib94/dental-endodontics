import express from "express";
import ConsentForm from "../models/ConsentForm.js";

const router = express.Router();

const normalizeDateOnly = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;

  // Accept YYYY-MM-DD from the client and normalize to midnight UTC.
  const parsed = new Date(`${value.trim()}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const extractBase64Payload = (value) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  const commaIndex = trimmed.indexOf(",");
  if (trimmed.startsWith("data:") && commaIndex >= 0) {
    return trimmed.slice(commaIndex + 1);
  }

  return trimmed;
};

const estimateDecodedBytes = (base64Payload) => {
  if (!base64Payload) return 0;
  const sanitized = base64Payload.replace(/\s/g, "");
  return Math.floor((sanitized.length * 3) / 4);
};

router.post("/", async (req, res) => {
  try {
    const {
      patientId,
      patientName,
      date,
      agreed,
      signatureImage,
      videoConsentData,
      videoConsentUrl,
      videoMimeType,
      notes,
    } = req.body || {};

    if (!patientName || typeof patientName !== "string" || !patientName.trim()) {
      return res.status(400).json({
        success: false,
        message: "patientName is required",
      });
    }

    const consentDate = normalizeDateOnly(date);
    if (!consentDate) {
      return res.status(400).json({
        success: false,
        message: "A valid date in YYYY-MM-DD format is required",
      });
    }

    if (agreed !== true) {
      return res.status(400).json({
        success: false,
        message: "Consent checkbox must be accepted",
      });
    }

    if (!signatureImage || typeof signatureImage !== "string") {
      return res.status(400).json({
        success: false,
        message: "signatureImage is required",
      });
    }

    const hasVideoData = typeof videoConsentData === "string" && videoConsentData.trim().length > 0;
    const hasVideoUrl = typeof videoConsentUrl === "string" && videoConsentUrl.trim().length > 0;

    if (!hasVideoData && !hasVideoUrl) {
      return res.status(400).json({
        success: false,
        message: "Either videoConsentData or videoConsentUrl is required",
      });
    }

    if (hasVideoUrl && String(videoConsentUrl).startsWith("blob:") && !hasVideoData) {
      return res.status(400).json({
        success: false,
        message:
          "blob: video URL cannot be stored server-side. Send videoConsentData (base64) or a persistent uploaded URL.",
      });
    }

    // Protect MongoDB document limit with conservative payload checks.
    const signatureBytes = estimateDecodedBytes(extractBase64Payload(signatureImage));
    if (signatureBytes > 2 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        message: "Signature image is too large. Keep it below 2MB.",
      });
    }

    if (hasVideoData) {
      const videoBytes = estimateDecodedBytes(extractBase64Payload(videoConsentData));
      if (videoBytes > 12 * 1024 * 1024) {
        return res.status(413).json({
          success: false,
          message: "Video consent data is too large. Keep it below 12MB.",
        });
      }
    }

    const consent = await ConsentForm.create({
      patientId: typeof patientId === "string" && patientId.trim() ? patientId.trim() : null,
      patientName: patientName.trim(),
      consentDate,
      agreed: true,
      signatureImage,
      videoConsentData: hasVideoData ? videoConsentData : null,
      videoConsentUrl: hasVideoUrl ? videoConsentUrl.trim() : null,
      videoMimeType:
        typeof videoMimeType === "string" && videoMimeType.trim()
          ? videoMimeType.trim()
          : "video/webm",
      notes: typeof notes === "string" ? notes.trim() : "",
    });

    return res.status(201).json({
      success: true,
      message: "Consent form submitted successfully",
      consent,
    });
  } catch (error) {
    console.error("Error saving consent form:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save consent form",
      error: error.message,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

    const filter = {};

    if (typeof req.query.patientId === "string" && req.query.patientId.trim()) {
      filter.patientId = req.query.patientId.trim();
    }

    if (typeof req.query.search === "string" && req.query.search.trim()) {
      filter.patientName = { $regex: req.query.search.trim(), $options: "i" };
    }

    const skip = (page - 1) * limit;

    const [consents, total] = await Promise.all([
      ConsentForm.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ConsentForm.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      consents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    console.error("Error fetching consent forms:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch consent forms",
      error: error.message,
    });
  }
});

router.get("/patient/:patientId", async (req, res) => {
  try {
    const patientId = String(req.params.patientId || "").trim();
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "patientId is required",
      });
    }

    const consents = await ConsentForm.find({ patientId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      consents,
    });
  } catch (error) {
    console.error("Error fetching patient consent forms:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch patient consent forms",
      error: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const consent = await ConsentForm.findById(req.params.id);

    if (!consent) {
      return res.status(404).json({
        success: false,
        message: "Consent form not found",
      });
    }

    return res.status(200).json({
      success: true,
      consent,
    });
  } catch (error) {
    console.error("Error fetching consent form:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch consent form",
      error: error.message,
    });
  }
});

export default router;
