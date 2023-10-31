const {aws_ses} = require('./awsConfig');

function sendEmail(userEmail, resetLink, res) {
    return new Promise(async (resolve, reject) => {
    const emailSubject = 'Password Reset Link';
    const emailBody = `You have requested a password reset. Please click on the following link to reset your password: ${resetLink}`;

    const params = {
        Destination: {
          ToAddresses: [userEmail],
        },
        Message: {
          Body: {
            Text: { Data: emailBody },
          },
          Subject: { Data: emailSubject },
        },
        Source: 'pragati.naik143@gmail.com',
      };
      aws_ses.sendEmail(params, (err, data) => {
        if (err) {
          console.error('Error sending email:', err);
          reject(err);
        } else {
          console.log('Email sent:', data);
          resolve(data);
        }
      });
    });
}

module.exports = {sendEmail}