import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { seedDoctorsCollection } from './utils/seedDoctors.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(morgan('dev'));

const allowedOrigins = ['http://localhost:3000', 'http://localhost:5001'];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Blocked by security policy (CORS)'));
        }
    }
}));

app.use(express.json());

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { message: "Too many requests from this network. Please try again later." }
});
app.use('/api/', apiLimiter);

const client = new MongoClient(process.env.MONGO_URI);
let db;

async function startServer() {
    try {
        await client.connect();
        db = client.db('docappoint');
        console.log("📡 Connected to MongoDB successfully!");

        await seedDoctorsCollection(db);

        app.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("❌ Database connection failed:", error);
    }
}

// User Registration with Back-End Password Rules Verification
app.post('/api/auth/register', async (req, res, next) => {
    try {
        const usersCollection = db.collection('users');
        const { name, email, photoUrl, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Missing required registration parameters." });
        }

        // Assignment Password Rules
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        if (!hasUpper || !hasLower || password.length < 6) {
            return res.status(400).json({ message: "Password validation failed. Check assignment rules." });
        }

        const existingUser = await usersCollection.findOne({ userEmail: email });
        if (existingUser) {
            return res.status(400).json({ message: "An account with this email already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = { name, userEmail: email, photoUrl, password: hashedPassword, createdAt: new Date() };

        const result = await usersCollection.insertOne(newUser);
        res.status(201).json({ success: true, userId: result.insertedId });
    } catch (error) {
        next(error);
    }
});

app.post('/api/auth/login', async (req, res, next) => {
    try {
        const usersCollection = db.collection('users');
        const { email, password } = req.body;

        const user = await usersCollection.findOne({ userEmail: email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: "Invalid email address or password credentials." });
        }

        const token = jwt.sign({ id: user._id, email: user.userEmail }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
        res.json({ success: true, token, user: { name: user.name, email: user.userEmail, photoUrl: user.photoUrl } });
    } catch (error) {
        next(error);
    }
});

// Update Profile Action Endpoint
app.put('/api/users/:email', async (req, res, next) => {
    try {
        const usersCollection = db.collection('users');
        const userEmail = req.params.email;
        const { name, photoUrl } = req.body;

        const result = await usersCollection.updateOne(
            { userEmail: userEmail },
            { $set: { name, photoUrl } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "User workspace files not found." });
        }

        res.json({ success: true, user: { name, email: userEmail, photoUrl } });
    } catch (error) {
        next(error);
    }
});

app.get('/api/doctors', async (req, res, next) => {
    try {
        const doctorsCollection = db.collection('doctors');
        let query = {};

        if (req.query.search) {
            query.name = { $regex: req.query.search, $options: 'i' };
        }

        const doctors = await doctorsCollection.find(query).toArray();
        res.json(doctors);
    } catch (error) {
        next(error);
    }
});

app.get('/api/doctors/:id', async (req, res, next) => {
    try {
        const doctorsCollection = db.collection('doctors');
        const doctor = await doctorsCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (!doctor) return res.status(404).json({ message: "Doctor not found" });
        res.json(doctor);
    } catch (error) {
        next(error);
    }
});

// Create Appointment (Strictly aligned with assignment naming parameters)
app.post('/api/appointments', async (req, res, next) => {
    try {
        const appointmentsCollection = db.collection('appointments');
        const { userEmail, doctorName, patientName, gender, phone, appointmentDate, appointmentTime } = req.body;

        const existingConflict = await appointmentsCollection.findOne({ doctorName, appointmentDate, appointmentTime });
        if (existingConflict) {
            return res.status(400).json({ success: false, message: "This time slot has already been reserved." });
        }

        const newAppointment = { userEmail, doctorName, patientName, gender, phone, appointmentDate, appointmentTime, createdAt: new Date() };
        const result = await appointmentsCollection.insertOne(newAppointment);
        res.status(201).json({ success: true, message: "Appointment booked successfully!", appointmentId: result.insertedId });
    } catch (error) {
        next(error);
    }
});

app.get('/api/appointments', async (req, res, next) => {
    try {
        const appointmentsCollection = db.collection('appointments');
        let query = {};
        if (req.query.email) query.userEmail = req.query.email;

        const appointments = await appointmentsCollection.find(query).sort({ createdAt: -1 }).toArray();
        res.json(appointments);
    } catch (error) {
        next(error);
    }
});

// Update Appointment Route (Modal UI Sync)
app.put('/api/appointments/:id', async (req, res, next) => {
    try {
        const appointmentsCollection = db.collection('appointments');
        const { patientName, gender, phone, appointmentDate, appointmentTime } = req.body;

        const result = await appointmentsCollection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { patientName, gender, phone, appointmentDate, appointmentTime } }
        );

        res.json({ success: true, message: "Appointment updated successfully!" });
    } catch (error) {
        next(error);
    }
});

app.delete('/api/appointments/:id', async (req, res, next) => {
    try {
        const appointmentsCollection = db.collection('appointments');
        await appointmentsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.json({ success: true, message: "Appointment deleted successfully!" });
    } catch (error) {
        next(error);
    }
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: "Internal server runtime error." });
});

startServer();