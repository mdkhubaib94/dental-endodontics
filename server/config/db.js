// server/config/db.js
import dns from "node:dns";
import mongoose from "mongoose";

const SRV_DNS_ERROR_CODES = new Set(["ECONNREFUSED", "EAI_AGAIN", "ENOTFOUND", "ETIMEOUT"]);
const DEFAULT_DNS_SERVERS = ["8.8.8.8", "1.1.1.1"];
const CACHE_KEY = "__srmMongoCache";

const mongoCache = globalThis[CACHE_KEY] || {
  connection: null,
  connectionPromise: null,
};

globalThis[CACHE_KEY] = mongoCache;

const isSrvDnsError = (error) => {
  return error?.syscall === "querySrv" && SRV_DNS_ERROR_CODES.has(error?.code);
};

const getDnsServers = () => {
  const configured = process.env.MONGO_DNS_SERVERS;
  if (!configured) {
    return DEFAULT_DNS_SERVERS;
  }

  return configured
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
};

const getConnectOptions = () => {
  const maxPoolSize = Number(process.env.MONGO_MAX_POOL_SIZE || 10);
  const minPoolSize = Number(process.env.MONGO_MIN_POOL_SIZE || 1);
  const serverSelectionTimeoutMS = Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 8000);
  const socketTimeoutMS = Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000);

  return {
    maxPoolSize,
    minPoolSize,
    serverSelectionTimeoutMS,
    socketTimeoutMS,
    family: 4,
  };
};

const connectOnce = async () => {
  if (mongoose.connection.readyState === 1 && mongoCache.connection) {
    return { connection: mongoCache.connection, reused: true };
  }

  if (mongoCache.connectionPromise) {
    const connection = await mongoCache.connectionPromise;
    return { connection, reused: true };
  }

  mongoCache.connectionPromise = mongoose
    .connect(process.env.MONGO_URI, getConnectOptions())
    .then((m) => {
      mongoCache.connection = m.connection;
      return m.connection;
    })
    .catch((err) => {
      mongoCache.connectionPromise = null;
      throw err;
    });

  const connection = await mongoCache.connectionPromise;
  return { connection, reused: false };
};

const connectDB = async () => {
  try {
    const { reused } = await connectOnce();
    if (reused) {
      console.log("✅ MongoDB connection reused");
    } else {
      console.log("✅ MongoDB connected");
    }
    return;
  } catch (error) {
    // Some ISPs/firewalls block SRV lookups used by mongodb+srv URIs.
    if (process.env.MONGO_URI?.startsWith("mongodb+srv://") && isSrvDnsError(error)) {
      const dnsServers = getDnsServers();

      if (dnsServers.length > 0) {
        try {
          dns.setServers(dnsServers);
          console.warn(
            `⚠️ MongoDB SRV lookup failed (${error.code}). Retrying with DNS servers: ${dnsServers.join(", ")}`
          );

          // Reset promise so retry can establish a fresh connection attempt.
          mongoCache.connectionPromise = null;
          const { reused } = await connectOnce();
          if (reused) {
            console.log("✅ MongoDB connection reused (DNS override active)");
          } else {
            console.log("✅ MongoDB connected (DNS override active)");
          }
          return;
        } catch (retryError) {
          console.error("❌ MongoDB connection failed after DNS override:", retryError.message);
          throw retryError;
        }
      }
    }

    console.error("❌ MongoDB connection failed:", error.message);
    throw error;
  }
};

export default connectDB;