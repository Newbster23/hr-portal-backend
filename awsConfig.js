const AWS = require('aws-sdk');

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.REGION) {
  console.error('AWS credentials or region not set. Please configure them.');
} else {
  AWS.config.update({
    region: process.env.REGION,
    credentials: new AWS.Credentials(process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY)
  });
}

  // Create an S3 instance
const s3_instance = new AWS.S3();

const aws_ses = new AWS.SES();

module.exports={s3_instance, aws_ses};
