// Simple endpoint to serve sidebar colors for Electron
const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

router.get('/sidebar-colors', (req, res) => {
  const jsonPath = path.join(__dirname, '../../../sidebar-colors.json');
  fs.readFile(jsonPath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).json({ error: 'Could not read sidebar-colors.json' });
      return;
    }
    try {
      const colors = JSON.parse(data);
      res.json(colors);
    } catch (e) {
      res.status(500).json({ error: 'Invalid JSON' });
    }
  });
});

module.exports = router;
