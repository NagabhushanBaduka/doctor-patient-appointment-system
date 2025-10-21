const express = require('express');
const router = express.Router();
const { registerUser, authUser, authAdmin, getPatients, deletePatient, getPatientProfile, updatePatientProfile } = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/admin/login', authAdmin);

router.route('/profile')
    .get(protect, getPatientProfile)
    .put(protect, updatePatientProfile);

router.route('/patients')
    .get(protect, admin, getPatients);

router.route('/patients/:id')
    .delete(protect, admin, deletePatient);

module.exports = router;
