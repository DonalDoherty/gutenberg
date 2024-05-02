const router = require('express').Router();
const pool = require('../../database/database');
const { check, oneOf, param, validationResult } = require('express-validator');

// Create a reading list
router.post('/', [
    check('userUid', 'User ID is required and must be a positive integer').exists().isInt({ min: 0 }),
    check('title', 'Title is required and must be a string').exists().isString(),
], async (req, res) => {
    try {
        if (!validationResult(req).isEmpty()) {
            return res.status(400).json({ errors: validationResult(req).array() });
        }

        const { userUid, title } = req.body;

        const createReadingList = await pool.query(`
            INSERT INTO gutenberg_common.reading_list (user_uid, title)
            VALUES ($1, $2)
            RETURNING reading_list_uid;
        `, [userUid, title]).then((response) => {
            return response.rows[0].reading_list_uid;
        });

        res.json(createReadingList);
    } catch (err) {
        console.log(err);
        res.status(500).send("Server Error");
    }
});

// Delete a reading list
router.delete('/:id', [
    param('id', 'Reading List ID is required and must be a positive integer').exists().isInt({ min: 0 }),
], async (req, res) => {
    try {
        if (!validationResult(req).isEmpty()) {
            return res.status(400).json({ errors: validationResult(req).array() });
        }

        const { id } = req.params;

        const deleteReadingList = await pool.query(`
            DELETE FROM gutenberg_common.reading_list
            WHERE reading_list_uid = $1
            RETURNING reading_list_uid;
        `, [id]).then((response) => {
            return response.rows[0].reading_list_uid;
        });

        if (!deleteReadingList) {
            return res.status(400).send("Reading List not found");
        }

        res.json(deleteReadingList);
    } catch (err) {
        console.log(err);
        res.status(500).send("Server Error");
    }
});

// Get a reading list by ID
router.get('/:id', [
    param('id', 'Reading List ID is required and must be a positive integer').exists().isInt({ min: 0 }),
], async (req, res) => {
    try {
        const { id } = req.params;

        const getReadingList = await pool.query(`
            SELECT * FROM gutenberg_common.reading_list
            WHERE reading_list_uid = $1
        `, [id]).then((response) => {
            return response.rows[0];
        });

        if (!getReadingList) {
            return res.status(404).send("Reading List not found");
        }

        res.json(getReadingList);
    } catch (err) {
        console.log(err);
        res.status(500).send("Server Error");
    }
});

// Update a reading list
router.put('/:id', [
    param('id', 'Reading List ID is required and must be a positive integer').exists(),
    check('title', 'Title is required and must be a string').exists().isString(),
], async (req, res) => {
    try {
        if (!validationResult(req).isEmpty()) {
            return res.status(400).json({ errors: validationResult(req).array() });
        }

        const { id } = req.params;
        const { title } = req.body;

        const updateReadingList = await pool.query(`
            UPDATE gutenberg_common.reading_list
            SET title = COALESCE($1, title)
            WHERE reading_list_uid = $2
            RETURNING reading_list_uid;
        `, [title, id]).then((response) => {
            return response.rows[0].reading_list_uid;
        });

        if (!updateReadingList) {
            return res.status(400).send("Reading List not found");
        }

        res.json(updateReadingList);
    } catch (err) {
        console.log(err);
        res.status(500).send("Server Error");
    }
});

// Get all books for a reading list, optional filters
router.get('/books/:id', [
    param('id', 'Reading List ID is required and must be a positive integer').exists().isInt({ min: 0 }),
    check('isbn13', 'ISBN-13 must be a valid ISBN').optional().isISBN(13),
    check('isbn10', 'ISBN-10 must be a valid ISBN').optional().isISBN(10),
    check('title', 'Title must be a string').optional().isString(),
    check('author', 'Author must be a string').optional().isString(),
    check('publisher', 'Publisher must be a string').optional().isString(),
    check('publicationDateStart', 'Publication Date Start must be a date').optional().isDate(),
    check('publicationDateEnd', 'Publication Date End must be a date').optional().isDate(),
    check('edition', 'Edition must be a string').optional().isString(),
    check('genre', 'Genre must be a string').optional().isString(),
    check('language', 'Language must be a string').optional().isString(),
    check('pageCountMin', 'Page Count Min must be a positive integer').optional().isInt({min: 0}),
    check('pageCountMax', 'Page Count Max must be a positive integer').optional().isInt({min: 0}),
    check('summary', 'Summary must be a string').optional().isString()
], async (req, res) => {
    try {
        const { id } = req.params;
        const { isbn13, isbn10, title, author, publisher, publicationDateStart, publicationDateEnd,
            edition, genre, language, pageCountMin, pageCountMax, summaryContains } = req.body;

        const readingListExists = await pool.query(`
            SELECT EXISTS(
                SELECT reading_list_uid FROM gutenberg_common.reading_list
                WHERE reading_list_uid = $1
            );
            `, [id]).then((response) => {
            return response.rows[0].exists;
        });

        if (!readingListExists) {
            return res.status(400).send("Reading List not found");
        }

        const getBooks = await pool.query(`
            SELECT t1.* FROM gutenberg_common.book t1, gutenberg_common.reading_list_matrix t2
            WHERE t1.isbn13 = COALESCE($1, t1.isbn13)
            AND t1.isbn10 = COALESCE($2, t1.isbn10)
            AND t1.title = COALESCE($3, t1.title)
            AND t1.author = COALESCE($4, t1.author)
            AND t1.publisher = COALESCE($5, t1.publisher)
            AND t1.publication_date >= COALESCE($6, t1.publication_date)
            AND t1.publication_date <= COALESCE($7, t1.publication_date)
            AND t1.edition = COALESCE($8, t1.edition)
            AND t1.genre = COALESCE($9, t1.genre)
            AND t1.language = COALESCE($10, t1.language)
            AND t1.page_count >= COALESCE($11, t1.page_count)
            AND t1.page_count <= COALESCE($12, t1.page_count)
            AND t1.summary LIKE COALESCE($13, t1.summary)
            AND t1.book_uid = t2.book_id
            AND t2.reading_list_uid = $14;
            `, [isbn13, isbn10, title, author, publisher, publicationDateStart, publicationDateEnd,
            edition, genre, language, pageCountMin, pageCountMax, summaryContains, id]).then((response) => {
            return response.rows;
        });

        res.json(getBooks);
    } catch (err) {
        console.log(err);
        res.status(500).send("Server Error");
    }
});


module.exports = router;