const mysql = require('mysql');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',      // Your MySQL username
    password: '',      // Your MySQL password
    database: 'likhat_habi_db' // REPLACE WITH YOUR ACTUAL DATABASE NAME
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to MySQL Database');
    }
});

module.exports = db;