const router = require('express').Router();
const pool = require('../database/database');
const { body, param, validationResult } = require('express-validator');

// Create a reading list
router.post('/', [
    body('userId', 'User ID is required and must be a positive integer').exists().isInt({ min: 0 }),
    body('title', 'Title is required and must be a string').exists().isString(),
], async (req, res) => {
    try {
        if (!validationResult(req).isEmpty()) {
            return res.status(400).json({ errors: validationResult(req).array() });
        }

        const { userId, title } = req.body;

        const createReadingList = await pool.query(`
            INSERT INTO gutenberg_common.reading_list (user_id, title)
            VALUES ($1, $2)
            RETURNING reading_list_uid;
        `, [userId, title]).then((response) => {
            return response.rows[0].reading_list_uid;
        });

        res.json(createReadingList);
    } catch (err) {
        console.log(err);
        res.status(500).send('Server Error');
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
            return res.status(400).send('Reading List not found');
        }

        res.json(deleteReadingList);
    } catch (err) {
        console.log(err);
        res.status(500).send('Server Error');
    }
});

// Get a reading list by ID
router.get('/:id', [
    param('id', 'Reading List ID is required and must be a positive integer').exists().isInt({ min: 0 }),
], async (req, res) => {
    try {
        if (!validationResult(req).isEmpty()) {
            return res.status(400).json({ errors: validationResult(req).array() });
        }

        const { id } = req.params;

        const getReadingList = await pool.query(`
            SELECT * FROM gutenberg_common.reading_list
            WHERE reading_list_uid = $1
        `, [id]).then((response) => {
            return response.rows[0];
        });

        if (!getReadingList) {
            return res.status(404).send('Reading List not found');
        }

        res.json(getReadingList);
    } catch (err) {
        console.log(err);
        res.status(500).send('Server Error');
    }
});

// Update a reading list
router.put('/:id', [
    param('id', 'Reading List ID is required and must be a positive integer').exists(),
    body('title', 'Title is required and must be a string').exists().isString(),
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
            return res.status(400).send('Reading List not found');
        }

        res.json(updateReadingList);
    } catch (err) {
        console.log(err);
        res.status(500).send('Server Error');
    }
});

