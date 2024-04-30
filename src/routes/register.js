const router = require('express').Router();
const pool = require('../database/database');
const bcrypt = require('bcrypt');
const jwtTokenGenerator = require('../auth/jwtTokenGenerator');

router.post('/', async (req, res) => {
    try {
        const { userFirstname, userLastname, userEmail, userPassword, registrationKey} = req.body;

        const userExists = await pool.query(`
            SELECT EXISTS(
                SELECT user_uid FROM gutenberg_common.user
                WHERE user_email = $1
            );
        `, [userEmail]).then((response) => {
            return response.rows[0].exists;
        });

        if (userExists) {
            return res.status(401).send("User already exists");
        }

        const registrationKeyUsed = await pool.query(`
            SELECT used FROM gutenberg_common.registration_key
            WHERE key_code = $1;
        `, [registrationKey]).then((response) => {
            return response.rows[0].used;
        });

        if (registrationKeyUsed === undefined || registrationKeyUsed === true) {
            return res.status(401).send("Invalid registration key or key already used");
        } else {
           await pool.query(`
                UPDATE gutenberg_common.registration_key
                SET used = true
                WHERE key_code = $1;
            `, [registrationKey]);
        }

        const saltRounds = 10;
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedPassword = await bcrypt.hash(userPassword, salt);

        const registerUser = await pool.query(`
            INSERT INTO gutenberg_common.user (user_firstname, user_lastname, user_email, user_password)
            VALUES ($1, $2, $3, $4)
            RETURNING user_uid;
        `, [userFirstname, userLastname, userEmail, hashedPassword]).then((response) => {
            return response.rows[0].user_uid;
        });
        
        const token = jwtTokenGenerator(registerUser);
        
        res.json(token);
    } catch (err) {
        console.error(err.message + err.stack);
        res.status(500).send("Server Error");
    }
});


module.exports = router;