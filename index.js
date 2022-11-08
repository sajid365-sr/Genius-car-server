
const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');

app.use(cors());
app.use(express.json());

app.get('/', (req, res) =>{
    res.send('Car Genius Server Is Running..');
})

app.listen(port, () =>{
    console.log('Genius Car Server Running On The Port: ', port);
})