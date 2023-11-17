const mysql = require("mysql");
const constant = require("./constants");

const dbconnection = mysql.createConnection({
  host: constant.host,
  user: constant.user,
  password: constant.password,
  database: constant.database,
});

module.exports = { dbconnection };

