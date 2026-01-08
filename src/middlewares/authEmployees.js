import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma.js";

export async function authEmployee(req, res, next) {
  try {
    
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "No token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
console.log("RAW TOKEN:", token);
console.log("DECODED:", decoded);

    if (!decoded.employeeId) {
      return res.status(401).json({
        message: "Invalid employee token",
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }
}
