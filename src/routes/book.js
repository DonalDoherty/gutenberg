const router = require('express').Router();
const pool = require('../database/database');
const { body, oneOf, param, validationResult } = require('express-validator');
const methods = require('../common/methods');

// Create a book
router.post('/', [
    oneOf(
        [
            body('isbn13', 'Atleast one valid ISBN type is required').exists().isISBN(13),
            body('isbn10', 'Atleast one valid ISBN type is required').exists().isISBN(10)
        ]
    ),
    body('title', 'Title is required and must be a string').exists().isString(),
    body('author', 'Author is required and must be a string').exists().isString(),
    body('publisher', 'Publisher must be a string').optional().isString(),
    body('publicationDate', 'Publication Date must be a valid date').optional().isDate(),
    body('edition', 'Edition must be a string').optional().isString(),
    body('genre', 'Genre must be a string').optional().isString(),
    body('language', 'Language must be a string').optional().isString(),
    body('pageCount', 'Page Count must be a positive integer').optional().isInt({ min: 0 }),
    body('summary', 'Summary must be a string').optional().isString()
], async (req, res) => {
    try {
        if (!validationResult(req).isEmpty()) {
            return res.status(400).json({ errors: validationResult(req).array() });
        }

        const { isbn13, isbn10, title, author, publisher, publicationDate, edition, genre, language, pageCount, summary } = req.body;

        const { isbn13InUse, isbn10InUse } = await isbnInUse(isbn13, isbn10);
        if (isbn13InUse && isbn10InUse) {
            return res.status(400).send('Book already exists');
        } else if (isbn13InUse) {
            return res.status(400).send('ISBN-13 already in use');
        } else if (isbn10InUse) {
            return res.status(400).send('ISBN-10 already in use');
        }

        const createBook = await pool.query(`
            INSERT INTO gutenberg_common.book (
                isbn13, isbn10, title, author, publisher, publication_date, 
                edition, genre, language, page_count, summary
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING book_uid;
        `, [isbn13, isbn10, title, author, publisher, publicationDate, edition, genre, language, pageCount, summary]).then((response) => {
            return response.rows[0].book_uid;
        });

        res.json(createBook);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Delete a book
router.delete('/:id', [
    param('id', 'Book ID is required and must be a positive integer').exists().isInt({ min: 0 })
], async (req, res) => {
    try {
        if (!validationResult(req).isEmpty()) {
            return res.status(400).json({ errors: validationResult(req).array() });
        }

        const { id } = req.params;

        const deleteBook = await pool.query(`
            DELETE FROM gutenberg_common.book
            WHERE book_uid = $1
            RETURNING book_uid;
        `, [id]).then((response) => {
            return response.rows[0]?.book_uid;
        });

        if (!deleteBook) {
            return res.status(400).send('Book not found');
        }

        res.json(deleteBook);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Get a book by ID
router.get('/:id', [
    param('id', 'Book ID is required and must be a positive integer').exists().isInt({ min: 0 })
], async (req, res) => {
    try {
        if (!validationResult(req).isEmpty()) {
            return res.status(400).json({ errors: validationResult(req).array() });
        }

        const { id } = req.params;

        const getBook = await pool.query(`
            SELECT * FROM gutenberg_common.book
            WHERE book_uid = $1
        `, [id]).then((response) => {
            return response?.rows[0];
        });

        if (!getBook) {
            return res.status(404).send('Book not found');
        }

        res.json(getBook);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Update a book
router.put('/:id', [
    param('id', 'Book ID is required and must be a positive integer').exists().isInt({ min: 0 }),
    oneOf(
        [
            body('isbn13', 'Atleast one valid ISBN type is required').optional().isISBN(13),
            body('isbn10', 'Atleast one valid ISBN type is required').optional().isISBN(10)
        ]
    ),
    body('title', 'Title is required and must be a string').exists().isString(),
    body('author', 'Author is required and must be a string').exists().isString(),
    body('publisher', 'Publisher must be a string').optional().isString(),
    body('publicationDate', 'Publication Date must be a valid date').optional().isDate(),
    body('edition', 'Edition must be a string').optional().isString(),
    body('genre', 'Genre must be a string').optional().isString(),
    body('language', 'Language must be a string').optional().isString(),
    body('pageCount', 'Page Count must be a positive integer').optional().isInt({ min: 0 }),
    body('summary', 'Summary must be a string').optional().isString()
], async (req, res) => {
    try {
        if (!validationResult(req).isEmpty()) {
            return res.status(400).json({ errors: validationResult(req).array() });
        }

        const { id } = req.params;
        const { isbn13, isbn10, title, author, publisher, publicationDate, edition, genre, language, pageCount, summary } = req.body;

        if (!await methods.bookExists(id)) {
            return res.status(404).send('Book not found');
        }

        const { isbn13InUse, isbn10InUse } = await isbnInUse(isbn13, isbn10);
        if (isbn13InUse) {
            return res.status(400).send('ISBN-13 already in use');
        } else if (isbn10InUse) {
            return res.status(400).send('ISBN-10 already in use');
        }

        const updateBook = await pool.query(`
            UPDATE gutenberg_common.book
            SET isbn13 = COALESCE($1, isbn13),
                isbn10 = COALESCE($2, isbn10),
                title = COALESCE($3, title),
                author = COALESCE($4, author),
                publisher = COALESCE($5, publisher),
                publication_date = COALESCE($6, publication_date),
                edition = COALESCE($7, edition),
                genre = COALESCE($8, genre),
                language = COALESCE($9, language),
                page_count = COALESCE($10, page_count),
                summary = COALESCE($11, summary)
            WHERE book_uid = $12
            RETURNING book_uid;
            `, [isbn13, isbn10, title, author, publisher, publicationDate, edition, genre, language, pageCount, summary, id]).then((response) => {
            return response.rows[0].book_uid;
        });

        if (!updateBook) {
            return res.status(400).send('Book not found');
        }

        res.json(updateBook);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Get books with filters
router.get('/', [
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
    body('summaryContains', 'Summary Contains must be a string').optional().isString()
], async (req, res) => {
    try {
        if (!validationResult(req).isEmpty()) {
            return res.status(400).json({ errors: validationResult(req).array() });
        }

        const { isbn13, isbn10, title, author, publisher, publicationDateStart, publicationDateEnd,
            edition, genre, language, pageCountMin, pageCountMax, summaryContains } = req.body;

        const getBooks = await pool.query(`
            SELECT * FROM gutenberg_common.book
            WHERE COALESCE(isbn13, '') ILIKE COALESCE('%' || $1 || '%', isbn13, '')
            AND COALESCE(isbn10, '') ILIKE COALESCE('%' || $2 || '%',  isbn10, '')
            AND title ILIKE COALESCE('%' || $3 || '%',  title, '')
            AND author ILIKE COALESCE('%' || $4 || '%',  author, '')
            AND COALESCE(publisher, '') ILIKE COALESCE('%' || $5 || '%',  publisher, '')
            AND COALESCE(publication_date, NOW()) >= COALESCE($6 , publication_date, NOW())
            AND COALESCE(publication_date, NOW()) <= COALESCE($7, publication_date, NOW())
            AND COALESCE(edition, '') ILIKE COALESCE('%' || $8 || '%',  edition, '')
            AND COALESCE(genre, '') ILIKE COALESCE('%' || $9 || '%',  genre, '')
            AND COALESCE(language, '') ILIKE COALESCE('%' || $10 || '%',  language, '')
            AND COALESCE(page_count, 0) >= COALESCE($11, page_count, 0)
            AND COALESCE(page_count, 0) <= COALESCE($12, page_count, 0)
            AND COALESCE(summary, '') ILIKE COALESCE('%' || $13 || '%',  summary, '');
            `, [isbn13, isbn10, title, author, publisher, publicationDateStart, publicationDateEnd,
            edition, genre, language, pageCountMin, pageCountMax, summaryContains]).then((response) => {
                return response.rows;
            });

        res.json(getBooks);
    }
    catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

const isbnInUse = async (isbn13, isbn10) => {
    let isbn13InUse = false;
    let isbn10InUse = false;
    if (isbn13) {
        isbn13InUse = await pool.query(`
            SELECT EXISTS(
                SELECT book_uid FROM gutenberg_common.book
                WHERE isbn13 = $1
            );
            `, [isbn13]).then((response) => {
            return response.rows[0].exists;
        });
    }
    if (isbn10) {
        isbn10InUse = await pool.query(`
                SELECT EXISTS(
                    SELECT book_uid FROM gutenberg_common.book
                    WHERE isbn10 = $1
                );
                `, [isbn10]).then((response) => {
            return response.rows[0].exists;
        });
    }
    return {
        isbn13InUse,
        isbn10InUse
    }
}

module.exports = router;