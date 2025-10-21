const asyncHandler = require('express-async-handler');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

// @desc    Get all available doctors for booking
// @route   GET /api/patients/doctors
// @access  Private/Patient
const getAvailableDoctors = asyncHandler(async (req, res) => {
    // Explicitly select fields to include, thereby implicitly excluding password
    const doctors = await User.find({ role: 'doctor', isApproved: true }).select('_id name email specialization');
    console.log("Available doctors fetched:", doctors);
    res.json(doctors);
});

// @desc    Get a specific doctor's availability
// @route   GET /api/patients/doctors/:id/availability
// @access  Private/Patient
const getDoctorAvailability = asyncHandler(async (req, res) => {
    console.log("Fetching availability for doctor ID:", req.params.id);
    const doctor = await User.findById(req.params.id).select('availability weeklyAvailability role');
    console.log("Doctor object in getDoctorAvailability:", doctor);

    if (doctor && doctor.role === 'doctor') {
        // Ensure weeklyAvailability seeded with defaults if missing
        const ensureWeeklyDefaults = () => {
            const defaults = { isEnabled: true, workingHours: { startTime: '10:00', endTime: '17:00', lunchStart: '12:00', lunchEnd: '14:00' } };
            const disabled = { isEnabled: false, workingHours: { startTime: '10:00', endTime: '17:00', lunchStart: '12:00', lunchEnd: '14:00' } };
            if (!doctor.weeklyAvailability) doctor.weeklyAvailability = {};
            if (!doctor.weeklyAvailability.monday) doctor.weeklyAvailability.monday = { ...defaults };
            if (!doctor.weeklyAvailability.tuesday) doctor.weeklyAvailability.tuesday = { ...defaults };
            if (!doctor.weeklyAvailability.wednesday) doctor.weeklyAvailability.wednesday = { ...defaults };
            if (!doctor.weeklyAvailability.thursday) doctor.weeklyAvailability.thursday = { ...defaults };
            if (!doctor.weeklyAvailability.friday) doctor.weeklyAvailability.friday = { ...defaults };
            if (!doctor.weeklyAvailability.saturday) doctor.weeklyAvailability.saturday = { ...disabled };
            if (!doctor.weeklyAvailability.sunday) doctor.weeklyAvailability.sunday = { ...disabled };
        };
        ensureWeeklyDefaults();
        try { await doctor.save(); } catch (e) { /* non-fatal */ }
        console.log("Doctor found for availability:", doctor._id);
        res.json(doctor.availability || []);
    } else {
        console.log("Doctor not found or not a doctor for ID:", req.params.id);
        res.status(404);
        throw new Error('Doctor not found');
    }
});

// @desc    Get available time slots for a doctor on a specific date
// @route   GET /api/patients/doctors/:id/time-slots
// @access  Private/Patient
// Parse date from various common formats into a Date at local midnight
const parseRequestDate = (input) => {
    if (input instanceof Date) return new Date(input.getFullYear(), input.getMonth(), input.getDate());
    if (typeof input !== 'string') return new Date(NaN);
    // Try ISO or YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(input)) {
        const d = new Date(input);
        if (!isNaN(d)) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    // Try DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
        const [dd, mm, yyyy] = input.split('/').map(Number);
        const d = new Date(yyyy, mm - 1, dd);
        if (!isNaN(d)) return d;
    }
    // Try DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(input)) {
        const [dd, mm, yyyy] = input.split('-').map(Number);
        const d = new Date(yyyy, mm - 1, dd);
        if (!isNaN(d)) return d;
    }
    // Fallback to Date parser
    const d = new Date(input);
    if (!isNaN(d)) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return new Date(NaN);
};

