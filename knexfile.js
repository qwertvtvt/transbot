// knexfile.js
module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './db/uploads.db' 
    },
    useNullAsDefault: true 
  }
};