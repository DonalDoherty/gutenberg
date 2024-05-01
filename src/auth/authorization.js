const jwt = require('jsonwebtoken');
const {check, validationResult} = require('express-validator');

module.exports = async(req, res, next) => {
    const token = req.header('token');
    if (!token) {
        return res.status(403).send("Not Authorized");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({msg: "Token is not valid"});
    }
}