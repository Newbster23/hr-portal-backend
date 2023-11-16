const { aws_ses } = require("./awsConfig");
const fs = require("fs");
const ejs = require("ejs");

function sendEmail(userEmail, resetLink) {
  return new Promise(async (resolve, reject) => {
    const emailSubject = "Password Reset Link";
    const emailTemplate = fs.readFileSync(
      "./templates/reset-password-email.ejs",
      "utf8"
    ); // Read the email template file

    const compiledTemplate = ejs.compile(emailTemplate); // Compile the template using ejs

    const expirationTimeInMilliseconds = parseInt(
      process.env.RESET_PASSWORD_LINK_EXPIRATION_TIME_MILLISECONDS,
      10
    );

    // Convert milliseconds to minutes
    const expirationTimeInMinutes = expirationTimeInMilliseconds / (1000 * 60);

    const dynamicContent = {
      resetLink: resetLink,
      exiprationTime: expirationTimeInMinutes,
    }; // Define the dynamic content

    const emailContent = compiledTemplate(dynamicContent); // Render the email content with dynamic data

    const params = {
      Destination: {
        ToAddresses: [userEmail],
      },
      Message: {
        Body: {
          Html: { Data: emailContent },
        },
        Subject: { Data: emailSubject },
      },
      Source: "pragati.naik143@gmail.com",
    };
    aws_ses.sendEmail(params, (err, data) => {
      if (err) {
        console.error("Error sending email:", err);
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

module.exports = { sendEmail };
