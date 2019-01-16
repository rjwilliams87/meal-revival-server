"use strict";
const express = require("express");
const router = express.Router();
const passport = require("passport");
const { Donations } = require("./models");
const { jwtStrategy, localStrategy } = require("../auth");
passport.use(localStrategy);
passport.use(jwtStrategy);

const jwtAuth = passport.authenticate("jwt", { session: false });

router.get("/", (req, res) => {
  Donations.find()
    .then(donations => {
      res.json(donations);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    });
});

router.get("/:userId", (req, res) => {
  Donations.find({ userId: req.params.userId })
    .then(donations => res.json(donations))
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    });
});

router.post("/", jwtAuth, (req, res) => {
  //   const requiredFields = ["expiry"];
  //   for (let i = 0; i < requiredFields.length; i++) {
  //     if (!(field in req.body)) {
  //       const message = `Missing ${field} in req body`;
  //       console.error(message);
  //       res.status(400).send(message);
  //     }
  //   }
  Donations.create({
    userId: req.user.id,
    expiry: req.body.expiry || "",
    info: req.body.info || "",
    delivery: req.body.delivery || "",
    coords: {
      Latitude: req.user.coords.Latitude,
      Longitude: req.user.coords.Longitude
    }
  })
    .then(donation => res.status(201).json(donation))
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    });
});

router.delete("/:id", jwtAuth, (req, res) => {
  const id = req.params.id;
  Donations.findByIdAndRemove(id)
    .then(() => {
      console.log(`Deleted donation with id ${id}`);
      res.status(204).end();
    })
    .catch(err => {
      console.error(err);
    });
});

module.exports = { router };
