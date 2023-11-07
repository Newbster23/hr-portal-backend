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

    const dynamicContent = {
      resetLink: resetLink,
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
