const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { 
    getAppointments, 
    updateAppointment, 
    deleteAppointment,
    getAppointmentById
} = require('../controllers/appointmentController');

router.route('/')
    .get(protect, admin, getAppointments);

router.route('/:id')
    .get(protect, admin, getAppointmentById)
    .put(protect, admin, updateAppointment)
    .delete(protect, admin, deleteAppointment);

module.exports = router;
