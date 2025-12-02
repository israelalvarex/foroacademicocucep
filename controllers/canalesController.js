exports.obtenerCanales = (req, res) => {
  res.json([
    { id: 1, nombre: "General", descripcion: "Chat principal del foro" },
    { id: 2, nombre: "Ayuda", descripcion: "Soporte técnico y dudas" }
  ]);
};
