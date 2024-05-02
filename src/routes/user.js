const router = require('express').Router();
const pool = require('../database/database');
const { body, oneOf, param, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');


// Delete a user - require password
router.delete('/:id', [
    param('id', 'User ID is required and must be a positive integer').exists().isInt({ min: 0 }),
    body('password', 'Password is required and must be a string').exists().isString()
], async (req, res) => {
    try {
        if (!validationResult(req).isEmpty()) {
            return res.status(400).json({ errors: validationResult(req).array() });
        }

        const { id } = req.params;
        const { password } = req.body;

        const hashedPassword = await pool.query(`
        SELECT user_password FROM gutenberg_common.user
        WHERE user_uid = $1;
        `, [id]).then((response) => {
            return response.rows[0]?.user_password;
        });

        if (!hashedPassword) {
            return res.status(400).send("User not found");
        }

        const passwordCorrect = await bcrypt.compare(password, hashedPassword);

        if (passwordCorrect === false) {
            return res.status(401).send("Invalid password");
        }

        const deleteUser = await pool.query(`
            DELETE FROM gutenberg_common.user
            WHERE user_uid = $1
            RETURNING user_uid;
        `, [id]).then((response) => {
            return response.rows[0].user_uid;
        });


        res.json(deleteUser);
    } catch (err) {
        console.log(err);
        res.status(500).send("Server Error");
    }
});

// Get a user by ID
router.get('/:id', [
    param('id', 'User ID is required and must be a positive integer').exists().isInt({ min: 0 })
], async (req, res) => {
    try {
        if (!validationResult(req).isEmpty()) {
            return res.status(400).json({ errors: validationResult(req).array() });
        }

        const { id } = req.params;

        const getUser = await pool.query(`
            SELECT user_email, user_firstname, user_lastname FROM gutenberg_common.user
            WHERE user_uid = $1
        `, [id]).then((response) => {
            return response.rows[0];
        });

        if (!getUser) {
            return res.status(404).send("User not found");
        }

        res.json(getUser);
    } catch (err) {
        console.log(err);
        res.status(500).send("Server Error");
    }
});

// Update a user
router.put('/:id', [
    param('id', 'User ID is required and must be a positive integer').exists().isInt({ min: 0 }),
    oneOf(
        [
            body('firstName', 'You must update atleast one of the following: First Name, Last Name, Password, all of these values must be strings').optional().isString(),
            body('lastName', 'You must update atleast one of the following: First Name, Last Name, Password, all of these values must be strings').optional().isString(),
            body('password', 'You must update atleast one of the following: First Name, Last Name, Password, all of these values must be strings').optional().isString()
        ],
        'You must update atleast one of the following: First Name, Last Name, Password'
    )
], async (req, res) => {
    try {
        if (!validationResult(req).isEmpty()) {
            return res.status(400).json({ errors: validationResult(req).array() });
        }

        const { id } = req.params;
        const { firstName, lastName, password } = req.body;

        const userExists = await pool.query(`
            SELECT EXISTS(
                SELECT user_uid FROM gutenberg_common.user
                WHERE user_uid = $1
            );
        `, [id]).then((response) => {
            return response.rows[0].exists;
        });

        if (!userExists) {
            return res.status(400).send("User not found");
        }
        
        const saltRounds = 10;
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedPassword = await bcrypt.hash(password, salt);

        const updateUser = await pool.query(`
            UPDATE gutenberg_common.user
            SET user_firstname = COALESCE($1, user_firstname),
            user_lastname = COALESCE($2, user_lastname),
            user_password = COALESCE($3, user_password)
            WHERE user_uid = $4
            RETURNING user_uid;
        `, [firstName, lastName, hashedPassword, id]).then((response) => {
            return response.rows[0].user_uid;
        });


        res.json(updateUser);
    } catch (err) {
        console.log(err);
        res.status(500).send("Server Error");
    }
});

// Get all reading lists for a user
router.get('/:id/readingLists', [
    param('id', 'User ID is required and must be a positive integer').exists().isInt({ min: 0 })
], async (req, res) => {
    try {
        if (!validationResult(req).isEmpty()) {
            return res.status(400).json({ errors: validationResult(req).array() });
        }

        const { id } = req.params;

        const userExists = await pool.query(`
        SELECT EXISTS(
            SELECT user_uid FROM gutenberg_common.user
            WHERE user_uid = $1
        );
        `, [id]).then((response) => {
            return response.rows[0].exists;
        });

        if (!userExists) {
            return res.status(400).send("User not found");
        }

        const getReadingLists = await pool.query(`
            SELECT * FROM gutenberg_common.reading_list
            WHERE user_id = $1
        `, [id]).then((response) => {
            return response.rows;
        });

        res.json(getReadingLists);
    } catch (err) {
        console.log(err);
        res.status(500).send("Server Error");
    }
});

module.exports = router;