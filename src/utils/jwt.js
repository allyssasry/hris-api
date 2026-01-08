// src/utils/jwt.js
import jwt from "jsonwebtoken";

export function issueJWT(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      companyId: user.companyId,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}
