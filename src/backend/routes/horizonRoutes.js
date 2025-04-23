const express = require('express');
const axios = require('axios');
const logVisitorCall = require("../middlewares/logVisitorCall");
const { query, validationResult } = require('express-validator');

const router = express.Router();

const validateCombinedRequest = [
    query('depBody').notEmpty().withMessage('Departure body needed'),
    query('arrBody').notEmpty().withMessage('Arrival body needed'),
    query('depStart').notEmpty().withMessage('Vaild departure date needed'),
    query('depEnd').notEmpty().withMessage('Vaild arrival date needed'),
    query('arrStart').notEmpty().withMessage('Vaild departure date needed'),
    query('arrEnd').notEmpty().withMessage('Vaild arrival date needed'),
    query('depStepSize').optional().matches(/^\d+[dhm]$/).withMessage('Vaild step size needed'),
    query('arrStepSize').optional().matches(/^\d+[dhm]$/).withMessage('Vaild step size needed')
];

router.get('/combined', async (req, res) => {
    const { depBody, arrBody, depStart, depEnd, arrStart, arrEnd, depStepSize, arrStepSize } = req.query;

    if (!depBody || !arrBody || !depStart || !depEnd || !arrStart || !arrEnd) {
        return res.status(400).json({ error: "(depBody, arrBody, depStart, depEnd, arrStart, arrEnd)" });
    }

    try {
        const [depData, arrData] = await Promise.all([
            getHorizonsData(depBody, depStart, depEnd, depStepSize),
            getHorizonsData(arrBody, arrStart, arrEnd, arrStepSize)
        ]);

        const parsedDep = parseHorizonsData(depData);
        const parsedArr = parseHorizonsData(arrData);

        await logVisitorCall(req, {
            depBody,
            arrBody,
            depStart,
            depEnd,
            arrStart,
            arrEnd
        });

        res.json({
            departure: { body: depBody, data: parsedDep },
            arrival: { body: arrBody, data: parsedArr }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch Horizons data'});
    }
});

const getHorizonsData = async (bodyName, start, stop, stepSize = '1d') => {
    try {
        const response = await axios.get('https://ssd.jpl.nasa.gov/api/horizons.api', {
            params: {
                format: 'json',
                COMMAND: bodyName,
                EPHEM_TYPE: 'VECTORS',
                CENTER: '500@10',
                START_TIME: start,
                STOP_TIME: stop,
                STEP_SIZE: stepSize,
                OUT_UNITS: 'KM-S',
                REF_PLANE: 'ECLIPTIC'
            },
            timeout: 10000
        });

        if (response.data && response.data.result) {
            return response.data.result;
        } else {
            throw new Error('Invalid response from JPL Horizons');
        }
    } catch (error) {
        console.error('Error fetching Horizons data:', error.withMessage);
        throw error;
    }
};

function parseHorizonsData(rawData) {
    const dataPattern = /\$SOE([\s\S]*?)\$\$EOE/;
    const match = dataPattern.exec(rawData);

    if (!match) return [];

    const dataBlock = match[1].trim();
    const lines = dataBlock.split('\n');
    const dataPoints = [];

    for (let i = 0; i < lines.length; i++) {
        if (i + 2 >= lines.length) break;

        const dateLine = lines[i].trim();
        const dateMatch = /(\d+\.\d+)\s*=\s*A\.D\.\s*([\d\-A-Za-z\s:\.]+)/.exec(dateLine);

        if (!dateMatch) continue;

        const jd = parseFloat(dateMatch[1]);
        const dateStr = dateMatch[2].trim();

        const posLine = lines[i + 1].trim();
        const posMatches = posLine.match(/X\s*=\s*([eE\d\.\-\+]+)\s*Y\s*=\s*([eE\d\.\-\+]+)\s*Z\s*=\s*([eE\d\.\-\+]+)/);

        if (!posMatches) continue;

        const x = parseFloat(posMatches[1]);
        const y = parseFloat(posMatches[2]);
        const z = parseFloat(posMatches[3]);

        const velLine = lines[i + 2].trim();
        const velMatches = velLine.match(/VX\s*=\s*([eE\d\.\-\+]+)\s*VY\s*=\s*([eE\d\.\-\+]+)\s*VZ\s*=\s*([eE\d\.\-\+]+)/);

        if (!velMatches) continue;

        const vx = parseFloat(velMatches[1]);
        const vy = parseFloat(velMatches[2]);
        const vz = parseFloat(velMatches[3]);

        dataPoints.push({
            date: {
                jd,
                dateStr,
                iso: convertToISODate(dateStr)
            },
            position: {
                x,
                y,
                z
            },
            velocity: {
                vx,
                vy,
                vz
            }
        });
    }

    return dataPoints;
}

function convertToISODate(horizonsDate) {
    const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };

    const parts = horizonsDate.split(' ');
    const dateParts = parts[0].split('-');

    if (dateParts.length !== 3) return null;

    const year = dateParts[0];
    const month = months[dateParts[1]] || '01';
    const day = dateParts[2].padStart(2, '0');
    const time = parts[1] || '00:00:00';

    return `${year}-${month}-${day}T${time}Z`;
}

module.exports = router;
