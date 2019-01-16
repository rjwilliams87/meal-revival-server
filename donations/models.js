"use strict";
const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const donationsSchema = mongoose.Schema({
  userId: { type: String },
  expiry: { type: Date },
  info: { type: String },
  delivery: { type: String },
  coords: {
    Latitude: { type: String },
    Longitude: { type: String }
  }
});

donationsSchema.methods.serialize = function() {
  return {
    id: this._id,
    userId: this.userId,
    expiry: this.expiry,
    info: this.info,
    delivery: this.delivery,
    coords: this.coords
  };
};

const Donations = mongoose.model("Donations", donationsSchema);

module.exports = { Donations };
