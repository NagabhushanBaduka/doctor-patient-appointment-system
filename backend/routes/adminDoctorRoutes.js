const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { 
    getDoctors, 
    addDoctor, 
    updateDoctor, 
    deleteDoctor, 
    approveDoctor, 
    getDoctorById
} = require('../controllers/doctorController');

router.route('/')
    .get(protect, admin, getDoctors)
    .post(protect, admin, addDoctor);

router.route('/:id')
    .get(protect, admin, getDoctorById)
    .put(protect, admin, updateDoctor)
    .delete(protect, admin, deleteDoctor);

router.route('/:id/approve')
    .put(protect, admin, approveDoctor);

module.exports = router;
