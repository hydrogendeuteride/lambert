const VisitorLog = require('../models/visitorLog');
const CallRecord = require('../models/callRecord');
const DailyVisitorStat = require('../models/dailyVisitorStat');

const anonymizeIP = require('../utils/anonymizeIP');
const getYearMonthString = require('../utils/parseYearMonth');

module.exports = async function logVisitorCall(req, options = {}) {
    try {
        const isAuthenticated = req.user && req.user.name;
        const userIdentifier = isAuthenticated
            ? req.user.name
            : anonymizeIP(req.ip);

        const truncatedIP = anonymizeIP(req.ip);

        const {
            depBody,
            arrBody,
            depStart,
            depEnd,
            arrStart,
            arrEnd
        } = options;

        await VisitorLog.findOneAndUpdate(
            { userIdentifier },
            {
                $set: {
                    truncatedIP,
                    lastAccessedAt: new Date()
                },
                $inc: {
                    totalCalls: 1
                }
            },
            { upsert: true }
        );

        await CallRecord.create({
            userIdentifier,
            truncatedIP,
            departureBody: depBody,
            arrivalBody: arrBody,
            departureYearMonthStart: getYearMonthString(depStart),
            departureYearMonthEnd: getYearMonthString(depEnd),
            arrivalYearMonthStart: getYearMonthString(arrStart),
            arrivalYearMonthEnd: getYearMonthString(arrEnd)
        });

    } catch (err) {
        console.error('Error logging visitor call:', err);
    }
};
