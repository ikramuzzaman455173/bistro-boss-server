const express = require('express');
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();
const port = process.env.PORT || 4000
const cors = require('cors');
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send(`<h1 align="center" style="color:#333;font-size:20px;margin:10px 0;">Bistro Boss Server Is Runnings</h1>`)
})



const uri = `mongodb+srv://${process.env.dbuser}:${process.env.dbPass}@cluster0.izhktyr.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const bistroBossCollection = client.db('bistroBossDb').collection('bistroMenu')
    const reviewsBossCollection = client.db('bistroBossDb').collection('reviews')
    const cartsBossCollection = client.db('bistroBossDb').collection('carts')

    app.get('/menu', async (req, res) => {
      const result = await bistroBossCollection.find({}).toArray()
      res.send(result)
    })


    app.get('/reviews', async (req, res) => {
      const result = await reviewsBossCollection.find({}).toArray()
      res.send(result)
    })




    //carts collections
    app.get('/carts', async (req, res) => {
      const email = req.query.email
      // console.log(email);
      if (!email) {
        res.send([])
      }
      const query={email:email}
      const result = await cartsBossCollection.find(query).toArray()
      res.send(result)
    })


    app.post('/carts',async (req,res) => {
      const item = req.body
      // console.log(item);
      const carts = await cartsBossCollection.insertOne(item)
      res.send(carts)
    })


    app.delete('/carts/:id', async (req, res) => {
      const id=req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await cartsBossCollection.deleteOne(query)
      res.send(result)
    })






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`Bistro Boss Server Is Running On Port:http://localhost:${port}`);
})
