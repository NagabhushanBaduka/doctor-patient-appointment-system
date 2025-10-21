const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const adminDoctorRoutes = require('./routes/adminDoctorRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const patientRoutes = require('./routes/patientRoutes');
const User = require('./models/User'); // Import User model
const bcrypt = require('bcryptjs'); // Import bcryptjs
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

dotenv.config();

connectDB();

// Admin user creation logic
const createAdminUser = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASS;
        const adminName = 'Admin User';

        const adminExists = await User.findOne({ email: adminEmail });

        if (!adminExists) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(adminPassword, salt);

            await User.create({
                name: adminName,
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
            });
            console.log('Admin user created successfully!');
        } else {
            // If admin exists, ensure their password is the defined default
            if (adminExists.password !== adminPassword) { // Simple check, password will be re-hashed by pre('save')
                adminExists.password = adminPassword;
                await adminExists.save();
                console.log('Admin user password updated to default.');
            }
            console.log('Admin user already exists.');
        }
    } catch (error) {
        console.error('Error creating admin user:', error.message);
    }
};

createAdminUser(); // Call the function to create admin user on startup

const app = express();

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use('/api/users', authRoutes);
app.use('/api/admin/doctors', adminDoctorRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/patients', patientRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
