const express = require('express');
const app = express();
const port = 3001;

app.get('/health', (req, res) => {
  res.json({ status: 'Product Service is healthy' });
});

app.get('/products', (req, res) => {
  const products = [
    { id: 1, name: 'Laptop', price: 999 },
    { id: 2, name: 'Phone', price: 699 }
  ];
  res.json(products);
});

app.listen(port, () => {
  console.log(`Product service running on port ${port}`);
});