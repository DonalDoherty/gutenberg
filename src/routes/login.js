const router = require('express').Router();
const pool = require('../database/database');
const bcrypt = require('bcrypt');
const jwtTokenGenerator = require('../auth/jwtTokenGenerator');

router.post('/', async (req, res) => {
    try {
        const { userEmail, userPassword } = req.body;

        const userExists = await pool.query(`
            SELECT EXISTS(
                SELECT user_uid FROM gutenberg_common.user
                WHERE user_email = $1
            );
        `, [userEmail]).then((response) => {
            return response.rows[0].exists;
        });

        if (userExists === false) {
            return res.status(401).send("Invalid email or password");
        }

        const user = await pool.query(`
            SELECT * FROM gutenberg_common.user
            WHERE user_email = $1;
        `, [userEmail]).then((response) => {
            return response.rows[0];
        });

        const passwordCorrect = await bcrypt.compare(userPassword, user.user_password);

        if (passwordCorrect === false) {
            return res.status(401).send("Invalid email or password");
        }

        const token = jwtTokenGenerator(user.user_uid);

        res.json(token);
    } catch (err) {
        console.error(err.message + err.stack);
        res.status(500).send("Server Error");
    }
});


module.exports = router;