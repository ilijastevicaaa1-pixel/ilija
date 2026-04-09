import jwt from "jsonwebtoken";


// Auth middleware: JWT + tenantId
export function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Nema tokena" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, tenantId, role }
    if (!req.user.tenantId) {
      return res.status(403).json({ message: "Nedostaje tenantId" });
    }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Nevažeći token" });
  }
}

// Role check middleware
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Nedovoljna prava" });
    }
    next();
  };
}
