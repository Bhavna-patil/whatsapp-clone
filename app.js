const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const http = require("http");
const path = require('path');
const socketio = require("socket.io");

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = socketio(server);

io.on("connection", (socket) => {
  console.log("🟢 New client connected");

  socket.on("joinRoom", (wa_id) => {
    socket.join(wa_id);
    console.log(`👤 Client joined room: ${wa_id}`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected");
  });
});

mongoose.connect(process.env.MONGO_URL)
.then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// Middlewares
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Make io available in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
const apiRoutes = require('./routes/api');
app.use('/', apiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
