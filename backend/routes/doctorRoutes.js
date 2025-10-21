const express = require('express');
const router = express.Router();
const { protect, doctor } = require('../middleware/authMiddleware');
const { 
    getDoctorAppointments, 
    updateDoctorAppointmentStatus 
} = require('../controllers/appointmentController');
const { 
    getDoctorProfile, 
    getWeeklyAvailability,
    updateWeeklyAvailabilityDay,
    updateDoctorProfile, 
    addDoctorAvailability, 
    updateDoctorAvailability, 
    deleteDoctorAvailability,
    toggleDayAvailability,
    updateWorkingHours,
    getAvailableTimeSlots
} = require('../controllers/doctorController');

router.route('/myappointments')
    .get(protect, doctor, getDoctorAppointments);

router.route('/myappointments/:id')
    .put(protect, doctor, updateDoctorAppointmentStatus);

router.route('/profile')
    .get(protect, doctor, getDoctorProfile)
    .put(protect, doctor, updateDoctorProfile);

router.route('/weekly-availability')
    .get(protect, doctor, getWeeklyAvailability);

router.route('/weekly-availability/:day')
    .put(protect, doctor, updateWeeklyAvailabilityDay);

router.route('/availability')
    .post(protect, doctor, addDoctorAvailability)
    .put(protect, doctor, updateDoctorAvailability);

router.route('/availability/:id')
    .delete(protect, doctor, deleteDoctorAvailability);

router.route('/availability/:id/toggle')
    .put(protect, doctor, toggleDayAvailability);

router.route('/availability/:id/working-hours')
    .put(protect, doctor, updateWorkingHours);

router.route('/availability/:id/time-slots')
    .get(protect, doctor, getAvailableTimeSlots);

module.exports = router;
