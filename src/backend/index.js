require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const favicon = require('serve-favicon');

require('module-alias/register');

const horizonRoutes = require('./routes/horizonRoutes');
const adminRoutes = require('./routes/admin');
const adminStatsRoutes = require('./routes/adminStats');
const visitorTracker = require('./routes/visitorTracker');
const { verifyToken, authRole } = require('./middlewares/auth');
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
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
};
app.use(cors(corsOptions));

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

const isProd = process.env.NODE_ENV === "production";

app.use(
    helmet({
        /* ───────── HSTS ───────── */
        strictTransportSecurity: isProd
            ? {
                maxAge: 63072000,
                includeSubDomains: true,
                preload: true,
            }
            : false,
        /* ────── Content-Security-Policy ────── */
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                "default-src": ["'self'"],
                "script-src": [
                    "'self'",
                    "'wasm-unsafe-eval'",
                    "'unsafe-inline'",
                    "https://cdn.plot.ly",
                    "https://cdn.jsdelivr.net",
                ],
                "style-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
                "font-src": ["'self'", "https://cdn.jsdelivr.net"],
                "img-src": ["'self'", "data:", "blob:"],
                "connect-src": ["'self'"],
                "upgrade-insecure-requests": [],
            },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
);

app.use(favicon(path.join(__dirname, '../../', 'public', 'favicon.ico')));

app.use(express.static(path.join(__dirname, "../../", 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use('/', authRoutes);
app.use('/', visitorTracker);

app.use('/admin', verifyToken, authRole('admin'), adminRoutes);
app.use('/admin', verifyToken, authRole('admin'), adminStatsRoutes);

app.use('/api/horizons', horizonRoutes);

app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, '../../', 'public', '404.html'));
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});