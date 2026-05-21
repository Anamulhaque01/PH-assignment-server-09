const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const port = process.env.PORT || 5000;

// Middleware configuration
app.use(cors({
    origin: ['http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

// Initialize Google OAuth2 Client Channel
const oAuth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
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

// 🌟 DIRECT INLINE SEEDER FUNCTION (No external require file needed!)
async function seedDoctorsCollection(db) {
    try {
        const doctorsCollection = db.collection("doctors");
        const count = await doctorsCollection.countDocuments();

        if (count < 8) {
            await doctorsCollection.deleteMany({});

            const sampleDoctors = [
                {
                    name: "Dr. Tasnim Rahman",
                    specialty: "Cardiologist",
                    experience: 12,
                    rating: 4.9,
                    description: "Senior consultant specializing in interventional cardiology, rhythm management, and advanced cardiovascular disease prevention methods.",
                    fee: 1200,
                    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=400"
                },
                {
                    name: "Dr. Asif Nawaz",
                    specialty: "Dermatologist",
                    experience: 8,
                    rating: 4.7,
                    description: "Expert dermatologist specializing in laser procedures, clinical allergy diagnostics, cosmetic enhancements, and stubborn acne therapies.",
                    fee: 1000,
                    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=400"
                },
                {
                    name: "Dr. Fahmida Chowdhury",
                    specialty: "Pediatrician",
                    experience: 10,
                    rating: 4.8,
                    description: "Dedicated specialist focusing on neonatology, comprehensive childhood nutrition maps, and adolescent health management protocols.",
                    fee: 800,
                    image: "https://images.unsplash.com/photo-1594824813573-246434e3b96f?q=80&w=400"
                },
                {
                    name: "Dr. Imran Khan",
                    specialty: "Neurologist",
                    experience: 14,
                    rating: 4.9,
                    description: "Specializes in complex neuromuscular disorders, chronic migraine management systems, sleep disorders, and cognitive brain function mapping.",
                    fee: 1500,
                    image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=400"
                },
                {
                    name: "Dr. Nusrat Jahan",
                    specialty: "Gynecologist",
                    experience: 11,
                    rating: 4.8,
                    description: "Expert in maternal-fetal wellness medicine, high-risk reproductive healthcare, minimally invasive laparoscopic surgery, and prenatal care.",
                    fee: 1100,
                    image: "https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?q=80&w=400"
                },
                {
                    name: "Dr. Zayed Ahmed",
                    specialty: "Orthopedic",
                    experience: 9,
                    rating: 4.6,
                    description: "Specialist in sports arthroscopy, joint reconstruction mechanics, bone trauma management, and advanced musculoskeletal rehabilitative therapies.",
                    fee: 1300,
                    image: "https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?q=80&w=400"
                },
                {
                    name: "Dr. Sabrina Islam",
                    specialty: "Psychiatrist",
                    experience: 7,
                    rating: 4.7,
                    description: "Compassionate care focusing on clinical anxiety treatments, mood behavioral regulation counseling, stress strategies, and mental health therapy.",
                    fee: 900,
                    image: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?q=80&w=400"
                },
                {
                    name: "Dr. Tanvir Hassan",
                    specialty: "Ophthalmologist",
                    experience: 15,
                    rating: 4.9,
                    description: "Advanced eye care specialist focusing on micro-incision cataract surgeries, custom laser vision correction (LASIK), and advanced glaucoma management.",
                    fee: 1200,
                    image: "https://images.unsplash.com/photo-1637059824899-a441006a6875?q=80&w=400"
                }
            ];

            await doctorsCollection.insertMany(sampleDoctors);
            console.log("🌱 Database Seeding: Successfully updated to 8 doctor records!");
        } else {
            console.log("📁 Database Seeding: Collection already contains 8 or more records.");
        }
    } catch (error) {
        console.error("❌ Seeding process error:", error);
    }
}

async function run() {
    try {
        const db = client.db("docAppointDB");
        const usersCollection = db.collection("users");
        const doctorsCollection = db.collection("doctors");
        const appointmentsCollection = db.collection("appointments");

        console.log("Successfully synched application access portals to MongoDB clusters.");

        // Run the locally declared function cleanly
        await seedDoctorsCollection(db);

        // ==========================================
        // 🔐 AUTHENTICATION ENDPOINTS
        // ==========================================

        app.post('/api/auth/google', async (req, res) => {
            try {
                const { code } = req.body;
                if (!code) return res.status(400).json({ message: "Handshake authentication token code missing." });

                const { tokens } = await oAuth2Client.getToken(code);
                oAuth2Client.setCredentials(tokens);

                const ticket = await oAuth2Client.verifyIdToken({
                    idToken: tokens.id_token,
                    audience: process.env.GOOGLE_CLIENT_ID,
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
                console.error("Express Google OAuth Engine Exception:", error);
                res.status(500).json({ message: "Internal server verification handshake failed." });
            }
        });

        app.post('/api/auth/register', async (req, res) => {
            try {
                const { name, email, photoUrl, password } = req.body;
                const existingUser = await usersCollection.findOne({ userEmail: email });
                if (existingUser) return res.status(400).json({ message: "User already exists with this email address." });

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
                if (!user || user.password !== password) return res.status(400).json({ message: "Invalid email credentials or password verification sequence." });

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
                const searchParam = req.query.search || "";
                let query = {};

                if (searchParam) {
                    query = { name: { $regex: searchParam, $options: 'i' } };
                }

                const result = await doctorsCollection.find(query).toArray();
                res.json(result);
            } catch (error) {
                console.error("Error fetching doctors list:", error);
                res.status(500).json({ message: "Failed parsing entire physician directory collection data." });
            }
        });

        app.get('/api/doctors/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const doctor = await doctorsCollection.findOne(query);
                if (!doctor) return res.status(404).json({ message: "Doctor record matrix target not found." });
                res.json(doctor);
            } catch (error) {
                res.status(500).json({ message: "Error compiling singular physician object parsing." });
            }
        });

        app.get('/api/appointments', async (req, res) => {
            try {
                const email = req.query.email;
                if (!email) return res.status(400).json({ message: "User email query parameter is required." });

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
                res.json({ success: true, message: "User workspace identity modified successfully." });
            } catch (error) {
                res.status(500).json({ message: "Failed sync operations to the master user registry document." });
            }
        });

    } catch (err) {
        console.error("Database initialization warning:", err);
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('DocAppoint Server Engine is Operational.');
});

app.listen(port, () => {
    console.log(`Server executing live across workspace port: ${port}`);
});