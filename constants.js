const port = process.env.PORT || "3000";
const corsOrigin = process.env.CORS_ORIGIN_ALLOWED;
const host = process.env.DB_HOST;
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const database = process.env.DB;
const expiresIn = process.env.SESSION_EXPIRATION_TIME || '45m';
const bucket = process.env.BUCKET_NAME;
const resetPasswordLinkExpirationTime= process.env.RESET_PASSWORD_LINK_EXPIRATION_TIME_MILLISECONDS;
const clientsideUrl = process.env.CLIENT_SIDE_URL;
const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const awsRegion = process.env.REGION;
const saltRounds = 10;
const senderEmail = process.env.SENDER_EMAIL;

module.exports = {
    port,
    corsOrigin,
    host,
    user,
    password,
    database,
    expiresIn,
    bucket,
    resetPasswordLinkExpirationTime,
    clientsideUrl,
    awsAccessKeyId,
    awsSecretAccessKey,
    awsRegion,
    saltRounds,
    senderEmail
}