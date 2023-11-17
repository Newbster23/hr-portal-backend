require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { dbconnection } = require("./dbConfig");
const constant = require("./constants");
const { router } = require("./routes");

const app = express();

app.use(
  cors({
    origin: constant.corsOrigin,
    methods: "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Connect to the database
dbconnection.connect((err) => {
  if (err) {
    console.error("Error connecting to database:", err);
    console.log("Error connecting to database:", err);
  } else {
    console.log("Connected to database");
  }
});

app.use("/api", router);

app.listen(constant.port, () => {
  console.log(`Server is running on port ${constant.port}`);
});
