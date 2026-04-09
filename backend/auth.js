import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb } from './db.js';   // ← OVO JE KLJUČNO

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';
const JWT_EXPIRES_IN = '7d';

export async function loginUser(email, password) {
  console.log('loginUser: email:', email, 'password:', password);
  const db = await getDb();

  const { rows } = await db.query(
    'SELECT id, email, password_hash, role, company_id FROM users WHERE email = $1',
    [email]
  );
  console.log('loginUser: rezultat upita iz baze:', rows);

  const user = rows[0];
  if (!user) {
    console.log('loginUser: korisnik nije pronađen u bazi');
    return null;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  console.log('loginUser: bcrypt.compare rezultat:', valid);
  if (!valid) {
    console.log('loginUser: lozinka nije validna');
    return null;
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      company_id: user.company_id
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      company_id: user.company_id
    }
  };
}

export function authMiddleware(roles = []) {
  return (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer '))
      return res.status(401).json({ error: 'No token' });

    const token = auth.split(' ')[1];

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;

      if (roles.length && !roles.includes(payload.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}




