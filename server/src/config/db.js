const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDb connected Successfully");
  } catch (error) {
    console.log("MongoDB connection Error:", error.message);
    process.exit(1);
  }
};
module.exports = connectDB;
