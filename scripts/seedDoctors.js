import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';


dotenv.config();

const doctorsData = [
    {
        name: "Dr. Ariful Islam",
        image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400",
        specialty: "Cardiologist",
        experience: 12,
        location: "KDA Avenue, Khulna",
        fee: 800,
        rating: 4.9,
        description: "Expert in cardiovascular health, preventive cardiology, and advanced heart failure treatments."
    },
    {
        name: "Dr. Nusrat Jahan",
        image: "https://images.unsplash.com/photo-1594824813573-246434e33963?auto=format&fit=crop&q=80&w=400",
        specialty: "Dermatologist",
        experience: 8,
        location: "Sonadanga R/A, Khulna",
        fee: 600,
        rating: 4.7,
        description: "Specializes in clinical dermatology, skincare therapeutics, and allergic condition management."
    },
    {
        name: "Dr. Tanvir Rahman",
        image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400",
        specialty: "Pediatrician",
        experience: 10,
        location: "Mujgunni Main Road, Khulna",
        fee: 700,
        rating: 4.8,
        description: "Dedicated to compassionate and comprehensive healthcare for infants, toddlers, and young teens."
    },
    {
        name: "Dr. Sabina Yasmin",
        image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400",
        specialty: "Neurologist",
        experience: 15,
        location: "Boyra Main Road, Khulna",
        fee: 1000,
        rating: 5.0,
        description: "Specialized in diagnosing and treating complex neurological conditions, migraines, and nerve disorders."
    }
];

const seedDatabase = async () => {
    if (!process.env.MONGO_URI) {
        console.error("❌ Error: MONGO_URI is missing from your .env file!");
        process.exit(1);
    }

    const client = new MongoClient(process.env.MONGO_URI);

    try {
        console.log("⏳ Connecting to database to seed data...");
        await client.connect();

        const db = client.db('docappoint');
        const doctorsCollection = db.collection('doctors');

        // 1. Clear any existing doctors to ensure clean state
        await doctorsCollection.deleteMany({});
        console.log("🗑️ Cleaned up old doctor listings.");

        // 2. Insert fresh sample list
        const result = await doctorsCollection.insertMany(doctorsData);
        console.log(`✅ Success! Inserted ${result.insertedCount} sample doctors into the database.`);

    } catch (error) {
        console.error("❌ Seeding database failed:", error.message);
    } finally {
        // Always close the client connection when done
        await client.close();
        console.log("🔌 Database connection closed cleanly.");
        process.exit(0);
    }
};

// Fire the function
seedDatabase();