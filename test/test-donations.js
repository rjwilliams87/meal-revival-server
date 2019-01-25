"use strict";
const chai = require("chai");
const chaiHttp = require("chai-http");
const mongoose = require("mongoose");
const faker = require("faker");
const jwt = require("jsonwebtoken");

const { app, runServer, closeServer } = require("../server");
const { Donations } = require("../donations");
const { TEST_DATABASE_URL, JWT_EXPIRY, JWT_SECRET } = require("../config");

const expect = chai.expect;
const should = chai.should;
chai.use(chaiHttp);

const email = "testUser";
const coords = {
  Longitude: 39,
  Latitude: -55
};

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

function seedDonationData() {
  console.warn("seeding database");
  const seedData = [];
  for (let i = 1; i <= 50; i++) {
    seedData.push(generateDonationsData());
  }
  return Donations.insertMany(seedData);
}

function generateDonationsData() {
  const number = Math.round(Math.random());
  let answer;
  if (number === 0) {
    answer = "Yes";
  } else {
    answer = "No";
  }
  const donationData = {
    userId: faker.random.number(),
    expiry: faker.date.recent(),
    info: faker.lorem.sentence(),
    delivery: answer,
    coords: {
      Latitude: faker.random.number(),
      Longitude: faker.random.number
    }
  };
  return donationData;
}

function tearDownDb() {
  console.warn("deleting database");
  return mongoose.connection.dropDatabase();
}

describe("/api/donations", () => {
  before(() => {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(() => {
    return seedDonationData();
  });

  afterEach(() => {
    return tearDownDb();
  });

  after(() => {
    return closeServer();
  });

  describe("/api/donations GET", () => {
    it("should return all donations", () => {
      let res;
      return chai
        .request(app)
        .get("/api/donations")
        .then(_res => {
          res = _res;
          expect(res).to.have.status(200);
          return Donations.find().count();
        })
        .then(count => {
          expect(res.body).to.have.lengthOf(count);
        });
    });

    it("should return donations with correct fields", () => {
      let donation;
      return chai
        .request(app)
        .get("/api/donations")
        .then(res => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a("array");
          expect(res.body).to.have.lengthOf.at.least(1);
          res.body.forEach(donation => {
            expect(donation).to.be.a("object");
            expect(donation).to.include.keys(
              "_id",
              "userId",
              "expiry",
              "info",
              "delivery",
              "coords"
            );
          });
          donation = res.body[0];
          return Donations.findById(donation._id);
        })
        .then(res => {
          expect(res.id).to.equal(donation._id);
        });
    });
  });

  describe("/api/donations/:id GET", () => {
    it("should return donations with correct userId", () => {
      let donation;
      return Donations.findOne().then(_donation => {
        donation = _donation;
        return chai
          .request(app)
          .get(`/api/donations/${donation.userId}`)
          .then(res => {
            expect(res).to.have.status(200);
            expect(res.body[0].userId).to.equal(donation.userId);
            expect(res.body).to.be.a("array");
          });
      });
    });
  });

  describe("/api/donations POST", () => {
    it("should create new donation", () => {
      const newDonation = generateDonationsData();
      return chai
        .request(app)
        .post("/api/donations")
        .set("authorization", `Bearer ${authToken}`)
        .send(newDonation)
        .then(res => {
          expect(res).to.have.status(201);
          expect(res).to.be.json;
          expect(res.body).to.be.a("object");
          expect(res.body).to.include.keys(
            "_id",
            "expiry",
            "info",
            "delivery",
            "coords"
          );
        });
    });
  });

  describe("/api/donation/:id DELETE", () => {
    it("should delete donation from database by donation id", () => {
      let donationToDelete;
      return Donations.findOne().then(donation => {
        donationToDelete = donation;
        return chai
          .request(app)
          .delete(`/api/donations/${donationToDelete._id}`)
          .set("authorization", `Bearer ${authToken}`)
          .then(res => {
            expect(res).to.have.status(204);
            return Donations.findById(donationToDelete._id);
          })
          .then(donation => {
            expect(donation).to.be.null;
          });
      });
    });
  });
});
