const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
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

async function run() {
  try {
    const serviceCollection = client.db("geniusCar").collection("services");
    const orderCollection = client.db("geniusCar").collection("orders");

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
    app.get('/orders', async(req, res) =>{
      
      let query = {};
      if(req.query.email){
        query = {
          email:req.query.email
        }
      }
      console.log(query)
      const cursor = orderCollection.find(query);
      const orders = await cursor.toArray();

      res.send(orders);
    })

    // CREATE(POST)
    app.post("/orders", async(req, res)=>{
        const order = req.body;
        const result = await orderCollection.insertOne(order);

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
