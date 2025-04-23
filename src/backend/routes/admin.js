const express = require('express');
const {verifyToken, authRole} = require('../middlewares/auth');
const User = require('../models/user');
const {verify} = require('jsonwebtoken');
const router = express.Router();

router.get('/dashboard', (req, res) =>{
    res.sendFile('admin/dashboard.html', {root: 'public'});
});

router.get('/users', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

router.delete('/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({message: 'User Deleted'});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

module.exports = router;