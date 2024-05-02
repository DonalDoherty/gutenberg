const router = require('express').Router();
const pool = require('../database/database');
const bcrypt = require('bcrypt');
const jwtTokenGenerator = require('../auth/jwtTokenGenerator');
const { body, validationResult } = require('express-validator');

router.post('/', [
    body('email', 'Email is required and must be a valid email').exists().isEmail(),
    body('password', 'Password is required and must be a string').exists().isString()
], async (req, res) => {
    try {
        if (!validationResult(req).isEmpty()) {
            return res.status(400).json({ errors: validationResult(req).array() });
        }

        const { email, password } = req.body;

        const userExists = await pool.query(`
            SELECT EXISTS(
                SELECT user_uid FROM gutenberg_common.user
                WHERE user_email = $1
            );
        `, [email]).then((response) => {
            return response.rows[0].exists;
        });

        if (userExists === false) {
            return res.status(401).send("Invalid email or password");
        }

        const user = await pool.query(`
            SELECT * FROM gutenberg_common.user
            WHERE user_email = $1;
        `, [email]).then((response) => {
            return response.rows[0];
        });

        const passwordCorrect = await bcrypt.compare(password, user.user_password);

        if (passwordCorrect === false) {
            return res.status(401).send("Invalid email or password");
        }

        const token = jwtTokenGenerator(user.user_uid);

        res.json(token);
    } catch (err) {
        console.log(err);
        res.status(500).send("Server Error");
    }
});


module.exports = router;