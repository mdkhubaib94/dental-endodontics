// server/models/AppoitmentBooked.js
import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    patientId: {
      type: String,
      required: true,
      index: true, // 🔑 used by My Appointments
    },

    patientEmail: {
      type: String,
      required: true,
    },

    // Reference to the general doctor responsible for this appointment
    generalDoctorId: {
      type: String,
      default: null,
      index: true,
    },

    // Backwards-compatible legacy field
    doctorId: {
      type: String,
      default: null,
    },

    approvedDoctorId: {
      type: String,
      default: null,
    },

    chiefComplaint: {
      type: String,
      required: true,
    },

    appointmentDate: {
      type: String,
      required: true,
    },

    appointmentTime: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "assigned",
        "in_progress",
        "cancelled",
        "reschedule_requested",
        "rescheduled",
        "completed",
        "revisit_scheduled",
        "revisit_pending_approval",
        "revisit_approved",
        "closed",
      ],
      default: "pending",
    },

    isProcessed: {
      type: Boolean,
      default: false,
    },

    originalBookingId: {
      type: String,
      default: null,
    },

    // PG/UG assignment fields (camelCase required by audit)
    assignedPgUgId: {
      type: String,
      default: null,
      index: true,
    },

    // Backwards-compatible legacy field
    assigned_pg_ug_id: {
      type: String,
      default: null,
      index: true,
    },

    pgDoctorId: {
      type: String,
      default: null,
    },

    // Department doctor oversight
    supervisingDeptDoctorId: {
      type: String,
      default: null,
      index: true,
    },

    // Backwards-compatible legacy field
    supervising_dept_doctor_id: {
      type: String,
      default: null,
      index: true,
    },

    deptDoctorId: {
      type: String,
      default: null,
    },

    // Revisit fields
    revisitDate: {
      type: String,
      default: null,
    },

    parentBookingId: {
      type: String,
      default: null,
      index: true,
    },

    // Loop monitoring
    rescheduleLoopCount: {
      type: Number,
      default: 0,
    },

    // Reschedule request fields (for PG-initiated reschedules) - match audit spec
    rescheduleRequest: {
      requestedBy: {
        type: String, // PG Identity
        default: null,
      },
      requestedByName: {
        type: String,
        default: null,
      },
      proposedDate: {
        type: String, // New date requested
        default: null,
      },
      proposedTime: {
        type: String, // New time requested
        default: null,
      },
      reason: {
        type: String,
        default: null,
      },
      requestStatus: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      requestedAt: {
        type: Date,
        default: null,
      },
      reviewedBy: {
        type: String, // Doctor Identity who approved/rejected
        default: null,
      },
      reviewedAt: {
        type: Date,
        default: null,
      },
      iterationCount: {
        type: Number,
        default: 0,
      },
    },
    
    needsGeneralApproval: {
      type: Boolean,
      default: false,
    },

    needsPgApproval: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // ✅ required for sorting by createdAt
  }
);

/*
  ✅ IMPORTANT:
  - Model name MUST be "Appointment"
  - Collection is explicitly forced to "appointments"
  - Prevents model overwrite errors in dev mode
*/
export const Appointment =
  mongoose.models.Appointment ||
  mongoose.model("Appointment", appointmentSchema, "appointments");

export default Appointment;