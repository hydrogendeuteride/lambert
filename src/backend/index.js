require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const fs =  require('fs');
const https = require('https');

require('module-alias/register');

const horizonRoutes = require('./routes/horizonRoutes');
const adminRoutes = require('./routes/admin');
const adminStatsRoutes = require('./routes/adminStats');
const visitorTracker = require('./routes/visitorTracker');
const {verifyToken, authRole} = require('./middlewares/auth');
const authRoutes = require('./routes/auth');

const mongoURI = process.env.MONGO_URI;
const sessionSecret = process.env.SESSION_SECRET;
const port = process.env.PORT || 3000;

if (!mongoURI || !sessionSecret) {
    console.error('Essential environments are not set.');
}

const app = express();

mongoose.connect(mongoURI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
};
app.use(cors(corsOptions));

app.options('*', cors(corsOptions));

app.use((req, res, next) => {
    if (req.url.endsWith('.js')) {
        res.type('application/javascript');
    } else if (req.url.endsWith('.wasm')) {
        res.type('application/wasm');
    }
    next();
});

app.use(express.json());

app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
}));


const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(morgan('combined'));

app.use('/api/', apiLimiter);

app.use(
    helmet({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                "default-src": ["'self'"],
                "script-src": ["'self'",
                    "'wasm-unsafe-eval'", "'unsafe-inline'", "https://cdn.plot.ly", "https://cdn.jsdelivr.net"],
                "style-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
                "font-src": ["'self'", "https://cdn.jsdelivr.net"],
                "img-src": ["'self'", "data:"],
                "connect-src": ["'self'"]
            }
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: {policy: "cross-origin"},
    })
);

app.use(express.static(path.join(__dirname, "../../", 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use('/', authRoutes);
app.use('/', visitorTracker);

app.use('/admin', verifyToken, authRole('admin'), adminRoutes);
app.use('/admin', verifyToken, authRole('admin'), adminStatsRoutes);

app.use('/api/horizons', horizonRoutes);

const key = fs.readFileSync('/certs/localhost+1-key.pem');
const cert = fs.readFileSync('/certs/localhost+1.pem');

https.createServer({key, cert}, app)
    .listen(3005, () => {
        console.log('HTTPS Server running: https://localhost:3005');
    });