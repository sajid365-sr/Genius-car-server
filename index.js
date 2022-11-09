
const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
require ('dotenv').config();

// Middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.90qadcl.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect(err => {
  const collection = client.db("test").collection("devices");
  // perform actions on the collection object
  client.close();
});



// Root
app.get('/', (req, res) =>{
    res.send('Car Genius Server Is Running..');
})

app.listen(port, () =>{
    console.log('Genius Car Server Running On The Port: ', port);
})