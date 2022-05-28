const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { reset } = require("nodemon");


const port = process.env.PORT || 5000;

// middle ware
app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  // verify a token symmetric
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wfhxj.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const servicesCollection = client.db("bicycl_plus").collection("services");
    const ordersCollection = client.db("bicycl_plus").collection("orders");
    const usersCollection = client.db("bicycl_plus").collection("user");
    const paymentCollection = client.db("bicycl_plus").collection("payment");
    const reviewsCollection = client.db("bicycl_plus").collection("reviews");
    const profileCollection = client.db("bicycl_plus").collection("profile");

    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = servicesCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const part = await servicesCollection.findOne(query);
      res.send(part);
    });
    // put working
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, accessToken: token });
    });
    app.get("/orders", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodeEmail = req.decoded.email;
      if (email === decodeEmail) {
        const query = { userEmail: email };
        const orders = await ordersCollection.find(query).toArray();
        res.send(orders);
      } else {
        return res.status(403).send({ message: "Forbidden access" });
      }
    });
    app.get('/orders/:id', verifyJWT, async(req,res)=>{
      const id = req.params.id;
      const query= {_id: ObjectId(id)};
      const orders = await ordersCollection.findOne(query);
      res.send(orders);
    });
    app.post('/create-payment-intent', verifyJWT, async(req,res)=>{
      const order=req.body;
      console.log(order);
      const amount=order.pay*100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount:amount,
        currency:'usd',
       payment_method_types:['card']
      })
      res.send({clientSecret: paymentIntent.client_secret})
      console.log(order);
      
    });
    
    
    app.delete('/orders',verifyJWT, async(req,res)=>{
      const email = req.query.email;
      console.log(email);
      const filter= {userEmail:email};
      const result = await ordersCollection.deleteOne(filter);
      res.send(result)
    });

    app.get("/user", verifyJWT, async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });
    app.patch('/orders/:id', verifyJWT,async(req,res)=>{
      const id = req.params.id;
      const payment=req.body;
      const filter={_id: ObjectId(id)};
      const updateDoc={
        $set:{
          paid: true,
          transactionId: payment.transactionId,
        }
      }

      const updatedOrders= await ordersCollection.updateOne(filter,updateDoc);
      const result= await paymentCollection.insertOne(payment);
      res.send(updateDoc); 
    })
    app.patch('/orders/:id', verifyJWT,async(req,res)=>{
      const id = req.params.id;
      const payment=req.body;
      const filter={_id: ObjectId(id)};
      const updateDoc={
        $set:{
          paid: true,
          transactionId: payment.transactionId,
        }
      }

      const updatedOrders= await ordersCollection.updateOne(filter,updateDoc);
      const result= await paymentCollection.insertOne(payment);
      res.send(updateDoc); 
    })
    app.delete('/user/:email', verifyJWT, async(req,res)=>{
      const email = req.params.email;
      console.log(email);
      const filter= {email:email};
      const result = await usersCollection.deleteOne(filter);
      res.send(result)
    });
    app.get('/admin/:email', async(req,res) =>{
      const email = req.params.email;
      const user = await usersCollection.findOne({email: email});
      const isAdmin = user.role=== 'admin';
      res.send({admin: isAdmin})
    })
    // put working
    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      console.log(requester);
      const requesterAccount = await usersCollection.findOne({
        email: requester,
      });
      console.log(requesterAccount);
      if (requesterAccount.role === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
      else{
        res.status(403).send({message: 'forbidden'})
      }
    });

    // post working
    app.post("/orders", async (req, res) => {
      const orders = req.body;
      const query = { partName: orders.partName, userEmail: orders.userEmail };
      const exists = await ordersCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, orders: exists });
      }
      const result = await ordersCollection.insertOne(orders);
      res.send({ success: true, result });
    });
    app.get("/reviews", async(req,res) =>{
      const query = {};
      const cursor = reviewsCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews);
    })
    app.post("/reviews", async (req, res) => {
      const reviews = req.body;
      const result = await reviewsCollection.insertOne(reviews);
      res.send(result);
    });
    app.post('/profile', async(req,res)=>{
      const profile=req.body;
      const result = await profileCollection.insertOne(profile);
      res.send(result);
    });

    
  } finally {
  }
}
run();
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
