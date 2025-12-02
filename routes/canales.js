const express = require('express');
const router = express.Router();
const canalesController = require('../controllers/canalesController');

router.get('/', canalesController.obtenerCanales);

module.exports = router;
