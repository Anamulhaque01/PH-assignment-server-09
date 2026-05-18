import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';


dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());


const client = new MongoClient(process.env.MONGO_URI);
let db;

async function startServer() {
    try {
        await client.connect();
        db = client.db('docappoint');
        console.log("📡 Connected to MongoDB successfully!");

        app.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("❌ Database connection failed:", error);
    }
}


app.get('/api/health', (req, res) => {
    res.json({ status: "alive", database: db ? "connected" : "disconnected" });
});


app.get('/api/doctors', async (req, res) => {
    try {
        const doctorsCollection = db.collection('doctors');
        const allDoctors = await doctorsCollection.find({}).toArray();
        res.json(allDoctors);
    } catch (error) {
        res.status(500).json({ message: "Failed to get doctors" });
    }
});


app.get('/api/doctors/:id', async (req, res) => {
    try {
        const doctorsCollection = db.collection('doctors');
        const doctorId = req.params.id;
        const doctor = await doctorsCollection.findOne({ _id: new ObjectId(doctorId) });

        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }
        res.json(doctor);
    } catch (error) {
        res.status(500).json({ message: "Failed to get doctor details" });
    }
});


app.post('/api/appointments', async (req, res) => {
    try {
        const appointmentsCollection = db.collection('appointments');
        const { doctorId, doctorName, doctorSpecialty, date, timeSlot, userEmail, userName } = req.body;

        const newAppointment = {
            doctorId,
            doctorName,
            doctorSpecialty,
            date,
            timeSlot,
            userEmail,
            userName,
            status: "pending",
            createdAt: new Date()
        };

        const result = await appointmentsCollection.insertOne(newAppointment);
        res.status(201).json({
            success: true,
            message: "Appointment booked successfully!",
            appointmentId: result.insertedId
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to book appointment" });
    }
});


app.get('/api/appointments', async (req, res) => {
    try {
        const appointmentsCollection = db.collection('appointments');
        const allAppointments = await appointmentsCollection.find({}).sort({ createdAt: -1 }).toArray();
        res.json(allAppointments);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch appointments" });
    }
});


app.delete('/api/appointments/:id', async (req, res) => {
    try {
        const appointmentsCollection = db.collection('appointments');
        const appointmentId = req.params.id;

        const result = await appointmentsCollection.deleteOne({ _id: new ObjectId(appointmentId) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        res.json({ success: true, message: "Appointment cancelled successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Failed to cancel appointment" });
    }
});


startServer();