"use strict";
const express = require("express");
const bodyParser = require("body-parser");
const passport = require("passport");

const { Users } = require("./models");
const { localStrategy, jwtStrategy } = require("../auth");
const router = express.Router();
const jsonParser = bodyParser.json();
const jwtAuth = passport.authenticate("jwt", { session: false });
router.use(bodyParser.json());

//get req for user profiles
router.get("/:id", (req, res, next) => {
  Users.findOne({ _id: req.params.id })
    .then(user => {
      res.status(200).json(user.serialize());
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    });
});

//creating new user
router.post("/", (req, res, next) => {
  const requiredFields = ["email", "password", "address", "coords"];
  const missingField = requiredFields.find(field => !(field in req.body));
  if (missingField) {
    return res.status(422).json({
      code: 422,
      reason: "ValidationError",
      message: "Missing field",
      location: missingField
    });
  }

  if (typeof req.body.coords !== "object") {
    return res.status(422).json({
      code: 422,
      reason: "ValidationError",
      message: "coords must be object",
      location: "coords"
    });
  }

  const stringFields = ["email", "password", "address"];
  const nonStringField = stringFields.find(
    field => field in req.body && typeof req.body[field] !== "string"
  );
  if (nonStringField) {
    return res.status(422).json({
      code: 422,
      reason: "ValidationError",
      message: "Incorrect typeof field: expect string",
      location: nonStringField
    });
  }

  const trimmedFields = ["email", "password"];
  let nonTrimmedField;
  for (let i = 0; i < trimmedFields.length; i++) {
    if (
      req.body[trimmedFields[i]] !==
      req.body[trimmedFields[i]].replace(/\s/g, "")
    ) {
      nonTrimmedField = req.body[trimmedFields[i]];
    }
  }
  if (nonTrimmedField) {
    return res.status(422).json({
      code: 422,
      reason: "ValidationError",
      message: "Connot contain whitespace",
      location: nonTrimmedField
    });
  }

  const sizedFields = {
    password: {
      min: 8,
      max: 72
    }
  };
  const tooSmallField = Object.keys(sizedFields).find(
    field =>
      "min" in sizedFields[field] &&
      req.body[field].trim().length < sizedFields[field].min
  );
  const tooLargeField = Object.keys(sizedFields).find(
    field =>
      "max" in sizedFields[field] &&
      req.body[field].trim().length > sizedFields[field].max
  );
  if (tooSmallField || tooLargeField) {
    return res.status(422).json({
      code: 422,
      reason: "ValidationError",
      message: tooSmallField
        ? `Must be at least ${sizedFields[tooSmallField].min} characters long`
        : `Must be no more than ${sizedFields[tooLargeField].max} characters`
    });
  }

  let { email, password, coords, address = "" } = req.body;
  address = address.trim();

  return Users.find({ email })
    .count()
    .then(count => {
      if (count > 0) {
        return Promise.reject({
          code: 422,
          reason: "ValidationError",
          message: "email already has account",
          location: "email"
        });
      }
      return Users.hashPassword(password);
    })
    .then(hash => {
      return Users.create({
        email,
        password: hash,
        address,
        coords
      });
    })
    .then(() => {
      return res.status(201).end();
    })
    .catch(err => {
      if (err.reason === "ValidationError") {
        return res.status(err.code).json(err);
      }
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    });
});

//complete user profile with patch req
router.patch("/:id", jwtAuth, (req, res) => {
  if (!(req.params.id === req.user.id)) {
    res.status(400).json({
      error: `user id and params id || req body id do not match`
    });
  }
  const toPatch = {};
  const patchableFields = [
    "address",
    "about",
    "phone",
    "coords",
    "profileComplete"
  ];
  patchableFields.forEach(field => {
    if (field in req.body) {
      toPatch[field] = req.body[field];
    }
  });

  Users.findByIdAndUpdate({ _id: req.user.id }, { $set: toPatch })
    .then(() => res.status(204).end())
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    });
});

module.exports = { router };
