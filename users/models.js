"use strict";
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

mongoose.Promise = global.Promise;

const UsersSchema = mongoose.Schema({
  email: { type: String, require: true, unique: true },
  password: { type: String, require: true },
  companyName: { type: String, require: true, default: "" },
  contactName: { type: String, require: true, default: "" },
  coords: {
    Latitude: { type: Number },
    Longitude: { type: Number }
  },
  address: { type: String, require: true, default: "" },
  phone: { type: String, default: "" },
  about: { type: String, default: "" },
  profileComplete: { type: Boolean, default: false }
});

UsersSchema.methods.serialize = function() {
  return {
    id: this._id,
    email: this.email || "",
    companyName: this.companyName || "",
    contactName: this.contactName || "",
    coords: this.coords || "",
    address: this.address || "",
    about: this.about || "",
    phone: this.phone || "",
    profileComplete: this.profileComplete
  };
};

UsersSchema.methods.validatePassword = function(password) {
  return bcrypt.compare(password, this.password);
};

UsersSchema.statics.hashPassword = function(password) {
  return bcrypt.hash(password, 10);
};

const Users = mongoose.model("Users", UsersSchema);

module.exports = { Users };
