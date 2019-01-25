"use strict";
const chai = require("chai");
const chaiHttp = require("chai-http");
const mongoose = require("mongoose");
const faker = require("faker");

const { app, runServer, closeServer } = require("../server");
const { Users } = require("../users");
const { TEST_DATABASE_URL } = require("../config");

const expect = chai.expect;
const should = chai.should;
chai.use(chaiHttp);

function seedUserData() {
  console.warn("seeding database");
  const usersList = [];
  for (let i = 1; i <= 10; i++) {
    usersList.push(generateUser());
  }
  return Users.insertMany(usersList);
}

function generateUser() {
  const unhashedPassword = "password123";
  //   const hashedPassword = Users.hashPassword(unhashedPassword);
  const testUser = {
    email: faker.internet.email(),
    password: unhashedPassword,
    address: `${faker.address.streetAddress()} ${faker.address.streetAddress()}, ${faker.address.city()} ${faker.address.zipCode()}`,
    coords: {
      Latitude: 30,
      Longitude: -90
    },
    profileComplete: true,
    companyName: faker.company.companyName(),
    contactName: faker.name.firstName(),
    about: faker.lorem.sentence(),
    phone: faker.phone.phoneNumber()
  };
  return testUser;
}

function tearDownDb() {
  console.warn("deleting database");
  return mongoose.connection.dropDatabase();
}

describe("/api/users", () => {
  const email = "foo@bar.bizz";
  const address = "1234 Foo, Bar 64111";
  const password = "password123";
  const coords = {
    Latitude: 42,
    Longitude: -91
  };

  before(() => {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(() => {
    return seedUserData();
  });

  afterEach(() => {
    return tearDownDb();
  });

  after(() => {
    return closeServer();
  });

  describe("/api/users/:id GET", () => {
    it("should return user with 200 status and correct res", () => {
      let user;
      return Users.findOne().then(_user => {
        console.warn(_user);
        user = _user;
        return chai
          .request(app)
          .get(`/api/users/${user._id}`)
          .then(res => {
            expect(res).to.have.status(200);
            expect(res.body.id).to.equal(user.id);
            expect(res.body.companyName).to.equal(user.companyName);
            expect(res.body.contactName).to.equal(user.contactName);
            expect(res.body.email).to.equal(user.email);
            expect(res.body.coords.Latitude).to.equal(user.coords.Latitude);
            expect(res.body.about).to.equal(user.about);
            expect(res.body.phone).to.equal(user.phone);
            expect(res.body.address).to.equal(user.address);
          });
      });
    });

    describe("/api/user POST req", () => {
      it("should create new user when proper credentials are input", () => {
        return chai
          .request(app)
          .post("/api/users")
          .send({ email, password, address, coords })
          .then(res => {
            expect(res).to.have.status(201);

            return Users.findOne({ email: email });
          })
          .then(user => {
            expect(user).to.not.be.null;
            expect(user.email).to.equal(email);
            expect(user.address).to.equal(address);
            return user.validatePassword("password123");
          })
          .then(isValid => {
            expect(isValid).to.be.true;
          });
      });

      it("should reject if missing fields", () => {
        return chai
          .request(app)
          .post("/api/users")
          .send({ password, address, coords })
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal("ValidationError");
            expect(res.body.message).to.equal("Missing field");
            expect(res.body.location).to.equal("email");
          });
      });

      it("should reject if email already exist", () => {
        return Users.create({
          email,
          password,
          address,
          coords
        }).then(() => {
          return chai
            .request(app)
            .post("/api/users")
            .send({ email, password, address, coords })
            .catch(err => err.response)
            .then(res => {
              expect(res).to.have.status(422);
              expect(res.body.message).to.equal("email already has account");
            });
        });
      });

      it("should reject if whitespace in email", () => {
        return chai
          .request(app)
          .post("/api/users")
          .send({
            email: " dude@email   ",
            password,
            address,
            coords
          })
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal("ValidationError");
            expect(res.body.message).to.equal("Cannot contain whitespace");
          });
      });

      it("should reject if whitespace in password", () => {
        return chai
          .request(app)
          .post("/api/users")
          .send({ email, password: " foo bar ", address, coords })
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal("ValidationError");
            expect(res.body.message).to.equal("Cannot contain whitespace");
          });
      });

      it("should reject if password is too short", () => {
        return chai
          .request(app)
          .post("/api/users")
          .send({ email, password: "abc", address, coords })
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal("ValidationError");
            expect(res.body.message).to.equal(
              "Must be at least 8 characters long"
            );
          });
      });

      it("should reject if password is too long", () => {
        return chai
          .request(app)
          .post("/api/users")
          .send({
            email,
            password: new Array(73).fill("a").join(""),
            address,
            coords
          })
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal("ValidationError");
            expect(res.body.message).to.equal(
              "Must be no more than 72 characters"
            );
          });
      });

      it("should reject non-string usernames", () => {
        return chai
          .request(app)
          .post("/api/users")
          .send({ email: 123, password, address, coords })
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal("ValidationError");
            expect(res.body.message).to.equal(
              "Incorrect typeof field: expect string"
            );
          });
      });

      it("should reject non-string passwords", () => {
        return chai
          .request(app)
          .post("/api/users")
          .send({ email, password: 12345678, address, coords })
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal("ValidationError");
            expect(res.body.message).to.equal(
              "Incorrect typeof field: expect string"
            );
          });
      });
    });
  });
});
