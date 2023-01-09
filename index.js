const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
const cors = require("cors");
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");


// SSL Commerce Integrations
const store_id = process.env.SSL_STORE_ID;
const store_password = process.env.SSL_SECRET_KEY;
const is_live = false //true for live, false for sandbox
const SSLCommerzPayment = require('sslcommerz-lts');

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
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'Unauthorized Access' });

  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden Access' });
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
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' }); // Assigning JWT token first time after login. Expire time is in ms.

      res.send({ token });
    })


    // READ ALL(GET)
    app.get("/services", async (req, res) => {
      // const query = { price:{$lg:100, $gt:200} };
      // const query = {  price: {$eq : 200} };
      // const query = {price : {$ne:200}};
      // const query = { price : {$in : [20, 120, 150]} };
      // const query = { price : {$nin : [20, 120, 150]} };

      // const query = { $and: [{ price: {$gt: 40}}, {title: {$eq: 'Engine Oil Change'}}] };

      const search = req.query.search;

      let query = {};
      if (search.length) {
        query = {
          $text: {
            $search: search
          }
        }
      }
      const order = req.query.order === 'asc' ? 1 : -1;
      const cursor = serviceCollection.find(query).sort({ price: order });
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
    app.get('/orders', verifyJWT, async (req, res) => {

      const decoded = req.decoded;


      if (decoded.email !== req.query.email) { // check if decoded email and login user email are same.
        res.status(403).send({ message: 'Unauthorized Access' });
      }

      let query = {};
      if (req.query.email) {
        query = {
          email: req.query.email
        }
      }

      const cursor = orderCollection.find(query);
      const orders = await cursor.toArray();

      res.send(orders);
    })

    // CREATE(POST)
    app.post("/orders", verifyJWT, async (req, res) => {
      const order = req.body;
      const { serviceName, customerName, email, address, postcode, currency } = order;

      if (!serviceName || !customerName || !email || !address || !postcode || currency) {
        return res.send({ error: 'Please provide all the information' });
      }

      const orderedService = await serviceCollection.findOne({ _id: ObjectId(order.serviceId) });
      const tnxId = new ObjectId().toString(); // make a unique transaction id


      const data = {
        total_amount: orderedService.price,
        currency: order.currency,
        tran_id: tnxId, // use unique tran_id for each api call
        success_url: `${process.env.SERVER_URL}/payment/success?transactionId=${tnxId}`,
        fail_url: `${process.env.SERVER_URL}/payment/fail?transactionId=${tnxId}`,
        cancel_url: `${process.env.SERVER_URL}/payment/cancel`,
        ipn_url: 'http://localhost:3030/ipn',
        shipping_method: 'Courier',
        product_name: order.serviceName,
        product_category: 'Electronic',
        product_profile: 'general',
        cus_name: order.customerName,
        cus_email: order.email,
        cus_add1: order.address,
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: order.postcode,
        cus_country: 'Bangladesh',
        cus_phone: order.phone,
        cus_fax: '01711111111',
        ship_name: 'Customer Name',
        ship_add1: 'Dhaka',
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
      };



      const sslcz = new SSLCommerzPayment(store_id, store_password, is_live)
      sslcz.init(data).then(apiResponse => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;

        // Save the payment
        orderCollection.insertOne(({
          ...order,
          price: orderedService.price,
          transactionId: tnxId,
          paid: false,
        }));


        res.send({ url: GatewayPageURL });

      });


    })

    // Payment success route
    app.post('/payment/success', async (req, res) => {
      const { transactionId } = req.query;

      if (!transactionId) {
        return res.redirect(`${process.env.CLIENT_URL}/payment/fail`);
      }

      const result = await orderCollection.updateOne({ transactionId }, { $set: { paid: true, paidAt: new Date().toLocaleString() } });

      if (result.modifiedCount > 0) {
        res.redirect(`${process.env.CLIENT_URL}/payment/success?transactionId=${transactionId}`);
      }

    });

    // Payment fail route
    app.post('/payment/fail', async (req, res) => {
      const { transactionId } = req.query;

      if (!transactionId) {
        return res.redirect(`${process.env.CLIENT_URL}/payment/fail`);
      }
      const result = await orderCollection.deleteOne({ transactionId });
      if (result.deletedCount) {
        res.redirect(`${process.env.CLIENT_URL}/payment/fail`);
      }

    })

    // Get paid service info
    app.get('/orders/:transactionId', async (req, res) => {
      const { transactionId } = req.params;
      const result = await orderCollection.findOne({ transactionId });

      res.send(result);
    });

    //UPDATE
    app.patch('/orders/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const status = req.body.status;
      const query = { _id: ObjectId(id) }; // Search which item will be updated
      const updatedDoc = { // What is the updated value
        $set: {
          status: status
        }
      }

      const result = await orderCollection.updateOne(query, updatedDoc);
      res.send(result);
    })

    // DELETE 
    app.delete('/orders/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
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
