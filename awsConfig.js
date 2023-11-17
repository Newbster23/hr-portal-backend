const AWS = require('aws-sdk');
const constant = require('./constants');

if (!constant.awsAccessKeyId || !constant.awsSecretAccessKey || !constant.awsRegion) {
  console.error('AWS credentials or region not set. Please configure them.');
} else {
  AWS.config.update({
    region: constant.awsRegion,
    credentials: new AWS.Credentials(constant.awsAccessKeyId, constant.awsSecretAccessKey)
  });
}

  // Create an S3 instance
const s3_instance = new AWS.S3();

const aws_ses = new AWS.SES();

module.exports={s3_instance, aws_ses};
