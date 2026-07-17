const mongoose = require("mongoose");
const { logInfo, logError } = require("../utils/logger.js");

const connectDB = async () => {
  try {
    logInfo("Attempting MongoDB connection", {
      uriConfigured: Boolean(process.env.MONGO_URI),
    });

    await mongoose.connect(process.env.MONGO_URI);
    logInfo("MongoDb connected Successfully");
  } catch (error) {
    logError("MongoDB connection Error", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};
module.exports = connectDB;
