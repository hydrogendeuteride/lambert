const mongoose = require('mongoose');

const CallRecordSchema = new mongoose.Schema({
    userIdentifier: { type: String, required: true },
    truncatedIP: { type: String },

    departureBody: { type: String },
    arrivalBody: { type: String },

    departureYearMonthStart: { type: String },
    departureYearMonthEnd: { type: String },
    arrivalYearMonthStart: { type: String },
    arrivalYearMonthEnd: { type: String },

    calledAt: { type: Date, default: Date.now }
});


const CallRecord = mongoose.model('CallRecord', CallRecordSchema);
module.exports = CallRecord;