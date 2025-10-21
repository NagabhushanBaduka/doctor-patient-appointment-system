const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// @desc    Get all doctors
// @route   GET /api/doctors
// @access  Private/Admin
const getDoctors = asyncHandler(async (req, res) => {
    const doctors = await User.find({ role: 'doctor' });
    res.json(doctors);
});

// @desc    Add a new doctor
// @route   POST /api/doctors
// @access  Private/Admin
const addDoctor = asyncHandler(async (req, res) => {
    const { name, email, password, specialization, bio, contactNumber } = req.body;

    const doctorExists = await User.findOne({ email });

    if (doctorExists) {
        res.status(400);
        throw new Error('Doctor with this email already exists');
    }

    const doctor = await User.create({
        name,
        email,
        password,
        role: 'doctor',
        specialization,
        bio,
        contactNumber,
    });

    if (doctor) {
        res.status(201).json({
            _id: doctor._id,
            name: doctor.name,
            email: doctor.email,
            role: doctor.role,
        });
    } else {
        res.status(400);
        throw new Error('Invalid doctor data');
    }
});

// @desc    Update doctor details
// @route   PUT /api/doctors/:id
// @access  Private/Admin
const updateDoctor = asyncHandler(async (req, res) => {
    const { name, email, specialization, bio, contactNumber } = req.body;

    const doctor = await User.findById(req.params.id);

    if (doctor) {
        doctor.name = name || doctor.name;
        doctor.email = email || doctor.email;
        doctor.specialization = specialization || doctor.specialization;
        doctor.bio = bio || doctor.bio;
        doctor.contactNumber = contactNumber || doctor.contactNumber;
        // Password update would be handled separately or require current password for security

        const updatedDoctor = await doctor.save();

        res.json({
            _id: updatedDoctor._id,
            name: updatedDoctor.name,
            email: updatedDoctor.email,
            role: updatedDoctor.role,
            specialization: updatedDoctor.specialization,
            bio: updatedDoctor.bio,
            contactNumber: updatedDoctor.contactNumber,
        });
    } else {
        res.status(404);
        throw new Error('Doctor not found');
    }
});

// @desc    Delete a doctor
// @route   DELETE /api/doctors/:id
// @access  Private/Admin
const deleteDoctor = asyncHandler(async (req, res) => {
    const doctor = await User.findById(req.params.id);

    if (doctor) {
        await doctor.deleteOne();
        res.json({ message: 'Doctor removed' });
    } else {
        res.status(404);
        throw new Error('Doctor not found');
    }
});

// @desc    Approve a doctor (e.g., after initial registration)
// @route   PUT /api/doctors/:id/approve
// @access  Private/Admin
const approveDoctor = asyncHandler(async (req, res) => {
    const doctor = await User.findById(req.params.id);

    if (doctor) {
        doctor.isApproved = true; // Assuming a field 'isApproved' in User model
        const updatedDoctor = await doctor.save();
        res.json({
            _id: updatedDoctor._id,
            name: updatedDoctor.name,
            email: updatedDoctor.email,
            isApproved: updatedDoctor.isApproved,
        });
    } else {
        res.status(404);
        throw new Error('Doctor not found');
    }
});

// @desc    Get single doctor by ID (for Admin)
// @route   GET /api/admin/doctors/:id
// @access  Private/Admin
const getDoctorById = asyncHandler(async (req, res) => {
    const doctor = await User.findById(req.params.id).select('-password');

    if (doctor && doctor.role === 'doctor') {
        res.json(doctor);
    } else {
        res.status(404);
        throw new Error('Doctor not found or not a doctor');
    }
});

// @desc    Get doctor profile
// @route   GET /api/doctors/profile
// @access  Private/Doctor
const getDoctorProfile = asyncHandler(async (req, res) => {
    const doctor = await User.findById(req.user._id).select('-password');

    if (doctor && doctor.role === 'doctor') {
        res.json(doctor);
    } else {
        res.status(404);
        throw new Error('Doctor not found');
    }
});