const getDoctorTimeSlots = asyncHandler(async (req, res) => {
    const { date } = req.query;
    // Disallow past dates for time slot queries
    const today = new Date();
    const queryDate = parseRequestDate(date);
    today.setHours(0,0,0,0);
    if (isNaN(queryDate)) {
        res.status(400);
        throw new Error('Invalid date format');
    }
    if (queryDate < today) {
        res.status(400);
        throw new Error('Cannot fetch time slots for past dates');
    }
    const doctor = await User.findById(req.params.id).select('availability role');

    if (doctor && doctor.role === 'doctor') {
        const availabilityEntry = doctor.availability.find(avail =>
            new Date(avail.date).toDateString() === queryDate.toDateString()
        );

        let workingHours = null;
        if (availabilityEntry && availabilityEntry.isEnabled) {
            workingHours = availabilityEntry.workingHours;
        } else {
            const dayOfWeekIndex = queryDate.getDay();
            const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayKey = dayMap[dayOfWeekIndex];
            const daySchedule = doctor.weeklyAvailability && doctor.weeklyAvailability[dayKey];
            if (daySchedule && daySchedule.isEnabled) {
                workingHours = daySchedule.workingHours;
            } else {
                // Fallback defaults if weekly availability not present: Mon-Fri enabled, Sat/Sun disabled
                const isWeekend = dayKey === 'saturday' || dayKey === 'sunday';
                if (!isWeekend) {
                    workingHours = { startTime: '10:00', endTime: '17:00', lunchStart: '12:00', lunchEnd: '14:00' };
                }
            }
        }

        if (workingHours) {
            // Get all appointments for this doctor on this date
            const existingAppointments = await Appointment.find({
                doctor: req.params.id,
                date: queryDate,
                status: { $ne: 'cancelled' }
            }).select('timeSlot');

            const bookedTimeSlots = existingAppointments.map(apt => apt.timeSlot);
            
            // Generate available time slots
            const allTimeSlots = generateTimeSlots(workingHours);

            // If date is today, filter out past time slots
            const now = new Date();
            const isToday = queryDate.getTime() === today.getTime();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const timeToMinutes = (timeStr) => {
                const [hours, minutes] = timeStr.split(':');
                const h = Number(hours);
                const m = Number(minutes);
                return h * 60 + m;
            };
            
            // Filter out booked slots
            let availableTimeSlots = allTimeSlots.filter(slot => 
                !bookedTimeSlots.includes(slot.time)
            );
            if (isToday) {
                availableTimeSlots = availableTimeSlots.filter(slot => {
                    // slot.time like "10:30 AM" -> to 24h
                    const [t, mer] = slot.time.split(' ');
                    const [hh, mm] = t.split(':').map(Number);
                    let h24 = hh;
                    if (mer === 'AM' && hh === 12) h24 = 0;
                    if (mer === 'PM' && hh !== 12) h24 = hh + 12;
                    const minutes = h24 * 60 + mm;
                    return minutes > currentMinutes;
                });
            }

            res.json(availableTimeSlots);
        } else {
            res.status(404);
            throw new Error('No availability found for this date or day is disabled');
        }
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

// @desc    Book a new appointment
// @route   POST /api/patients/appointments
// @access  Private/Patient
const bookAppointment = asyncHandler(async (req, res) => {
    const { doctorId, date, timeSlot } = req.body;

    const patientId = req.user._id;

    const doctor = await User.findById(doctorId).select('availability weeklyAvailability role isApproved');

    if (doctor && doctor.role === 'doctor') {
        // Ensure weeklyAvailability seeded with defaults if missing
        const ensureWeeklyDefaults = () => {
            const defaults = { isEnabled: true, workingHours: { startTime: '10:00', endTime: '17:00', lunchStart: '12:00', lunchEnd: '14:00' } };
            const disabled = { isEnabled: false, workingHours: { startTime: '10:00', endTime: '17:00', lunchStart: '12:00', lunchEnd: '14:00' } };
            if (!doctor.weeklyAvailability) doctor.weeklyAvailability = {};
            if (!doctor.weeklyAvailability.monday) doctor.weeklyAvailability.monday = { ...defaults };
            if (!doctor.weeklyAvailability.tuesday) doctor.weeklyAvailability.tuesday = { ...defaults };
            if (!doctor.weeklyAvailability.wednesday) doctor.weeklyAvailability.wednesday = { ...defaults };
            if (!doctor.weeklyAvailability.thursday) doctor.weeklyAvailability.thursday = { ...defaults };
            if (!doctor.weeklyAvailability.friday) doctor.weeklyAvailability.friday = { ...defaults };
            if (!doctor.weeklyAvailability.saturday) doctor.weeklyAvailability.saturday = { ...disabled };
            if (!doctor.weeklyAvailability.sunday) doctor.weeklyAvailability.sunday = { ...disabled };
        };
        ensureWeeklyDefaults();
        try { await doctor.save(); } catch (e) { /* non-fatal */ }
        // Disallow booking for past dates and times
        const now = new Date();
        const bookingDate = parseRequestDate(date);
        const today = new Date();
        today.setHours(0,0,0,0);
        if (isNaN(bookingDate)) {
            res.status(400);
            throw new Error('Invalid date format');
        }
        const dayOfBooking = new Date(bookingDate);
        dayOfBooking.setHours(0,0,0,0);
        if (dayOfBooking < today) {
            res.status(400);
            throw new Error('Cannot book an appointment in the past');
        }
        // Check if the doctor is available on the selected date
        const availabilityEntry = doctor.availability.find(avail =>
            new Date(avail.date).toDateString() === bookingDate.toDateString()
        );

        // Determine working hours using date-specific availability or weekly fallback
        let workingHours = null;
        if (availabilityEntry && availabilityEntry.isEnabled) {
            workingHours = availabilityEntry.workingHours;
        } else {
            const dayOfWeekIndex = bookingDate.getDay();
            const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayKey = dayMap[dayOfWeekIndex];
            const daySchedule = doctor.weeklyAvailability && doctor.weeklyAvailability[dayKey];
            if (daySchedule && daySchedule.isEnabled) {
                workingHours = daySchedule.workingHours;
            } else {
                // Fallback defaults Mon-Fri
                const isWeekend = dayKey === 'saturday' || dayKey === 'sunday';
                if (!isWeekend) {
                    workingHours = { startTime: '10:00', endTime: '17:00', lunchStart: '12:00', lunchEnd: '14:00' };
                }
            }
        }

        // Ensure the doctor is available on the chosen date and day is enabled
        if (workingHours) {
            // Check if patient already has an appointment on this date
            const existingPatientAppointment = await Appointment.findOne({
                patient: patientId,
                date: new Date(date),
                status: { $ne: 'cancelled' }
            });

            if (existingPatientAppointment) {
                res.status(400);
                throw new Error('You already have an appointment on this date. Only one appointment per day is allowed.');
            }

            // Check if the time slot is already booked
            const existingTimeSlotAppointment = await Appointment.findOne({
                doctor: doctorId,
                date: new Date(date),
                timeSlot: timeSlot,
                status: { $ne: 'cancelled' }
            });

            if (existingTimeSlotAppointment) {
                res.status(400);
                throw new Error('This time slot is already booked. Please choose another time.');
            }

            // Validate time slot is within working hours and not during lunch break
            // Use resolved workingHours
            // Convert 12-hour format time slot to 24-hour format for validation
            const timeSlot24Hour = convert12HourTo24Hour(timeSlot);
            const timeSlotMinutes = timeToMinutes(timeSlot24Hour);
            const startMinutes = timeToMinutes(workingHours.startTime);
            const endMinutes = timeToMinutes(workingHours.endTime);
            const lunchStartMinutes = timeToMinutes(workingHours.lunchStart);
            const lunchEndMinutes = timeToMinutes(workingHours.lunchEnd);

            if (timeSlotMinutes < startMinutes || timeSlotMinutes >= endMinutes) {
                res.status(400);
                throw new Error('Selected time slot is outside working hours.');
            }

            if (timeSlotMinutes >= lunchStartMinutes && timeSlotMinutes < lunchEndMinutes) {
                res.status(400);
                throw new Error('Selected time slot is during lunch break.');
            }

            // If booking for today, ensure selected time is in the future
            const isToday = dayOfBooking.getTime() === today.getTime();
            if (isToday) {
                const currentMinutes = now.getHours() * 60 + now.getMinutes();
                if (timeSlotMinutes <= currentMinutes) {
                    res.status(400);
                    throw new Error('Cannot book a time in the past');
                }
            }

            const appointment = await Appointment.create({
                patient: patientId,
                doctor: doctorId,
                date: bookingDate,
                timeSlot,
                duration: 30,
                status: 'pending',
            });

            res.status(201).json(appointment);
        } else {
            res.status(400);
            throw new Error('Doctor not available on this date or day is disabled');
        }
    } else {
        res.status(404);
        throw new Error('Doctor not found or not approved');
    }
});

// Helper function to convert time to minutes
const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

// Helper function to convert 12-hour format to 24-hour format for validation
const convert12HourTo24Hour = (time12Hour) => {
    const [time, ampm] = time12Hour.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    let hours24 = hours;
    if (ampm === 'AM' && hours === 12) {
        hours24 = 0;
    } else if (ampm === 'PM' && hours !== 12) {
        hours24 = hours + 12;
    }
    
    return `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// @desc    Get appointments for a specific patient
// @route   GET /api/patients/appointments
// @access  Private/Patient
const getPatientAppointments = asyncHandler(async (req, res) => {
    const appointments = await Appointment.find({ patient: req.user._id })
        .populate('doctor', 'name email');
    res.json(appointments);
});

// @desc    Cancel a patient's appointment
// @route   PUT /api/patients/appointments/:id/cancel
// @access  Private/Patient
const cancelPatientAppointment = asyncHandler(async (req, res) => {
    const appointment = await Appointment.findById(req.params.id);

    if (appointment && appointment.patient.toString() === req.user._id.toString()) {
        if (appointment.status === 'pending' || appointment.status === 'accepted') {
            appointment.status = 'cancelled';

            const updatedAppointment = await appointment.save();
            res.json(updatedAppointment);
        } else {
            res.status(400);
            throw new Error('Appointment cannot be cancelled in its current status');
        }
    } else {
        res.status(404);
        throw new Error('Appointment not found or not authorized');
    }
});

module.exports = {
    getAvailableDoctors,
    getDoctorAvailability,
    getDoctorTimeSlots,
    bookAppointment,
    getPatientAppointments,
    cancelPatientAppointment,
};
