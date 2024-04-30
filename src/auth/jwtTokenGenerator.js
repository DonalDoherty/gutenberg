const jwt = require('jsonwebtoken');
require('dotenv').config();

function generateAccessToken(user_id) {
    const payload = { 
        user_id: user_id
    };

    return jwt.sign(payload, process.env.jwtSecret, { expiresIn: '1h' });
}

module.exports = generateAccessToken;