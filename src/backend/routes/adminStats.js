const express = require('express');
const router = express.Router();

const { verifyToken, authRole } = require('../middlewares/auth');
const VisitorLog = require('../models/visitorLog');
const CallRecord = require('../models/callRecord');
const DailyVisitorStat = require('../models/dailyVisitorStat');

router.get('/stats', async (req, res) => {
    try {
        const today = new Date().toISOString().slice(0, 10);

        const todayStat = await DailyVisitorStat.findOne({ date: today });
        const latestStat = await DailyVisitorStat.find().sort({ date: -1 }).limit(1);

        const totalCalls = await CallRecord.countDocuments();
        const totalUsers = await VisitorLog.countDocuments();

        const popularRoutes = await CallRecord.aggregate([
            {
                $group: {
                    _id: { from: "$departureBody", to: "$arrivalBody" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        res.json({
            visitors: {
                today: todayStat?.dailyVisits || 0,
                total: latestStat[0]?.totalVisits || 0
            },
            calls: {
                totalCalls,
                uniqueUsers: totalUsers
            },
            popular: {
                departures: popularDeparture,
                arrivals: popularArrival,
                routes: popularRoutes
            }
        });
    } catch (err) {
        console.error('Admin stats error:', err);
        res.status(500).json({ error: 'Failed to retrieve admin stats' });
    }
})

router.get('/daily', async (req, res) => {
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().slice(0, 10);
    });

    const stats = await DailyVisitorStat.find({ date: { $in: last7Days } });
    const statMap = Object.fromEntries(stats.map(s => [s.date, s.dailyVisits]));

    const values = last7Days.map(date => statMap[date] || 0);

    res.json({
        dates: last7Days,
        values
    });
});

router.get('/overview', async (req, res) => {
    try {
        const today = new Date().toISOString().slice(0, 10);

        const todayStat = await DailyVisitorStat.findOne({ date: today });
        const latestStat = await DailyVisitorStat.find().sort({ date: -1 }).limit(1);

        res.json({
            visitors: {
                today: todayStat?.dailyVisits || 0,
                total: latestStat[0]?.totalVisits || 0
            }
        });
    } catch {
        console.error('overview error:', err);
        res.status(500).json({ error: 'Failed to retrieve overview' });
    }
})

router.get('/top-users', async (req, res) => {
    try {
        const topUsers = await VisitorLog.find({})
            .sort({ totalCalls: -1 })
            .limit(10)
            .select('userIdentifier totalCalls -_id');

        res.json(topUsers);
    } catch (err) {
        console.error('Failed to load top users:', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

router.get('/popular-routes', async (req, res) => {
    try {
        const result = await CallRecord.aggregate([
            {
                $group: {
                    _id: { from: "$departureBody", to: "$arrivalBody" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        res.json(result);
    } catch (err) {
        console.error('Failed to load popular routes:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
