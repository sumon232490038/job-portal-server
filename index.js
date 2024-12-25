require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("bangladesh jindabad");
});

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log(token);
  if (!token) {
    return res.status(401).send({ message: "Your is a Unauthorized parson" });
  }
  jwt.verify(token, process.env.JWT_PASS, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Error detected in your token" });
    }
    req.user = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xhl2h.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version.
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const jobsCollections = client.db("jobPortal").collection("jobs");
    const jobsApplicationCollections = client
      .db("jobPortal")
      .collection("job-application");

    // Auth token by JWT
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_PASS, { expiresIn: "4h" });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    app.get("/jobs", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { hr_email: email };
      }
      const cursor = jobsCollections.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollections.findOne(query);

      res.send(result);
    });

    //Jobs apis

    app.get("/job-applications", verifyToken, async (req, res) => {
      const query = req.query.email;
      const query2 = { Applicat_email: query };
      console.log(req.user);
      if (req.user.email !== req.query.email) {
        return res.status(403).send({
          message: "Your are not is this info perfect",
        });
      }
      // console.log(req.cookies);
      const result = await jobsApplicationCollections.find(query2).toArray();
      for (const application of result) {
        const query1 = { _id: new ObjectId(application.job_id) };
        const job = await jobsCollections.findOne(query1);

        if (job) {
          application.title = job.title;
          application.company = job.company;
          application.location = job.location;
          application.company_logo = job.company_logo;
        }
      }
      res.send(result);
    });

    app.get("/jobs/viewApplications/:job_id", async (req, res) => {
      const id = req.params.job_id;
      const query = { job_id: id };
      const result = await jobsApplicationCollections.find(query).toArray();
      res.send(result);
    });

    app.post("/jobs", async (req, res) => {
      const jobs = req.body;
      const result = await jobsCollections.insertOne(jobs);
      res.send(result);
    });

    app.post("/job-application", async (req, res) => {
      const application = req.body;
      const result = await jobsApplicationCollections.insertOne(application);

      let newCount = 0;

      const id = application.job_id;
      const query = { _id: new ObjectId(id) };
      const job = await jobsCollections.findOne(query);
      if (job.applicationCount) {
        newCount = job.applicationCount + 1;
      } else {
        newCount = 1;
      }
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          applicationCount: newCount,
        },
      };
      const updateResult = await jobsCollections.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/job-application/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: data.status,
        },
      };
      const result = await jobsApplicationCollections.updateOne(
        filter,
        updateDoc
      );
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.log);

app.listen(port, () => {
  console.log(`the server was running port:${port}`);
});
