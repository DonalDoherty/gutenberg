const pool = require('../database/database');

async function bookExists(bookId) {
    return await pool.query(`
    SELECT EXISTS(
        SELECT book_uid FROM gutenberg_common.book
        WHERE book_uid = $1
    );
    `, [bookId]).then((response) => {
        return response.rows[0].exists;
    });
}

async function readingListExists(readingListId) {
    return await pool.query(`
    SELECT EXISTS(
        SELECT reading_list_uid FROM gutenberg_common.reading_list
        WHERE reading_list_uid = $1
    );
    `, [readingListId]).then((response) => {
        return response.rows[0].exists;
    });
}

async function statusValid(statusId) {
    return await pool.query(`
    SELECT EXISTS(
        SELECT lu_book_status_uid FROM gutenberg_common.lu_book_status
        WHERE lu_book_status_uid = $1
    );
    `, [statusId]).then((response) => {
        return response.rows[0].exists;
    });
}

exports.bookExists = bookExists;
exports.readingListExists = readingListExists;
exports.statusValid = statusValid;