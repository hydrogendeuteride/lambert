const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: {
        type: String, 
        required: true, 
        unique: true 
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: { 
        type: String, 
        required: true 
    },
    role: {
        type: String,
        default: 'user',
        enum: ['user', 'admin']
    },
      date: {
        type: Date,
        default: Date.now
    }
});

UserSchema.pre('save', async function(next) {
    if (this.isModified('password') || this.isNew)
    {
      this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

module.exports = mongoose.model('User', UserSchema);