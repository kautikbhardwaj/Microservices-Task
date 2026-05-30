const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());
const port = 3002;

const orders = [];

app.get('/health', (req, res) => {
  res.json({ status: 'Order Service is healthy' });
});

app.get('/orders', (req, res) => {
  res.json(orders);
});

app.post('/orders', async (req, res) => {
  const order = {
    id: orders.length + 1,
    userId: req.body.userId,
    productId: req.body.productId,
    timestamp: new Date()
  };
  orders.push(order);
  res.json(order);
});

app.listen(port, () => {
  console.log(`Order service running on port ${port}`);
});
