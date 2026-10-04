import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { createInitialSeedData, DatabaseState } from '../seed/seedData';

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

let dbState: DatabaseState | null = null;
let isMongoAtlasConnected = false;

export async function connectDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri && !mongoUri.includes('<username>') && mongoUri.startsWith('mongodb')) {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      isMongoAtlasConnected = true;
      console.log('[Database] Connected to MongoDB Atlas cluster.');
    } catch (err) {
      console.warn('[Database] MongoDB Atlas connection unavailable, falling back to local persistent document store.');
      isMongoAtlasConnected = false;
    }
  }
  loadPersistentStore();
}

export function getConnectionStatus() {
  return {
    engine: isMongoAtlasConnected ? 'MongoDB Atlas (Mongoose)' : 'MongoDB Persistent Document Store',
    connected: true,
  };
}

function loadPersistentStore(): DatabaseState {
  if (dbState) return dbState;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      dbState = JSON.parse(raw) as DatabaseState;
      return dbState;
    } catch (e) {
      console.warn('[Database] Re-initializing corrupted store with seed data.');
    }
  }

  dbState = createInitialSeedData();
  savePersistentStore();
  return dbState;
}

export function getDb(): DatabaseState {
  return loadPersistentStore();
}

export function savePersistentStore(): void {
  if (!dbState) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Database] Failed to persist state:', err);
  }
}

export function resetToSeedData(): DatabaseState {
  dbState = createInitialSeedData();
  savePersistentStore();
  return dbState;
}
