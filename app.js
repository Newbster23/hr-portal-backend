require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const mysql = require("mysql");
const cors = require("cors");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { jwtDecode } = require("jwt-decode");
const { s3_instance } = require("./awsConfig");
const { sendEmail } = require("./emailService");

const app = express();
const port = process.env.PORT || "";

app.use(
  cors({
    origin: process.env.CORS_ORIGIN_ALLOWED,
    methods: "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const saltRounds = 10;

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB,
});

connection.connect();

const verifyUser = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ status: 401, Error: "User is not authenticated" });
  }

  jwt.verify(token, "jwt-secret-key", (err, decoded) => {
    if (err) {
      return res.json({ status: 401, Error: "Token is not valid" });
    }

    // Check token expiration
    const decodedToken = jwtDecode(token);
    const currentTime = Date.now() / 1000;

    if (decodedToken.exp && decodedToken.exp < currentTime) {
      return res.json({ status: 401, error: "Token has expired" });
    }

    req.username = decoded.username;
    next();
  });
};

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  connection.query(
    "SELECT * FROM hr_portal_credentials WHERE username = ?",
    [username],
    (err, results) => {
      if (err) {
        console.error("Error during login:", err);
        console.log("Error during login:", err);
        res.json({ status: 500 });
        return;
      }

      if (results.length === 1) {
        const hashedPassword = results[0].password;
        const username = results[0].username;
        bcrypt.compare(password, String(hashedPassword), (err, isMatch) => {
          if (err) {
            console.error("Error while validating the password", err);
            console.log("Error while validating the password", err);
            res.json({ status: 500 });
            return;
          }

          if (isMatch) {
            const token = jwt.sign({ username }, "jwt-secret-key", {
              expiresIn: "45m",
            });
            res.cookie("token", token);
            res.json({ status: 200, data: results[0] });
          } else {
            console.error("Error while validating the password");
            console.log("Error while validating the password");
            res.json({ status: 401, message: "Password is incorrect!" });
            return;
          }
        });
      } else {
        res.json({ status: 401, message: "Username not found!" });
        return;
      }
    }
  );
});

app.get("/api/employees", verifyUser, (req, res) => {
  const query =
    "SELECT person_id as id, firstname, middlename, lastname, phone_number, date_of_birth, email FROM personal_details";
  connection.query(query, (error, results) => {
    if (error) {
      console.error("Error:", error);
      res.json({ status: 500, error: "Failed to fetch employees" });
      return;
    }
    res.json({status: 200, data: results});
  });
});

app.get("/api/employeeDetails/:id", verifyUser, (req, res) => {
  const employeeId = req.params.id;

  const query1 =
    "SELECT firstname, middlename, lastname, gender, marital_status, blood_group, address, city, state, pincode, date_of_birth, phone_number, email, emergency_contact_name, emergency_contact_number, relation_with_employee, aadhaar_number, pan_number FROM personal_details WHERE person_id = ?";
  const query2 =
    "SELECT degree, university, year_of_passing, percentage FROM qualification_details WHERE person_id = ?";
  const query3 =
    "SELECT organisation_name, position_held, from_date, to_date, last_drawn_salary FROM professional_details WHERE person_id = ?";

  const result = {};

  // Query 1: Personal details
  connection.query(query1, [employeeId], (error, results) => {
    if (error) {
      console.error("Error:", error);
      res.json({ status: 500, error: "Failed to fetch employee details" });
      return;
    }
    result.personalDetails = results;

    // Query 2: Qualification details
    connection.query(query2, [employeeId], (error, results) => {
      if (error) {
        console.error("Error:", error);
        res.json({
          status: 500,
          error: "Failed to fetch qualification details",
        });
        return;
      }
      result.qualificationDetails = results;

      // Query 3: Professional details
      connection.query(query3, [employeeId], (error, results) => {
        if (error) {
          console.error("Error:", error);
          res.json({
            status: 500,
            error: "Failed to fetch professional details",
          });
          return;
        }
        result.professionalDetails = results;

        // Send the combined result as JSON response
        res.json({status: 200, data: result});
      });
    });
  });
});

