const { ObjectId } = require('mongodb');

async function seedDoctorsCollection(db) {
    try {
        const doctorsCollection = db.collection("doctors");
        const count = await doctorsCollection.countDocuments();

        // If collection has less than 8 items, re-seed cleanly
        if (count < 8) {
            // Clear out old data to avoid duplicates
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

module.exports = { seedDoctorsCollection };