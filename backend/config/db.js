<<<<<<< HEAD
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

=======
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

>>>>>>> 46f177dc8ce17a0f72dc7182eb1b2842c55e7a13
module.exports = db;