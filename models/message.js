const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  wa_id: String,
  user_name: String,
  message: String,
  timestamp: Date,
  status: String, // sent, delivered, read
  msg_id: String // id or meta_msg_id from webhook
},{ collection: 'processed_messages' });

module.exports = mongoose.model('Message', MessageSchema);