import mongoose from "mongoose";

const formSubmissionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["contact", "newsletter", "track_order", "account_signup", "other"],
    },
    name: String,
    email: String,
    phone: String,
    subject: String,
    message: String,
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    sourcePath: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

formSubmissionSchema.index({ type: 1, createdAt: -1 });
formSubmissionSchema.index({ read: 1 });

export const FormSubmission =
  mongoose.models.FormSubmission || mongoose.model("FormSubmission", formSubmissionSchema);
