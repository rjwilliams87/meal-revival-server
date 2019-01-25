"use strict";
const chai = require("chai");
const chaiHttp = require("chai-http");
const mongoose = require("mongoose");
const faker = require("faker");
const jwt = require("jsonwebtoken");

const { app, runServer, closeServer } = require("../server");
const { Users } = require("../users");
const { TEST_DATABASE_URL, JWT_EXPIRY, JWT_SECRET } = require("../config");

const expect = chai.expect;
chai.use(chaiHttp);

describe("/api/auth", () => {
  const email = "foo@bar.com";
  const password = "password123";
  const address = "123 City";
  const coords = {
    Latitude: 30,
    Longitude: 88
  };

  before(() => {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(() => {
    return Users.hashPassword(password).then(password => {
      Users.create({
        email,
        password,
        address,
        coords
      });
    });
  });

  afterEach(() => {
    return Users.remove({});
  });

  after(() => {
    return closeServer();
  });

  describe("/api/auth/login", () => {
    it("should reject request with no credentials", () => {
      return chai
        .request(app)
        .post("/api/auth/login")
        .send()
        .then(res => {
          expect(res).to.have.status(400);
        });
    });

    it("should reject request with incorrect or nonexistent email", () => {
      return chai
        .request(app)
        .post("/api/auth/login")
        .send({ email: "notRealUser", password })
        .catch(err => err.response)
        .then(res => {
          expect(res).to.have.status(401);
        });
    });

    it("should reject login with incorrect password", () => {
      return chai
        .request(app)
        .post("/api/auth/login")
        .send({ email, password: "wrongpassword" })
        .catch(err => err.response)
        .then(res => {
          expect(res).to.have.status(401);
        });
    });

    it("should return a valid auth token with correct credential input", () => {
      return chai
        .request(app)
        .post("/api/auth/login")
        .send({ email, password })
        .then(res => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an("object");
          expect(res.body).to.have.keys("authToken");
          const authToken = res.body.authToken;
          expect(authToken).to.be.a("string");
          const payload = jwt.verify(authToken, JWT_SECRET, {
            algorithm: ["HS256"]
          });
        });
    });
  });

  describe("/refresh endpoint", () => {
    it("should reject refresh request with no credentials/token", () => {
      return chai
        .request(app)
        .post("/api/auth/refresh")
        .then(res => {
          expect(res).to.have.status(401);
        });
    });

    it("should reject invalid credentials", () => {
      const authToken = jwt.sign(
        {
          user: {
            email,
            userId: 123,
            coords
          }
        },
        "wrongJwtSecret",
        {
          algorithm: "HS256",
          subject: email,
          expiresIn: JWT_EXPIRY
        }
      );
      return chai
        .request(app)
        .post("/api/auth/refresh")
        .set("authorizations", `Bearer ${authToken}`)
        .then(res => {
          expect(res).to.have.status(401);
        });
    });

    it("should create a new token with a new expiry date", () => {
      const authToken = jwt.sign(
        {
          user: {
            email,
            userId: 123,
            coords
          }
        },
        JWT_SECRET,
        {
          algorithm: "HS256",
          subject: email,
          expiresIn: JWT_EXPIRY
        }
      );
      const decoded = jwt.decode(authToken);
      return chai
        .request(app)
        .post("/api/auth/refresh")
        .set("authorization", `Bearer ${authToken}`)
        .then(res => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.a("object");
          const token = res.body.authToken;
          expect(token).to.be.a("string");
          const payload = jwt.verify(token, JWT_SECRET, {
            algorithm: ["HS256"]
          });
          expect(payload.user).to.have.keys(`email`, `userId`, `coords`);
          expect(payload.exp).to.be.at.least(decoded.exp);
        });
    });
  });
});
