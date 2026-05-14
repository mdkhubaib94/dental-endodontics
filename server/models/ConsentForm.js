import mongoose from "mongoose";

const consentFormSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      trim: true,
      index: true,
      default: null,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    consentDate: {
      type: Date,
      required: true,
      index: true,
    },
    agreed: {
      type: Boolean,
      required: true,
      validate: {
        validator: (value) => value === true,
        message: "Consent checkbox must be accepted before submission",
      },
    },
    signatureImage: {
      type: String,
      required: true,
    },
    videoConsentData: {
      type: String,
      default: null,
    },
    videoConsentUrl: {
      type: String,
      trim: true,
      default: null,
    },
    videoMimeType: {
      type: String,
      trim: true,
      default: "video/webm",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

consentFormSchema.index({ patientName: 1, consentDate: -1 });

const ConsentForm =
  mongoose.models.ConsentForm ||
  mongoose.model("ConsentForm", consentFormSchema, "consent_forms");

export default ConsentForm;
export { ConsentForm };
