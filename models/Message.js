const mongoose = require('mongoose');
const msgSchema = new mongoose.Schema({
  user: String,
  text: String,
  createdAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model('Message', msgSchema);