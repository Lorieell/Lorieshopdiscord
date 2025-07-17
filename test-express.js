const express = require('express');
const app = express();
app.get('/', (req, res) => {
  res.send('Test: Bot is alive!');
});
app.listen(3000, '127.0.0.1', () => {
  console.log('Test app is listening on port 3000');
});