app.get("/api/documents/:folder", verifyUser, async (req, res) => {
  const folderPath = req.params.folder;

  const params = {
    Bucket: process.env.BUCKET_NAME,
    Prefix: folderPath,
  };

  try {
    const docList = await s3_instance.listObjectsV2(params).promise();

    const docKeys = docList.Contents.map((item) => {
      const file = item.Key.split("/")[1];
      return file;
    });

    res.json(docKeys);
  } catch (error) {
    console.error("Error listing objects:", error);
    res.json({ status:500, error: "Failed to list documents" });
  }
});

app.get("/api/download/:folder/:filename", verifyUser, async (req, res) => {
  const folder = req.params.folder;
  const filename = req.params.filename;

  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: `${folder}/${filename}`, // Concatenate the folder and file name
  };
  try {
    const download = await s3_instance.getObject(params).promise();
    // Set response headers for the file download
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", download.ContentType);

    // Send the file content in the response
    res.send(download.Body);
  } catch (error) {
    console.error("Error downloading file:", error);
    if (error.code === "NoSuchKey") {
      res.json({ status: 404, error: "File not found" });
    } else {
      res.json({ status: 500, error: "Failed to download file" });
    }
  }
});

app.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const results = await new Promise((resolve, reject) => {
      connection.query(
        "SELECT * FROM hr_portal_credentials WHERE email = ?",
        [email],
        (err, results) => {
          if (err) {
            console.error("Error:", err);
            reject(err);
          } else {
            resolve(results);
          }
        }
      );
    });
    if (results.length > 0) {
      const token = crypto.randomBytes(16).toString("hex");

      const expirationTime = Date.now() + 10 * 60 * 1000;

      const resetLink = `${process.env.CLIENT_SIDE_URL}/reset-password?user=${email}&token=${token}&expires=${expirationTime}`;

      await sendEmail(email, resetLink); // Wait for the email sending to complete

      res.json({ status: 200 });
    } else {
      res.json({ status: 404 });
    }
  } catch (error) {
    console.error("Error:", error);
    res.json({ status: 500 });
  }
});

app.post("/api/reset-password", (req, res) => {
  const { newPassword, email, expirationTime } = req.body;
  if (expirationTime && Date.now() <= expirationTime) {
    // The link is valid and has not expired
    bcrypt.hash(newPassword, saltRounds, (err, hash) => {
      if (err) {
        console.error("Error during hashing the password:", err);
        console.log("Error during hashing the password:", err);
        res.json({ status: 500 });
        return;
      }

      connection.query(
        "UPDATE hr_portal_credentials SET password = ? WHERE email = ?",
        [hash, email],
        (err, results) => {
          if (err) {
            console.error("Error while updating the password:", err);
            console.log("Error while updating the password:", err);
            res.json({ status: 500 });
            return;
          }
          if (results.affectedRows > 0) {
            res.json({ status: 200 });
          } else {
            res.json({ status: 404, message: "User not found" });
          }
        }
      );
    });
  } else {
    res.json({
      status: 410,
      message: "The reset link has expired. Please request a new one.",
    });
  }
});

app.post("/api/change-password", (req, res) => {
  const { newPassword, username } = req.body;
  bcrypt.hash(newPassword, saltRounds, (err, hash) => {
    if (err) {
      console.error("Error during hashing the password:", err);
      console.log("Error during hashing the password:", err);
      res.json({ status: 500 });
      return;
    }
    connection.query(
      "UPDATE hr_portal_credentials SET password = ? WHERE username = ?",
      [hash, username],
      (err, results) => {
        if (err) {
          console.error("Error while updating the password:", err);
          console.log("Error while updating the password:", err);
          res.json({ status: 500 });
          return;
        }
        if (results.affectedRows > 0) {
          res.json({ status: 200 });
        } else {
          res.json({ status: 404, message: "User not found" });
        }
      }
    );
  });
});

app.get("/api/logout", (req, res) => {
  res.clearCookie("token");
  return res.json({ status: 200 });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
