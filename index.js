const express = require('express');
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();
const stripe = require("stripe")(process.env.payment_secreat_key);
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 4000
const cors = require('cors');
app.use(cors())
app.use(express.json())
const varifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' })
  }
  //bearer token
  const token = authorization.split(' ')[1]
  jwt.verify(token, process.env.access_token_secreat_key, (err, decoded) => {
    if (err) {
      return res.status(403).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded
    next()
  })
}

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
    const usersCollection = client.db('bistroBossDb').collection('users')
    const bistroBossCollection = client.db('bistroBossDb').collection('bistroMenu')
    const reviewsBossCollection = client.db('bistroBossDb').collection('reviews')
    const cartsBossCollection = client.db('bistroBossDb').collection('carts')
    const paymentsBossCollection = client.db('bistroBossDb').collection('payments')

    app.post('/jwt', (req, res) => {
      const user = req.body
      // console.log('user',user);
      const token = jwt.sign(user, process.env.access_token_secreat_key, { expiresIn: '1h' })
      res.send({ token })
    })

    const varifyAdminJwt = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      if (!user || user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' })
      }
      next()
    }

    //users related apis
    app.get('/users', varifyJwt, varifyAdminJwt, async (req, res) => {
      const users = await usersCollection.find({}).toArray()
      res.send(users)
    })


    app.post('/users', async (req, res) => {
      const user = req.body
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query)
      // console.log('existingUser',existingUser);
      if (existingUser) {
        return res.send({ message: 'User Has Been Allready Exists!' })
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    app.get('/users/admin/:email', varifyJwt, async (req, res) => {
      const email = req.params.email
      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      const result = { admin: user?.role === 'admin' }
      res.send(result)
    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id
      // console.log(id);
      const filter = { _id: new ObjectId(id) }
      // console.log(filter);
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })



    //menu related apis
    app.get('/menu', async (req, res) => {
      const result = await bistroBossCollection.find({}).toArray()
      res.send(result)
    })

    app.post('/menu', varifyJwt, varifyAdminJwt, async (req, res) => {
      const newItem = req.body
      const result = await bistroBossCollection.insertOne(newItem)
      res.send(result)
    })

    app.delete('/menu/:id', varifyJwt, varifyAdminJwt, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await bistroBossCollection.deleteOne(query)
      res.send(result)
    })

    // revews related apis
    app.get('/reviews', async (req, res) => {
      const result = await reviewsBossCollection.find({}).toArray()
      res.send(result)
    })




    //carts collections related api
    app.get('/carts', varifyJwt, async (req, res) => {
      const email = req.query.email
      // console.log(email);
      if (!email) {
        res.send([])
      }
      const decodedEmail = req.decoded.email
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }
      const query = { email: email }
      const result = await cartsBossCollection.find(query).toArray()
      res.send(result)
    })

    app.post('/carts', async (req, res) => {
      const item = req.body
      // console.log(item);
      const carts = await cartsBossCollection.insertOne(item)
      res.send(carts)
    })


    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await cartsBossCollection.deleteOne(query)
      res.send(result)
    })



    // create payments intent
    app.post('/payment', varifyJwt, async (req, res) => {
      const { price } = req.body
      const amount = parseInt(price * 100)
      console.log('price', price, 'amount', amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })


    // payment related api
    app.post('/payments', varifyJwt, async (req, res) => {
      const payment = req.body
      const insertResult = await paymentsBossCollection.insertOne(payment)

      // const query = {_id:{$in:payment.cartItems?.map(id => new ObjectId(id)) } }
      // console.log(payment,'payment');
      const query = { _id: { $in: payment.payment.cartItems.map(id => new ObjectId(id)) } }
      const deleteResult = await cartsBossCollection.deleteMany(query)
      res.send({ insertResult, deleteResult })
    })


    app.get('/admin-stats', varifyJwt, varifyAdminJwt, async (req, res) => {
      const users = await usersCollection.estimatedDocumentCount()
      const products = await bistroBossCollection.estimatedDocumentCount()
      const orders = await paymentsBossCollection.estimatedDocumentCount()
      const payments = await paymentsBossCollection.find({}).toArray()
      const revenue = payments.reduce((sum, money) => sum + money.payment.price, 0)
      // console.log(revenue,'revenue');
      res.send({ users, products, orders, revenue })
    })

    app.get('/order-stats', varifyJwt, varifyAdminJwt, async (req, res) => {
      // Group and aggregate data by menuItems category

      const pipeline = [
        {
          $lookup: {
            from: 'bistroMenu',
            localField: 'menuItems',
            foreignField: 'payment._id',
            as: 'menuItemsData'
          }
        },
        {
          $unwind: '$menuItemsData'
        },
        {
          $group: {
            _id: '$menuItemsData.category',
            count: { $sum: 1 },
            total: { $sum: '$menuItemsData.price' }
          }
        },
        {
          $project: {
            category: '$_id',
            count: 1,
            total: { $round: ['$total', 2] },
            _id: 0
          }
        }
      ];



      const result = await paymentsBossCollection.aggregate(pipeline).toArray()
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