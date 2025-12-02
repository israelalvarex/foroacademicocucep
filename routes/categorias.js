const express = require('express');
const router = express.Router();
const pool = require('../config/bd');

// Obtener todas las categorías activas
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre, descripcion, slug, orden, icono 
      FROM categoria
      WHERE activa = true
      ORDER BY orden ASC, id ASC
    `);

    res.json({
      mensaje: "Categorías obtenidas correctamente",
      categorias: result.rows
    });
  } catch (error) {
    console.error("Error al obtener categorías:", error);
    res.status(500).json({ mensaje: "Error al obtener categorías" });
  }
});

module.exports = router;
