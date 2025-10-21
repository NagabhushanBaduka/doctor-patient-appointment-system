const mongoose = require('mongoose');

const appointmentSchema = mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    date: {
        type: Date,
        required: true,
    },
    timeSlot: {
        type: String,
        required: true,
    },
    duration: {
        type: Number,
        default: 30, // 30 minutes
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
        default: 'pending',
    },
    notes: {
        type: String,
    },
}, {
    timestamps: true,
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
