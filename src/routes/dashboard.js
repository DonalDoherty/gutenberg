const router = require('express').Router();
const pool = require('../database/database');
const authorization = require('../auth/authorization');

router.post('/', authorization, async (req, res) => {
    try {

    } catch (err) {
        res.status(500).send("Server Error");
    }
});


module.exports = router;