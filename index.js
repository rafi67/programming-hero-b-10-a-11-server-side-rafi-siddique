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
    'https://whereisit-27b8c.web.app',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send('Unauthorized Access');
  }

  jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({
        message: 'error',
      });
    }
    req.user = decoded;
    next();
  });
};

app.get('/', async (req, res) => {
  res.send('server is running');
});

const {
  MongoClient,
  ServerApiVersion,
  ObjectId
} = require('mongodb');
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
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({
    //   ping: 1
    // });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const db = client.db("WhereIsIt");
    const itemCollection = db.collection("item");
    const recoveredCollection = db.collection('recoveredItems');

    app.get('/getAllItem', async (req, res) => {
      const allItems = await (itemCollection.find()).toArray();
      res.send(allItems);
    });

    app.get('/getItems', async (req, res) => {
      const allItems = await (itemCollection.find().sort({
        date: -1
      }).limit(6)).toArray();
      res.send(allItems);
    });

    app.get('/getRecoveredItems', verifyToken, async (req, res) => {
      const recoveredItems = await (recoveredCollection.find().toArray());
      res.send(recoveredItems);
    });

    app.get('/getRecoveredItemAndDetails', verifyToken, async (req, res) => {
      const result = await itemCollection.aggregate([{
          $match: {
            recovered: true
          },
        },
        {
          $lookup: {
            from: "recoveredItems",
            localField: "_id",
            foreignField: "itemID",
            as: "recovered"
          }
        },
        {
          $project: {
            _id: 1,
            thumbnail: 1,
            title: 1,
            contactInformation: 1,
            date: 1,
            location: 1,
          },
        },
      ]).toArray();
      res.send(result);
    });

    app.post('/getMyItem/', verifyToken, async (req, res) => {
      const clientEmail = req.body.email;
      const email = req.user.data.email;
      if (clientEmail !== email) {
        return res.status(403).send({
          message: 'forbidden access',
        });
      }
      const user = req.body;
      const query = {
        contactInformation: user,
      };
      const result = await itemCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/getItem/:id', verifyToken, async (req, res) => {
      const id = req.params.id;

      const query = {
        _id: new ObjectId(id)
      };
      const result = await itemCollection.findOne(query);
      res.send(result);
    });

    app.post('/addItems', verifyToken, async (req, res) => {
      const newItem = req.body;
      const docs = {
        postType: newItem.postType,
        thumbnail: newItem.thumbnail,
        title: newItem.title,
        description: newItem.description,
        category: newItem.category,
        location: newItem.location,
        date: newItem.date,
        recovered: newItem.recovered,
        contactInformation: newItem.contactInformation,
      };

      const result = await itemCollection.insertOne(docs);
      res.send(result);
    });


    app.post('/addRecoveredItem', verifyToken, async (req, res) => {
      const newItem = req.body;
      const docs = {
        itemID: newItem.itemID,
        recoveredLocation: newItem.recoveredLocation,
        date: newItem.date,
        recoveredPerson: newItem.recoveredPerson,
      };

      const result = await recoveredCollection.insertOne(docs);
      res.send(result);
    });

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign({
        data: user
      }, process.env.TOKEN_SECRET, {
        expiresIn: '5h'
      });

      res.
      cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'None',
        })
        .send({
          success: true
        });
    });

    app.post('/logout', (req, res) => {
      res.clearCookie('token', {
          httpOnly: true,
          secure: false,
        })
        .send({
          success: true
        });
    });

    app.put('/updateItems/:id', verifyToken, async (req, res) => {
      const updateItem = req.body;
      const id = req.params.id;

      const result = await itemCollection.updateOne({
        _id: new ObjectId(id)
      }, {
        $set: {
          postType: updateItem.postType,
          thumbnail: updateItem.thumbnail,
          title: updateItem.title,
          description: updateItem.description,
          category: updateItem.category,
          location: updateItem.location,
          date: updateItem.date,
          recovered: updateItem.recovered,
          contact: updateItem.contact,
        }
      }, );
      res.send(result);
    });


    app.put('/statusUpdate/:id', async (req, res) => {
      const id = req.params.id;

      const result = await itemCollection.updateOne({
        _id: new ObjectId(id)
      }, {
        $set: {
          recovered: true
        }
      }, );
      res.send(result);
    });

    app.delete('/deleteItem/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id)
      };

      const result = await itemCollection.deleteOne(query);
      res.send(result);
    });

  } catch (err) {
    console.log(err.message);
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`server is running on port: ${port}`);
});