// Get all books for a reading list, optional filters
router.get('/:id/books', [
    param('id', 'Reading List ID is required and must be a positive integer').exists().isInt({ min: 0 }),
    body('isbn13', 'ISBN-13 must be a valid ISBN').optional().isISBN(13),
    body('isbn10', 'ISBN-10 must be a valid ISBN').optional().isISBN(10),
    body('title', 'Title must be a string').optional().isString(),
    body('author', 'Author must be a string').optional().isString(),
    body('publisher', 'Publisher must be a string').optional().isString(),
    body('publicationDateStart', 'Publication Date Start must be a date').optional().isDate(),
    body('publicationDateEnd', 'Publication Date End must be a date').optional().isDate(),
    body('edition', 'Edition must be a string').optional().isString(),
    body('genre', 'Genre must be a string').optional().isString(),
    body('language', 'Language must be a string').optional().isString(),
    body('pageCountMin', 'Page Count Min must be a positive integer').optional().isInt({ min: 0 }),
    body('pageCountMax', 'Page Count Max must be a positive integer').optional().isInt({ min: 0 }),
    body('summary', 'Summary must be a string').optional().isString(),
    body('statusId', 'Status ID must be a positive integer').optional().isInt({ min: 0 })
], async (req, res) => {
    try {
        if (!validationResult(req).isEmpty()) {
            return res.status(400).json({ errors: validationResult(req).array() });
        }

        const { id } = req.params;

        const { isbn13, isbn10, title, author, publisher, publicationDateStart, publicationDateEnd,
            edition, genre, language, pageCountMin, pageCountMax, summaryContains, statusId } = req.body;

        const readingListExists = await pool.query(`
            SELECT EXISTS(
                SELECT reading_list_uid FROM gutenberg_common.reading_list
                WHERE reading_list_uid = $1
            );
            `, [id]).then((response) => {
            return response.rows[0].exists;
        });

        if (!readingListExists) {
            return res.status(400).send('Reading List not found');
        }

        const getBooks = await pool.query(`
            SELECT t1.* FROM gutenberg_common.book t1, gutenberg_common.reading_list_matrix t2
            WHERE t1.isbn13 ILIKE COALESCE('%' || $1 || '%', t1.isbn13)
            AND t1.isbn10 ILIKE COALESCE('%' || $2 || '%',  t1.isbn10 )
            AND t1.title ILIKE COALESCE('%' || $3 || '%',  t1.title )
            AND t1.author ILIKE COALESCE('%' || $4 || '%',  t1.author )
            AND t1.publisher ILIKE COALESCE('%' || $5 || '%',  t1.publisher )
            AND t1.publication_date >= COALESCE($6 , t1.publication_date)
            AND t1.publication_date <= COALESCE($7, t1.publication_date)
            AND t1.edition ILIKE COALESCE('%' || $8 || '%',  t1.edition )
            AND t1.genre ILIKE COALESCE('%' || $9 || '%',  t1.genre )
            AND t1.language ILIKE COALESCE('%' || $10 || '%',  t1.language )
            AND t1.page_count >= COALESCE($11, t1.page_count)
            AND t1.page_count <= COALESCE($12, t1.page_count)
            AND t1.summary ILIKE COALESCE('%' || $13 || '%',  t1.summary )
            AND t2.status_id = COALESCE($14, t2.status_id)
            AND t1.book_uid = t2.book_id
            AND t2.reading_list_id = $15;
            `, [isbn13, isbn10, title, author, publisher, publicationDateStart, publicationDateEnd,
            edition, genre, language, pageCountMin, pageCountMax, summaryContains, statusId, id]).then((response) => {
                return response.rows;
            });

        res.json(getBooks);
    } catch (err) {
        console.log(err);
        res.status(500).send('Server Error');
    }
});

// Add a book to a reading list
router.post('/:id/book', [
    param('id', 'Reading List ID is required and must be a positive integer').exists().isInt({ min: 0 }),
    body('bookId', 'Book ID is required and must be a positive integer').exists().isInt({ min: 0 }),
    body('statusId', 'Status ID is required and must be a positive integer').exists().isInt({ min: 0 })
], async (req, res) => {
    try {
        if (!validationResult(req).isEmpty()) {
            return res.status(400).json({ errors: validationResult(req).array() });
        }

        const { id } = req.params;
        const { bookId, statusId } = req.body;

        const readingListExists = await pool.query(`
            SELECT EXISTS(
                SELECT reading_list_uid FROM gutenberg_common.reading_list
                WHERE reading_list_uid = $1
            );
        `, [id]).then((response) => {
            return response.rows[0].exists;
        });

        if (!readingListExists) {
            return res.status(400).send('Reading List not found');
        }

        const bookExists = await pool.query(`
            SELECT EXISTS(
                SELECT book_uid FROM gutenberg_common.book
                WHERE book_uid = $1
            );
        `, [bookId]).then((response) => {
            return response.rows[0].exists;
        });

        if (!bookExists) {
            return res.status(400).send('Book not found');
        }

        const checkBookInReadingList = await pool.query(`
            SELECT EXISTS(
                SELECT reading_list_matrix_uid FROM gutenberg_common.reading_list_matrix
                WHERE reading_list_id = $1
                AND book_id = $2
            );
        `, [id, bookId]).then((response) => {
            return response.rows[0].exists;
        });

        if (checkBookInReadingList) {
            return res.status(400).send('Book already in Reading List');
        }

        const statusValid = await pool.query(`
            SELECT EXISTS(
                SELECT lu_book_status_uid FROM gutenberg_common.lu_book_status
                WHERE lu_book_status_uid = $1
            );
        `, [statusId]).then((response) => {
            return response.rows[0].exists;
        });

        if (!statusValid) {
            return res.status(400).send('Invalid book status');
        }

        const addBookToReadingList = await pool.query(`
            INSERT INTO gutenberg_common.reading_list_matrix (reading_list_id, book_id, status_id)
            VALUES ($1, $2, $3)
            RETURNING reading_list_matrix_uid;
        `, [id, bookId, statusId]).then((response) => {
            return response.rows[0].reading_list_matrix_uid;
        });

        res.json(addBookToReadingList);
    } catch (err) {
        console.log(err);
        res.status(500).send('Server Error');
    }
});

