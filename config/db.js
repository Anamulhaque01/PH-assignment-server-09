import { MongoClient } from 'mongodb';

let dbConnection;

export const connectDB = async () => {
    try {
        const client = new MongoClient(process.env.MONGO_URI);


        await client.connect();


        dbConnection = client.db('docappoint');

        console.log(`📡 Native MongoDB Connected Successfully to: docappoint`);
    } catch (error) {
        console.error(`❌ Native MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};


export const getDb = () => {
    if (!dbConnection) {
        throw new Error('❌ Database not initialized. Call connectDB first.');
    }
    return dbConnection;
};