import { MongoClient } from 'mongodb';

export const mongo = new MongoClient(process.env.MONGODB_URL);

await mongo.connect();

export const db = mongo.db('discord-tickets');
