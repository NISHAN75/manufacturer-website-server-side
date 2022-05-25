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


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wfhxj.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run(){
  try{
     await client.connect();
     const servicesCollection = client.db('bicycl_plus').collection('services')
     const ordersCollection = client.db('bicycl_plus').collection('orders')
    

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
    // post working
    app.post('/orders', async(req,res) =>{
      const orders=req.body;
      const query ={partName: orders.partName, partId: orders.partId}
      const exists= ordersCollection.findOne(query);
      if(exists){
           return res.send({success: false, orders: exists})
      }
      const result= await  ordersCollection.insertOne(orders);
      res.send({success: true, result})
    })
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

