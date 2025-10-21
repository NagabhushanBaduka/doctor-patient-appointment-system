const asyncHandler = require('express-async-handler');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

// @desc    Get all appointments (for Admin)
// @route   GET /api/appointments
// @access  Private/Admin
const getAppointments = asyncHandler(async (req, res) => {
    const appointments = await Appointment.find({})
        .populate('patient', 'name email')
        .populate('doctor', 'name email');
    res.json(appointments);
});

// @desc    Update appointment status (cancel/reassign for Admin)
// @route   PUT /api/appointments/:id
// @access  Private/Admin
const updateAppointment = asyncHandler(async (req, res) => {
    const { status, doctorId } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (appointment) {
        if (status) {
            appointment.status = status;
        }
        if (doctorId) {
            const doctor = await User.findById(doctorId);
            if (doctor && doctor.role === 'doctor') {
                appointment.doctor = doctorId;
            } else {
                res.status(404);
                throw new Error('Doctor not found');
            }
        }

        const updatedAppointment = await appointment.save();

        res.json(updatedAppointment);
    } else {
        res.status(404);
        throw new Error('Appointment not found');
    }
});

// @desc    Delete an appointment (for Admin)
// @route   DELETE /api/appointments/:id
// @access  Private/Admin
const deleteAppointment = asyncHandler(async (req, res) => {
    const appointment = await Appointment.findById(req.params.id);

    if (appointment) {
        await appointment.deleteOne();
        res.json({ message: 'Appointment removed' });
    } else {
        res.status(404);
        throw new Error('Appointment not found');
    }
});

// @desc    Get appointment by ID (for Admin)
// @route   GET /api/appointments/:id
// @access  Private/Admin
const getAppointmentById = asyncHandler(async (req, res) => {
    const appointment = await Appointment.findById(req.params.id)
        .populate('patient', 'name email')
        .populate('doctor', 'name email');

    if (appointment) {
        res.json(appointment);
    } else {
        res.status(404);
        throw new Error('Appointment not found');
    }
});

// @desc    Get appointments for a specific doctor
// @route   GET /api/doctors/myappointments
// @access  Private/Doctor
const getDoctorAppointments = asyncHandler(async (req, res) => {
    const appointments = await Appointment.find({ doctor: req.user._id })
        .populate('patient', 'name email');
    res.json(appointments);
});

// @desc    Update status of a doctor's appointment (accept/reject/complete)
// @route   PUT /api/doctors/myappointments/:id
// @access  Private/Doctor
const updateDoctorAppointmentStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (appointment && appointment.doctor.toString() === req.user._id.toString()) {
        if (['accepted', 'rejected', 'completed'].includes(status)) {
            appointment.status = status;
            const updatedAppointment = await appointment.save();
            res.json(updatedAppointment);
        } else {
            res.status(400);
            throw new Error('Invalid appointment status');
        }
    } else {
        res.status(404);
        throw new Error('Appointment not found or not authorized');
    }
});

module.exports = {
    getAppointments,
    updateAppointment,
    deleteAppointment,
    getAppointmentById,
    getDoctorAppointments,
    updateDoctorAppointmentStatus,
};