// Remove a book from a reading list
router.delete('/:readingListId/book/:bookId', [
    param('readingListId', 'Reading List ID is required and must be a positive integer').exists().isInt({ min: 0 }),
    param('bookId', 'Book ID is required and must be a positive integer').exists().isInt({ min: 0 }),
], async (req, res) => {
    try {
        if (!validationResult(req).isEmpty()) {
            return res.status(400).json({ errors: validationResult(req).array() });
        }

        const { readingListId, bookId } = req.params;

        const readingListExists = await pool.query(`
            SELECT EXISTS(
                SELECT reading_list_uid FROM gutenberg_common.reading_list
                WHERE reading_list_uid = $1
            );
        `, [readingListId]).then((response) => {
            return response.rows[0].exists;
        });

        if (!readingListExists) {
            return res.status(400).send('Reading List not found');
        }

        const removeBookFromReadingList = await pool.query(`
            DELETE FROM gutenberg_common.reading_list_matrix
            WHERE reading_list_id = $1
            AND book_id = $2
            RETURNING reading_list_matrix_uid;
        `, [readingListId, bookId]).then((response) => {
            return response.rows[0]?.reading_list_matrix_uid;
        });

        if (!removeBookFromReadingList) {
            return res.status(400).send('Book not found in Reading List');
        }

        res.json(removeBookFromReadingList);
    } catch (err) {
        console.log(err);
        res.status(500).send('Server Error');
    }
});

// Update book status in a reading list
router.put('/:readingListId/book/:bookId', [
    param('readingListId', 'Reading List ID is required and must be a positive integer').exists().isInt({ min: 0 }),
    param('bookId', 'Book ID is required and must be a positive integer').exists().isInt({ min: 0 }),
    body('statusId', 'Status ID is required and must be a positive integer').exists().isInt({ min: 0 })
], async (req, res) => {
    try {
        if (!validationResult(req).isEmpty()) {
            return res.status(400).json({ errors: validationResult(req).array() });
        }

        const { readingListId, bookId } = req.params;
        const { statusId } = req.body;

        const readingListExists = await pool.query(`
            SELECT EXISTS(
                SELECT reading_list_uid FROM gutenberg_common.reading_list
                WHERE reading_list_uid = $1
            );
        `, [readingListId]).then((response) => {
            return response.rows[0].exists;
        });

        if (!readingListExists) {
            return res.status(400).send('Reading List not found');
        }

        const bookExists = await pool.query(`
            SELECT EXISTS(
                SELECT book_uid FROM gutenberg_common.book
                WHERE book_uid = $1
            );
        `, [bookId]).then((response) => {
            return response.rows[0].exists;
        });

        if (!bookExists) {
            return res.status(400).send('Book not found');
        }

        const statusValid = await pool.query(`
            SELECT EXISTS(
                SELECT lu_book_status_uid FROM gutenberg_common.lu_book_status
                WHERE lu_book_status_uid = $1
            );
        `, [statusId]).then((response) => {
            return response.rows[0].exists;
        });

        if (!statusValid) {
            return res.status(400).send('Invalid book status');
        }

        const updateBookStatus = await pool.query(`
            UPDATE gutenberg_common.reading_list_matrix
            SET status_id = $1
            WHERE reading_list_id = $2
            AND book_id = $3
            RETURNING reading_list_matrix_uid;
        `, [statusId, readingListId, bookId]).then((response) => {
            return response.rows[0]?.reading_list_matrix_uid;
        });

        if (!updateBookStatus) {
            return res.status(400).send('Book not found in Reading List');
        }

        res.json(updateBookStatus);
    } catch (err) {
        console.log(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;