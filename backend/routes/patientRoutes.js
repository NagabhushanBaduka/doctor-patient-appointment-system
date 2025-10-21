const express = require('express');
const router = express.Router();
const { protect, patient } = require('../middleware/authMiddleware');
const { 
    bookAppointment, 
    getPatientAppointments, 
    cancelPatientAppointment, 
    getAvailableDoctors, 
    getDoctorAvailability,
    getDoctorTimeSlots
} = require('../controllers/patientController');
const { 
    getPatientProfile, 
    updatePatientProfile 
} = require('../controllers/authController'); // Using authController for profile for now

router.route('/doctors')
    .get(protect, patient, getAvailableDoctors);

router.route('/doctors/:id/availability')
    .get(protect, patient, getDoctorAvailability);

router.route('/doctors/:id/time-slots')
    .get(protect, patient, getDoctorTimeSlots);

router.route('/appointments')
    .post(protect, patient, bookAppointment)
    .get(protect, patient, getPatientAppointments);

router.route('/appointments/:id/cancel')
    .put(protect, patient, cancelPatientAppointment);

router.route('/profile')
    .get(protect, patient, getPatientProfile)
    .put(protect, patient, updatePatientProfile);

module.exports = router;
