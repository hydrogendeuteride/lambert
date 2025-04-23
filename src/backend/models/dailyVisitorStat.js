const mongoose = require('mongoose');

const DailyVisitorStatSchema = new mongoose.Schema({
    date: { type: String, required: true, unique: true },
    dailyVisits: { type: Number, default: 0 },
    totalVisits: { type: Number, default: 0 }
});

module.exports = mongoose.model('DailyVisitorStat', DailyVisitorStatSchema);