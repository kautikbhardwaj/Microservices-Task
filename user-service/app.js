const express = require('express');
const app = express();
const port = 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'User Service is healthy' });
});

app.get('/users', (req, res) => {
  const users = [
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Smith' }
  ];
  res.json(users);
});

app.listen(port, () => {
  console.log(`User service running on port ${port}`);
});