// @desc    Get weekly availability (fallback schedule)
// @route   GET /api/doctors/weekly-availability
// @access  Private/Doctor
const getWeeklyAvailability = asyncHandler(async (req, res) => {
    const doctor = await User.findById(req.user._id).select('-password');

    if (doctor && doctor.role === 'doctor') {
        // Seed defaults if missing keys; Sat/Sun disabled by default
        const defaults = {
            isEnabled: true,
            workingHours: { startTime: '10:00', endTime: '17:00', lunchStart: '12:00', lunchEnd: '14:00' }
        };
        const disabledDefaults = { ...defaults, isEnabled: false };
        if (!doctor.weeklyAvailability) doctor.weeklyAvailability = {};
        doctor.weeklyAvailability.monday = doctor.weeklyAvailability.monday || { ...defaults };
        doctor.weeklyAvailability.tuesday = doctor.weeklyAvailability.tuesday || { ...defaults };
        doctor.weeklyAvailability.wednesday = doctor.weeklyAvailability.wednesday || { ...defaults };
        doctor.weeklyAvailability.thursday = doctor.weeklyAvailability.thursday || { ...defaults };
        doctor.weeklyAvailability.friday = doctor.weeklyAvailability.friday || { ...defaults };
        doctor.weeklyAvailability.saturday = doctor.weeklyAvailability.saturday || { ...disabledDefaults };
        doctor.weeklyAvailability.sunday = doctor.weeklyAvailability.sunday || { ...disabledDefaults };
        await doctor.save();
        res.json(doctor.weeklyAvailability);
    } else {
        res.status(404);
        throw new Error('Doctor not found');
    }
});

// @desc    Update weekly availability for a specific day
// @route   PUT /api/doctors/weekly-availability/:day
// @access  Private/Doctor
const updateWeeklyAvailabilityDay = asyncHandler(async (req, res) => {
    const { day } = req.params; // expects one of monday..sunday
    const { isEnabled } = req.body;

    const validDays = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    if (!validDays.includes(day)) {
        res.status(400);
        throw new Error('Invalid day');
    }

    const doctor = await User.findById(req.user._id);

    if (doctor && doctor.role === 'doctor') {
        if (!doctor.weeklyAvailability) doctor.weeklyAvailability = {};
        if (!doctor.weeklyAvailability[day]) doctor.weeklyAvailability[day] = {};

        if (typeof isEnabled === 'boolean') {
            doctor.weeklyAvailability[day].isEnabled = isEnabled;
        }
        // Ignore hour updates; hours are fixed 10:00-17:00 by clinic policy

        await doctor.save();
        res.json(doctor.weeklyAvailability[day]);
    } else {
        res.status(404);
        throw new Error('Doctor not found');
    }
});

// @desc    Update doctor profile
// @route   PUT /api/doctors/profile
// @access  Private/Doctor
const updateDoctorProfile = asyncHandler(async (req, res) => {
    const doctor = await User.findById(req.user._id);

    if (doctor && doctor.role === 'doctor') {
        const { name, email, bio, contactNumber } = req.body;

        doctor.name = name || doctor.name;
        doctor.email = email || doctor.email;
        doctor.bio = bio || doctor.bio;
        doctor.contactNumber = contactNumber || doctor.contactNumber;

        const updatedDoctor = await doctor.save();

        res.json({
            _id: updatedDoctor._id,
            name: updatedDoctor.name,
            email: updatedDoctor.email,
            bio: updatedDoctor.bio,
            contactNumber: updatedDoctor.contactNumber,
        });
    } else {
        res.status(404);
        throw new Error('Doctor not found');
    }
});

// @desc    Add doctor availability (disabled - clinic controls schedule)
// @route   POST /api/doctors/availability
// @access  Private/Doctor
const addDoctorAvailability = asyncHandler(async (req, res) => {
    res.status(403);
    throw new Error('Adding dates is disabled. Clinic controls the schedule.');
});

// @desc    Update doctor availability
// @route   PUT /api/doctors/availability
// @access  Private/Doctor
const updateDoctorAvailability = asyncHandler(async (req, res) => {
    const { availabilityId, date } = req.body;

    const doctor = await User.findById(req.user._id);

    if (doctor && doctor.role === 'doctor') {
        const availabilityIndex = doctor.availability.findIndex(avail => avail._id.toString() === availabilityId);

        if (availabilityIndex !== -1) {
            doctor.availability[availabilityIndex].date = date || doctor.availability[availabilityIndex].date;
            const updatedDoctor = await doctor.save();
            res.json(updatedDoctor.availability[availabilityIndex]);
        } else {
            res.status(404);
            throw new Error('Availability entry not found');
        }
    } else {
        res.status(404);
        throw new Error('Doctor not found');
    }
});

