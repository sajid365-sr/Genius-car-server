const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();



// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.90qadcl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// Verify JWT token...
function verifyJWT(req, res, next){
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({message: 'Unauthorized Access'});

  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded){
    if(err){
      return res.status(403).send({message: 'Forbidden Access'});
    }
    req.decoded = decoded;
    next();
  })
}




async function run() {
  try {
    const serviceCollection = client.db("geniusCar").collection("services");
    const orderCollection = client.db("geniusCar").collection("orders");

    //JWT TOKEN
    app.post('/jwt', (req, res) =>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1h'}); // Assigning JWT token first time after login. Expire time is in ms.

      res.send({token});
    })


    // READ ALL(GET)
    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();

      res.send(services);
    });

    // READ ONE(GET)
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const service = await serviceCollection.findOne(query);

      res.send(service);
    });

    // READ ALL ORDERS(GET)
    app.get('/orders', verifyJWT, async(req, res) =>{
      
      const decoded = req.decoded;
      

      if(decoded.email !== req.query.email){ // check if decoded email and login user email are same.
        res.status(403).send({message: 'Unauthorized Access'});
      }

      let query = {};
      if(req.query.email){
        query = {
          email:req.query.email
        }
      }
      
      const cursor = orderCollection.find(query);
      const orders = await cursor.toArray();

      res.send(orders);
    })

    // CREATE(POST)
    app.post("/orders", verifyJWT, async(req, res)=>{
        const order = req.body;
        const result = await orderCollection.insertOne(order);

        res.send(result);
        
    })

    //UPDATE
    app.patch('/orders/:id',verifyJWT, async(req, res) =>{
      const id = req.params.id;
      const status = req.body.status;
      const query = {_id: ObjectId(id)}; // Search which item will be updated
      const updatedDoc = { // What is the updated value
        $set:{
          status: status
        }
      }

      const result = await orderCollection.updateOne(query, updatedDoc);
      res.send(result);
    })

    // DELETE 
    app.delete('/orders/:id',verifyJWT, async(req,res) =>{
      const id  = req.params.id;
      const query = {_id: ObjectId(id)};
      const result = await orderCollection.deleteOne(query);

      res.send(result);

    })


  } finally {
      
  }
}

run().catch((e) => console.error(e));

// Root
app.get("/", (req, res) => {
  res.send("Car Genius Server Is Running..");
});

app.listen(port, () => {
  console.log("Genius Car Server Running On The Port: ", port);
});
