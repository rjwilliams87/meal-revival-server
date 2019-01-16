module.exports.DATABASE_URL =
  process.env.DATABASE_URL || "mongodb://localhost/meal-revival-demo";
module.exports.TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || "mongodb://localhost/meal-revival-test";
module.exports.PORT = process.env.PORT || 8080;
module.exports.JWT_SECRET = process.env.JWT_SECRET || "SECRETTESTINGKEY";
module.exports.JWT_EXPIRY = process.env.JWT_EXPIRY || "3d";
module.exports.CLIENT_ORIGIN =
  process.env.CLIENT_ORIGIN || "http://localhost:3000";
