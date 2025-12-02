const bcrypt = require('bcryptjs');

const usuarios = [
  'test@cucep.edu.mx',
  'estudiante1@cucep.edu.mx',
  'auto@cucep.edu.mx',
  'admin@cucep.edu.mx',
  'admin2@cucep.edu.mx',
  'admin3@cucep.edu.mx',
  'profesor.func@cucep.edu.mx'
];

(async () => {
  for (const email of usuarios) {
    const hash = await bcrypt.hash('admin123', 10);
    console.log(`UPDATE usuario SET password_hash = '${hash}' WHERE email = '${email}';`);
  }
})();
