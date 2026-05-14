import mongoose from "mongoose";

const assignmentStateSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    counter: {
      type: Number,
      required: true,
      default: -1,
    },
  },
  {
    timestamps: true,
  }
);

export const AssignmentState =
  mongoose.models.AssignmentState ||
  mongoose.model("AssignmentState", assignmentStateSchema, "assignment_states");

export default AssignmentState;
