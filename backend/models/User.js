const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        required: true,
        enum: ['admin', 'doctor', 'patient'],
        default: 'patient',
    },
    isApproved: {
        type: Boolean,
        required: true,
        default: false,
    },
    bio: {
        type: String,
    },
    contactNumber: {
        type: String,
    },
    specialization: {
        type: String,
        required: function() { return this.role === 'doctor'; },
        enum: ['Physician', 'Physiotherapy', 'Cardiologist', 'Dermatologist', 'Pediatrician', 'Neurologist', 'Orthopedic Surgeon'],
    },
    availability: [
        {
            date: { type: Date, required: true },
            isEnabled: { type: Boolean, default: true },
            workingHours: {
                startTime: { type: String, default: '10:00' }, // 10 AM (stored as 24-hour for calculations)
                endTime: { type: String, default: '17:00' },   // 5 PM (stored as 24-hour for calculations)
                lunchStart: { type: String, default: '12:00' }, // 12 PM (stored as 24-hour for calculations)
                lunchEnd: { type: String, default: '14:00' }    // 2 PM (stored as 24-hour for calculations)
            }
        }
    ]
    ,
    weeklyAvailability: {
        monday: {
            isEnabled: { type: Boolean, default: true },
            workingHours: {
                startTime: { type: String, default: '10:00' },
                endTime: { type: String, default: '17:00' },
                lunchStart: { type: String, default: '12:00' },
                lunchEnd: { type: String, default: '14:00' }
            }
        },
        tuesday: {
            isEnabled: { type: Boolean, default: true },
            workingHours: {
                startTime: { type: String, default: '10:00' },
                endTime: { type: String, default: '17:00' },
                lunchStart: { type: String, default: '12:00' },
                lunchEnd: { type: String, default: '14:00' }
            }
        },
        wednesday: {
            isEnabled: { type: Boolean, default: true },
            workingHours: {
                startTime: { type: String, default: '10:00' },
                endTime: { type: String, default: '17:00' },
                lunchStart: { type: String, default: '12:00' },
                lunchEnd: { type: String, default: '14:00' }
            }
        },
        thursday: {
            isEnabled: { type: Boolean, default: true },
            workingHours: {
                startTime: { type: String, default: '10:00' },
                endTime: { type: String, default: '17:00' },
                lunchStart: { type: String, default: '12:00' },
                lunchEnd: { type: String, default: '14:00' }
            }
        },
        friday: {
            isEnabled: { type: Boolean, default: true },
            workingHours: {
                startTime: { type: String, default: '10:00' },
                endTime: { type: String, default: '17:00' },
                lunchStart: { type: String, default: '12:00' },
                lunchEnd: { type: String, default: '14:00' }
            }
        },
        saturday: {
            isEnabled: { type: Boolean, default: false },
            workingHours: {
                startTime: { type: String, default: '10:00' },
                endTime: { type: String, default: '17:00' },
                lunchStart: { type: String, default: '12:00' },
                lunchEnd: { type: String, default: '14:00' }
            }
        },
        sunday: {
            isEnabled: { type: Boolean, default: false },
            workingHours: {
                startTime: { type: String, default: '10:00' },
                endTime: { type: String, default: '17:00' },
                lunchStart: { type: String, default: '12:00' },
                lunchEnd: { type: String, default: '14:00' }
            }
        }
    }
}, {
    timestamps: true,
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
