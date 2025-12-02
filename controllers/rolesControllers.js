exports.obtenerRoles = (req, res) => {
  res.json([
    { id: 1, rol: "Administrador" },
    { id: 2, rol: "Profesor" },
    { id: 3, rol: "Estudiante" }
  ]);
};
