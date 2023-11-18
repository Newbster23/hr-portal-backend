const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const constant = require("./constants");
const { dbconnection } = require("./dbConfig");
const { s3_instance } = require("./awsConfig");
const { sendEmail } = require("./services/emailService");
const { jwtSecretKey } = require("./services/jwtKeyService");

const loginController = (req, res) => {
  const { username, password } = req.body;
  const expiresIn = constant.expiresIn;
  dbconnection.query(
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
            // Generate a secure random key
            const token = jwt.sign({ username }, jwtSecretKey, {
              expiresIn,
            });
            res.cookie("token", token);
            res.json({ status: 200, data: results[0] });
          } else {
            console.error("Password is incorrect!");
            console.log("Password is incorrect!");
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
};

const getAllEmployeesList = (req, res) => {
  const query =
    "SELECT person_id as id, firstname, middlename, lastname, phone_number, date_of_birth, email FROM personal_details";
  dbconnection.query(query, (error, results) => {
    if (error) {
      console.error("Error:", error);
      res.json({ status: 500, error: "Failed to fetch employees" });
      return;
    }
    res.json({ status: 200, data: results });
  });
};

const getEmployeeDetails = (req, res) => {
  const employeeId = req.params.id;

  const query1 =
    "SELECT firstname, middlename, lastname, gender, marital_status, blood_group, address, city, state, pincode, date_of_birth, phone_number, email, emergency_contact_name, emergency_contact_number, relation_with_employee, aadhaar_number, pan_number FROM personal_details WHERE person_id = ?";
  const query2 =
    "SELECT degree, university, year_of_passing, percentage FROM qualification_details WHERE person_id = ?";
  const query3 =
    "SELECT organisation_name, position_held, from_date, to_date, last_drawn_salary FROM professional_details WHERE person_id = ?";

  const result = {};

  // Query 1: Personal details
  dbconnection.query(query1, [employeeId], (error, results) => {
    if (error) {
      console.error("Error:", error);
      res.json({ status: 500, error: "Failed to fetch employee details" });
      return;
    }
    result.personalDetails = results;

    // Query 2: Qualification details
    dbconnection.query(query2, [employeeId], (error, results) => {
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
      dbconnection.query(query3, [employeeId], (error, results) => {
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
        res.json({ status: 200, data: result });
      });
    });
  });
};

const getEmployeeDocs = async (req, res) => {
  const folderPath = req.params.folder;

  const params = {
    Bucket: constant.bucket,
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
    res.json({ status: 500, error: "Failed to list documents" });
  }
};

const downloadDoc = async (req, res) => {
  const folder = req.params.folder;
  const filename = req.params.filename;

  const params = {
    Bucket: constant.bucket,
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
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const results = await new Promise((resolve, reject) => {
      dbconnection.query(
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
      const expirationTime =
        Date.now() + parseInt(constant.resetPasswordLinkExpirationTime, 10);

      const tokenPayload = {
        user: email,
        exp: expirationTime,
      };

      const token = jwt.sign(tokenPayload, jwtSecretKey);

      const resetLink = `${constant.clientsideUrl}/reset-password?token=${token}`;

      await sendEmail(email, resetLink); // Wait for the email sending to complete

      res.json({ status: 200 });
    } else {
      res.json({ status: 404 });
    }
  } catch (error) {
    console.error("Error:", error);
    res.json({ status: 500 });
  }
};

const resetPassword = (req, res) => {
  const { token, newPassword } = req.body;
  const decodedToken = jwt.verify(token, jwtSecretKey);

  if (decodedToken.exp && Date.now() <= decodedToken.exp) {
    // The link is valid and has not expired
    bcrypt.hash(newPassword, constant.saltRounds, (err, hash) => {
      if (err) {
        console.error("Error during hashing the password:", err);
        console.log("Error during hashing the password:", err);
        res.json({ status: 500 });
        return;
      }

      dbconnection.query(
        "UPDATE hr_portal_credentials SET password = ? WHERE email = ?",
        [hash, decodedToken.user],
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
};

const changePassword = (req, res) => {
  const { newPassword, username } = req.body;
  bcrypt.hash(newPassword, constant.saltRounds, (err, hash) => {
    if (err) {
      console.error("Error during hashing the password:", err);
      console.log("Error during hashing the password:", err);
      res.json({ status: 500 });
      return;
    }
    dbconnection.query(
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
};

const logoutController = (req, res) => {
  res.clearCookie("token");
  return res.json({ status: 200 });
};

module.exports = {
  loginController,
  getAllEmployeesList,
  getEmployeeDetails,
  getEmployeeDocs,
  downloadDoc,
  forgotPassword,
  resetPassword,
  changePassword,
  logoutController,
};
