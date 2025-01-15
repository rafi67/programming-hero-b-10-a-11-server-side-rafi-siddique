const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if(!token) {
    return res.status(401).send('Unauthorized Access');
  }

  jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
    if(err) {
      return res.status(401).send({ message: 'Unauthorized Access' })
    }
    req.user = decoded;
    next();
  });
};

app.get('/', async (req, res) => {
    res.send('server is running');
});

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.NAME}:${process.env.SECURITY_KEY}@cluster0.bk0nm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const db = client.db("WhereIsIt");
    const itemCollection = db.collection("item");

    app.get('/getAllItem', verifyToken, async (req, res) => {
      const email = req.query.email;

      if(req.user.email!==email) {
        return res.status(403).send({ message: 'forbidden access' });
      }

      const allItems = await (itemCollection.find()).toArray();
      res.send(allItems);
    });

    app.get('/getItem/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const email = req.query.email;
      if(req.user.email!==email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const query = {
        _id: new ObjectId(id)
      };
      const result = await itemCollection.findOne(query);
      res.send(result);
    });

    app.post('/addItems', verifyToken, async (req, res) => {
      const newItem = req.body;
      const docs = {
        name: newItem.name,
        email: newItem.email,
        postType: newItem.postType,
        thumbnail: newItem.thumbnail,
        title: newItem.title,
        description: newItem.description,
        category: newItem.category,
        location: newItem.location,
        date: newItem.date,
        contact: newItem.contact,
      };

      const result = await itemCollection.insertOne(docs);
      res.send(result);
    });

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.TOKEN_SECRET, { expiresIn: '1h' });
      res.
      cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
      })
      .send({ success: true });
    });

    app.put('/updateItems/:id', verifyToken, async (req, res) => {
      const email = req.query.email;

      if(req.user.email!==email) {
        return res.status(403).send({ message: 'forbidden access' });
      }

      const newItem = req.body;
      const id = req.params.id;
      const filter = {
        _id: new ObjectId(id)
      };
      const options = {
        upsert: true,
      };

      const docs = {
        name: newItem.name,
        email: newItem.email,
        postType: newItem.postType,
        thumbnail: newItem.thumbnail,
        title: newItem.title,
        description: newItem.description,
        category: newItem.category,
        location: newItem.location,
        date: newItem.date,
        contact: newItem.contact,
      };

      const result = await itemCollection.updateOne(filter, docs, options);
      res.send(result);
    });

    app.delete('/deleteItem/:id', verifyToken, async(req, res) => {
      const email = req.query.email;

      if(req.user.email!==email) {
        return res.status(403).send({ message: 'forbidden access' });
      }

      const id = req.params.id;
      const query = {
        _id: new ObjectId(id)
      };

      const result = await itemCollection.deleteOne(query);
      res.send(result);
    });    

  } catch(err) {
    console.log(err.message);
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`server is running on port: ${port}`);
});