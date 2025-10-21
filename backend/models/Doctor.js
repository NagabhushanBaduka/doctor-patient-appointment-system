import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  specialization: String,
  availability: [
    {
      date: String,
      time: String
    }
  ]
});

export default mongoose.model("Doctor", doctorSchema);
