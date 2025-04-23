const express = require('express');
const path = require('path');

const { verifyToken, authRole } = require('../middlewares/auth');
const router = express.Router();
const DailyVisitorStat = require('../models/dailyVisitorStat');

function isBotUserAgent(userAgent) {
    const botPatterns = [
        /bot/i, /crawl/i, /spider/i, /slurp/i, /fetch/i, /scan/i,
        /curl/i, /wget/i, /scrape/i, /lighthouse/i, /headless/i,
        /python-requests/i, /http[\s-]?client/i, /googlebot/i
    ];

    return botPatterns.some(pattern => pattern.test(userAgent));
}

function isPotentialBot(req) {
    if (!req.headers['accept-language']) {
      return true;
    }
    
    if (!req.headers['referer'] && req.path !== '/') {
      return true;
    }
    
    return false;
  }

router.use('/', async (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';

    if (isBotUserAgent(userAgent) || isPotentialBot(req)) {
        return next();
    }

    try {
        const today = new Date().toISOString().slice(0, 10);
        const stat = await DailyVisitorStat.findOne({ date: today });

        if (stat) {
            stat.dailyVisits += 1;
            stat.totalVisits += 1;
            await stat.save();
        } else {
            const previous = await DailyVisitorStat.find().sort({ date: -1 }).limit(1);
            const prevTotal = previous.length > 0 ? previous[0].totalVisits : 0;

            await DailyVisitorStat.create({
                date: today,
                dailyVisits: 1,
                totalVisits: prevTotal + 1
            });
            next();
        }
    } catch (err) {
        console.error('Failed to track daily visitor:', err);
        next();
    }
});

module.exports = router;