"use strict";
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const passport = require("passport");
const cors = require("cors");
const { DATABASE_URL, PORT, CLIENT_ORIGIN } = require("./config");

mongoose.Promise = global.Promise;
const app = express();

app.use(express.json());
app.use(morgan("common"));
app.use(
  cors({
    origin: CLIENT_ORIGIN
  })
);

const { router: authRouter, localStrategy, jwtStrategy } = require("./auth");
const { router: usersRouter } = require("./users");
const { router: donationsRouter } = require("./donations");

passport.use(localStrategy);
passport.use(jwtStrategy);

//endpoints
app.use("/api/users", usersRouter);
app.use("/api/auth", authRouter);
app.use("/api/donations", donationsRouter);
app.use("*", (req, res) => {
  return res.status(404).json({ message: "Not found" });
});

let server;
function runServer(databaseUrl, port = PORT) {
  return new Promise((resolve, reject) => {
    mongoose.connect(
      databaseUrl,
      err => {
        if (err) {
          reject(err);
        }
        server = app
          .listen(port, () => {
            console.log(`Your app is now listening on ${port}`);
            resolve();
          })
          .on("error", err => {
            mongoose.disconnect();
            reject(err);
          });
      }
    );
  });
}

function closeServer() {
  mongoose.disconnect().then(() => {
    return new Promise((resolve, reject) => {
      console.log("closing server");
      server.close(err => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  });
}

if (require.main === module) {
  runServer(DATABASE_URL).catch(err => console.error(err));
}

module.exports = { app, runServer, closeServer };
