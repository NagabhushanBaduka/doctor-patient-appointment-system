const asyncHandler = require('express-async-handler');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const user = await User.create({
        name,
        email,
        password,
        role,
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});

// @desc    Auth admin user & get token
// @route   POST /api/users/admin/login
// @access  Public
const authAdmin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    console.log('Admin Login Attempt:', { email, password });

    const user = await User.findOne({ email: email }).select('+password');

    console.log(user)

    if (user) {
        console.log('User found:', user.email);
        const isMatch = await user.matchPassword(password);
        console.log('Password match result:', isMatch);

        if (isMatch) {
            if (user.role !== 'admin') {
                res.status(401);
                throw new Error('Not authorized as an admin');
            }
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(401);
            throw new Error('Invalid email or password');
        }
    } else {
        console.log('User not found for email:', email);
        res.status(401);
        throw new Error('Invalid email or password');
    }
});

// @desc    Get all patients
// @route   GET /api/users/patients
// @access  Private/Admin
const getPatients = asyncHandler(async (req, res) => {
    const patients = await User.find({ role: 'patient' });
    res.json(patients);
});

// @desc    Delete a patient
// @route   DELETE /api/users/patients/:id
// @access  Private/Admin
const deletePatient = asyncHandler(async (req, res) => {
    const patient = await User.findById(req.params.id);

    if (patient && patient.role === 'patient') {
        await User.deleteOne({ _id: req.params.id });
        res.json({ message: 'Patient removed' });
    } else {
        res.status(404);
        throw new Error('Patient not found or not a patient');
    }
});

// @desc    Get patient profile
// @route   GET /api/users/profile
// @access  Private/Patient
const getPatientProfile = asyncHandler(async (req, res) => {
    const patient = await User.findById(req.user._id).select('-password');

    if (patient && patient.role === 'patient') {
        res.json(patient);
    } else {
        res.status(404);
        throw new Error('Patient not found');
    }
});

// @desc    Update patient profile
// @route   PUT /api/users/profile
// @access  Private/Patient
const updatePatientProfile = asyncHandler(async (req, res) => {
    const patient = await User.findById(req.user._id);

    if (patient && patient.role === 'patient') {
        const { name, email } = req.body;

        patient.name = name || patient.name;
        patient.email = email || patient.email;
        // Password update would be handled separately or require current password for security

        const updatedPatient = await patient.save();

        res.json({
            _id: updatedPatient._id,
            name: updatedPatient.name,
            email: updatedPatient.email,
            role: updatedPatient.role,
        });
    } else {
        res.status(404);
        throw new Error('Patient not found');
    }
});

module.exports = {
    registerUser,
    authUser,
    authAdmin,
    getPatients,
    deletePatient,
    getPatientProfile,
    updatePatientProfile,
};
