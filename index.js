const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const port = process.env.PORT || 5000;

// ==========================================
// 🔐 CORS CONFIGURATION
// ==========================================
const allowedOrigins = [
    'http://localhost:3000',
    'https://your-frontend-project-name.vercel.app' // Replace with your frontend domain when ready
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Initialize Google OAuth2 Client
const oAuth2Client = new OAuth2Client(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage'
);

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Global collection references accessible by all endpoints
let db, usersCollection, doctorsCollection, appointmentsCollection;

// ==========================================
// ⚡ SERVERLESS DATABASE CONNECTION MIDDLEWARE
// ==========================================
app.use(async (req, res, next) => {
    try {
        if (!client.topology || !client.topology.isConnected()) {
            await client.connect();
        }
        // Initialize references globally
        db = client.db("docAppointDB");
        usersCollection = db.collection("users");
        doctorsCollection = db.collection("doctors");
        appointmentsCollection = db.collection("appointments");

        next();
    } catch (err) {
        console.error("Database connection failure:", err);
        res.status(500).json({ message: "Database connection failed." });
    }
});

// ==========================================
// 🔐 AUTHENTICATION ENDPOINTS
// ==========================================

app.post('/api/auth/google', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ message: "Handshake token code missing." });

        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        const ticket = await oAuth2Client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        });

        const { name, email, picture } = ticket.getPayload();
        let user = await usersCollection.findOne({ userEmail: email });

        if (!user) {
            const newUser = {
                name,
                userEmail: email,
                photoUrl: picture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
                createdAt: new Date(),
                isOAuthUser: true
            };
            const result = await usersCollection.insertOne(newUser);
            user = { _id: result.insertedId, ...newUser };
        }

        const appToken = jwt.sign(
            { id: user._id, email: user.userEmail },
            process.env.JWT_SECRET || 'fallback_secret_key_signature',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token: appToken,
            user: { name: user.name, email: user.userEmail, photoUrl: user.photoUrl }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server verification handshake failed." });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, photoUrl, password } = req.body;
        const existingUser = await usersCollection.findOne({ userEmail: email });
        if (existingUser) return res.status(400).json({ message: "User already exists." });

        const newUser = { name, userEmail: email, photoUrl, password, createdAt: new Date() };
        const result = await usersCollection.insertOne(newUser);
        const token = jwt.sign({ id: result.insertedId, email }, process.env.JWT_SECRET || 'fallback_secret_key_signature', { expiresIn: '7d' });

        res.status(201).json({ success: true, token, user: { name, email, photoUrl } });
    } catch (error) {
        res.status(500).json({ message: "Manual registration system failure." });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await usersCollection.findOne({ userEmail: email });
        if (!user || user.password !== password) return res.status(400).json({ message: "Invalid credentials." });

        const token = jwt.sign({ id: user._id, email: user.userEmail }, process.env.JWT_SECRET || 'fallback_secret_key_signature', { expiresIn: '7d' });
        res.json({ success: true, token, user: { name: user.name, email: user.userEmail, photoUrl: user.photoUrl } });
    } catch (error) {
        res.status(500).json({ message: "Manual login system processing failure." });
    }
});

// ==========================================
// 🩺 DATA AND BOOKING ENDPOINTS
// ==========================================

app.get('/api/doctors', async (req, res) => {
    try {
        // Fallback protection: Explicitly verify references are initialized
        const diagnosticCollection = doctorsCollection || client.db("docAppointDB").collection("doctors");

        const searchParam = req.query.search || "";
        let query = {};

        if (searchParam) {
            query = { name: { $regex: searchParam, $options: 'i' } };
        }

        const result = await diagnosticCollection.find(query).toArray();
        res.json(result);
    } catch (error) {
        console.error("Internal Route Error Detail:", error); // This logs inside your Vercel Dashboard logs console panel!
        res.status(500).json({ message: "Failed parsing entire physician directory collection data." });
    }
});

app.get('/api/doctors/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const doctor = await doctorsCollection.findOne(query);
        if (!doctor) return res.status(404).json({ message: "Doctor not found." });
        res.json(doctor);
    } catch (error) {
        res.status(500).json({ message: "Error compiling physician object parsing." });
    }
});

app.get('/api/appointments', async (req, res) => {
    try {
        const email = req.query.email;
        if (!email) return res.status(400).json({ message: "User email parameter is required." });

        const query = {
            $or: [
                { userEmail: email },
                { email: email }
            ]
        };

        const result = await appointmentsCollection.find(query).toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Error compiling appointments matrix data." });
    }
});

app.post('/api/appointments', async (req, res) => {
    try {
        const appointmentData = req.body;
        const result = await appointmentsCollection.insertOne({ ...appointmentData, createdTimestamp: new Date() });
        res.status(201).json({ success: true, insertedId: result.insertedId });
    } catch (error) {
        res.status(500).json({ message: "Failed parsing clinical log payload inside database." });
    }
});

app.put('/api/appointments/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedData = req.body;

        const updateDoc = {
            $set: {
                patientName: updatedData.patientName,
                gender: updatedData.gender,
                phone: updatedData.phone,
                appointmentDate: updatedData.appointmentDate,
                appointmentTime: updatedData.appointmentTime,
                modifiedAt: new Date()
            }
        };

        const result = await appointmentsCollection.updateOne(filter, updateDoc);
        if (result.matchedCount === 0) return res.status(404).json({ message: "Target booking item missing." });
        res.json({ success: true, message: "Appointment updated successfully." });
    } catch (error) {
        res.status(500).json({ message: "Failed executing appointment database update lifecycle." });
    }
});

app.delete('/api/appointments/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await appointmentsCollection.deleteOne(query);
        if (result.deletedCount === 0) return res.status(404).json({ message: "No match found to clear." });
        res.json({ success: true, message: "Appointment erased from records." });
    } catch (error) {
        res.status(500).json({ message: "Failed parsing appointment erasure command." });
    }
});

app.put('/api/users/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const filter = { userEmail: email };
        const { name, photoUrl } = req.body;

        const updateDoc = { $set: { name: name, photoUrl: photoUrl } };
        await usersCollection.updateOne(filter, updateDoc);
        res.json({ success: true, message: "User identity modified successfully." });
    } catch (error) {
        res.status(500).json({ message: "Failed sync operations to user registry." });
    }
});

app.get('/', (req, res) => {
    res.send('DocAppoint Server Engine is Operational.');
});

// Only start the local listener if we aren't executing inside production Vercel environments
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server executing live across workspace port: ${port}`);
    });
}

module.exports = app;