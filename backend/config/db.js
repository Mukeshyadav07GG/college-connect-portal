const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("[db] MONGO_URI is not set. Copy .env.example to .env and fill it in.");
    process.exit(1);
  }
  mongoose.set("strictQuery", false);
  try {
    await mongoose.connect(uri, { autoIndex: true });
    console.log("[db] MongoDB connected:", mongoose.connection.name);
  } catch (err) {
    console.error("[db] MongoDB connection failed:", err.message);
    process.exit(1);
  }
  return mongoose.connection;
}

module.exports = { connectDB, mongoose };
