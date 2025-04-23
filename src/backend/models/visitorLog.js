const mongoose = require('mongoose');

const VisitorLogSchema = new mongoose.Schema({
    userIdentifier: { type: String, required: true },
    truncatedIP: { type: String, required: false },
    totalCalls: { type: Number, default: 0 },

    lastAccessedAt: { type: Date, default: Date.now }
});

const VisitorLog = mongoose.model('VisitorLog', VisitorLogSchema);
module.exports = VisitorLog;