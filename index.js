const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion ,ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const port = process.env.PORT || 5000;

// middle ware
app.use(cors());
app.use(express.json());

function verifyJWT(req,res,next){
  const authHeader=req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({message: 'UnAuthorized access'})
  }
  const token= authHeader.split(' ')[1];
  // verify a token symmetric
jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {
  if(err){
    return res.status(403).send({message: 'Forbidden access'})
  }
  req.decoded=decoded
  next();
});
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wfhxj.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run(){
  try{
     await client.connect();
     const servicesCollection = client.db('bicycl_plus').collection('services')
     const ordersCollection = client.db('bicycl_plus').collection('orders')
     const usersCollection = client.db('bicycl_plus').collection('user')
    

     app.get('/services', async(req,res) =>{
      const query={};
      const cursor = servicesCollection.find(query);
      const services= await cursor.toArray();
      res.send(services);
     });
     app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const part = await servicesCollection.findOne(query);
      res.send(part);
    });
    app.put('/user/:email', async(req,res) =>{
      const email = req.params.email;
      const user=req.body
      const filter={email:email};
      const options = { upsert: true };
      const updateDoc = {
        $set:user,
      };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      const token=jwt.sign({email:email}, process.env.ACCESS_TOKEN_SECRET,{ expiresIn: '1h'} )
      res.send({result, accessToken: token});
    })
    app.get('/orders', async(req,res) =>{
      const email=req.query.email;
      const query ={userEmail:email};
      const orders=await ordersCollection.find(query).toArray();
      res.send(orders);
      console.log(orders,query);
    });
  
    // post working
    app.post('/orders' , async(req,res) =>{
      const orders= req.body;
      const query = {partName:orders.partName,userEmail:orders.userEmail};
      const exists= await ordersCollection.findOne(query)
      if(exists){
        return res.send({success: false , orders: exists})
      }
    
      const result = await ordersCollection.insertOne(orders);
      res.send({success: true , result});
    });

    
  }
  finally{}
}
run();
app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

