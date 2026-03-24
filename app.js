const express = require("express");
const messageRoutes = require("./routes/messageRoutes");
const errorHandler = require("./middleware/errorHandler");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const app = express();
app.use(cookieParser());
app.use(express.json());
app.use("/api/messages", messageRoutes);
app.use("/api/auth", authRoutes);
app.use(errorHandler);

module.exports = app;