// @desc    Delete doctor availability
// @route   DELETE /api/doctors/availability/:id
// @access  Private/Doctor
const deleteDoctorAvailability = asyncHandler(async (req, res) => {
    const doctor = await User.findById(req.user._id);

    if (doctor && doctor.role === 'doctor') {
        doctor.availability = doctor.availability.filter(avail => avail._id.toString() !== req.params.id);
        await doctor.save();
        res.json({ message: 'Availability removed' });
    } else {
        res.status(404);
        throw new Error('Doctor not found');
    }
});

// @desc    Toggle day availability (enable/disable)
// @route   PUT /api/doctors/availability/:id/toggle
// @access  Private/Doctor
const toggleDayAvailability = asyncHandler(async (req, res) => {
    const doctor = await User.findById(req.user._id);

    if (doctor && doctor.role === 'doctor') {
        const availabilityIndex = doctor.availability.findIndex(avail => avail._id.toString() === req.params.id);

        if (availabilityIndex !== -1) {
            doctor.availability[availabilityIndex].isEnabled = !doctor.availability[availabilityIndex].isEnabled;
            const updatedDoctor = await doctor.save();
            res.json(updatedDoctor.availability[availabilityIndex]);
        } else {
            res.status(404);
            throw new Error('Availability entry not found');
        }
    } else {
        res.status(404);
        throw new Error('Doctor not found');
    }
});

// @desc    Update working hours for a specific day
// @route   PUT /api/doctors/availability/:id/working-hours
// @access  Private/Doctor
const updateWorkingHours = asyncHandler(async (req, res) => {
    res.status(403);
    throw new Error('Working hours are fixed (10:00-17:00). Only enable/disable is allowed.');
});

// @desc    Get available time slots for a doctor on a specific date
// @route   GET /api/doctors/availability/:id/time-slots
// @access  Private
const getAvailableTimeSlots = asyncHandler(async (req, res) => {
    const doctor = await User.findById(req.user._id);
    const { date } = req.query;

    if (doctor && doctor.role === 'doctor') {
        const availabilityEntry = doctor.availability.find(avail =>
            new Date(avail.date).toDateString() === new Date(date).toDateString()
        );

        if (availabilityEntry && availabilityEntry.isEnabled) {
            const timeSlots = generateTimeSlots(availabilityEntry.workingHours);
            res.json(timeSlots);
            return;
        }

        // Fall back to weekly availability if no date-specific availability or it's disabled
        const dayOfWeekIndex = new Date(date).getDay(); // 0 (Sun) - 6 (Sat)
        const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayKey = dayMap[dayOfWeekIndex];
        const daySchedule = doctor.weeklyAvailability && doctor.weeklyAvailability[dayKey];

        if (daySchedule && daySchedule.isEnabled) {
            const timeSlots = generateTimeSlots(daySchedule.workingHours);
            res.json(timeSlots);
            return;
        }

        res.status(404);
        throw new Error('No availability found for this date or day is disabled');
    } else {
        res.status(404);
        throw new Error('Doctor not found');
    }
});

// Helper function to generate time slots
const generateTimeSlots = (workingHours) => {
    const slots = [];
    const startTime = workingHours.startTime;
    const endTime = workingHours.endTime;
    const lunchStart = workingHours.lunchStart;
    const lunchEnd = workingHours.lunchEnd;

    // Convert time strings to minutes for easier calculation
    const timeToMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const minutesToTime12Hour = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        const ampm = hours < 12 ? 'AM' : 'PM';
        return `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
    };

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const lunchStartMinutes = timeToMinutes(lunchStart);
    const lunchEndMinutes = timeToMinutes(lunchEnd);

    // Generate slots before lunch
    for (let minutes = startMinutes; minutes < lunchStartMinutes; minutes += 30) {
        slots.push({
            time: minutesToTime12Hour(minutes),
            available: true
        });
    }

    // Generate slots after lunch
    for (let minutes = lunchEndMinutes; minutes < endMinutes; minutes += 30) {
        slots.push({
            time: minutesToTime12Hour(minutes),
            available: true
        });
    }

    return slots;
};

module.exports = {
    getDoctors,
    addDoctor,
    updateDoctor,
    deleteDoctor,
    approveDoctor,
    getDoctorById,
    getDoctorProfile,
    getWeeklyAvailability,
    updateWeeklyAvailabilityDay,
    updateDoctorProfile,
    addDoctorAvailability,
    updateDoctorAvailability,
    deleteDoctorAvailability,
    toggleDayAvailability,
    updateWorkingHours,
    getAvailableTimeSlots,
};
