// src/config/passport.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "../utils/prisma.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

/**
 * Configure Google OAuth Strategy
 */
export function configurePassport() {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:4000/api/auth/google/callback",
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const googleId = profile.id;
          const firstName = profile.name?.givenName || profile.displayName?.split(" ")[0] || "User";
          const lastName = profile.name?.familyName || profile.displayName?.split(" ").slice(1).join(" ") || "";
          const avatar = profile.photos?.[0]?.value || null;

          console.log("\n========== GOOGLE OAUTH ==========");
          console.log("Email:", email);
          console.log("Google ID:", googleId);

          if (!email) {
            return done(new Error("No email found in Google profile"), null);
          }

          // Check if user exists by email
          let user = await prisma.user.findUnique({
            where: { email },
            include: {
              accounts: true,
              ownedCompanies: true,
            },
          });

          let isNewUser = false;

          if (user) {
            console.log("✅ User exists:", user.email, "Role:", user.role, "CompanyId:", user.companyId);
            
            // User exists - check if Google account is linked
            const googleAccount = user.accounts.find(
              (acc) => acc.provider === "google" && acc.providerAccountId === googleId
            );

            if (!googleAccount) {
              // Link Google account to existing user
              await prisma.oAuthAccount.create({
                data: {
                  userId: user.id,
                  provider: "google",
                  providerAccountId: googleId,
                  email: email,
                  accessToken: accessToken,
                  refreshToken: refreshToken,
                },
              });
              console.log("✅ Google account linked to existing user");
            } else {
              // Update tokens
              await prisma.oAuthAccount.update({
                where: { id: googleAccount.id },
                data: {
                  accessToken: accessToken,
                  refreshToken: refreshToken,
                },
              });
              console.log("✅ Google tokens updated");
            }

            // IMPORTANT: If existing user has no company and is admin role, 
            // they still need to setup company
            // This handles the case where user was created via Google but didn't complete setup
            
          } else {
            // New user - create user as admin WITHOUT company (need to setup company later)
            isNewUser = true;
            console.log("🆕 Creating new user as ADMIN...");
            
            const newUser = await prisma.user.create({
              data: {
                email: email,
                username: email.split("@")[0],
                password: "", // No password for OAuth users
                firstName: firstName,
                lastName: lastName,
                avatar: avatar,
                role: "admin", // Auto admin for Google sign up
                companyId: null, // No company yet - user needs to set it up
              },
            });

            // Link Google OAuth account
            await prisma.oAuthAccount.create({
              data: {
                userId: newUser.id,
                provider: "google",
                providerAccountId: googleId,
                email: email,
                accessToken: accessToken,
                refreshToken: refreshToken,
              },
            });

            user = newUser;
            console.log("✅ New user created:", user.email, "Role:", user.role);
          }

          // Refresh user data
          user = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
              ownedCompanies: true,
            },
          });

          // Attach isNewUser flag to user object
          user.isNewUser = isNewUser;
          
          console.log("📤 Returning user - isNewUser:", isNewUser, "companyId:", user.companyId);
          console.log("==================================\n");

          return done(null, user);
        } catch (error) {
          console.error("Google OAuth error:", error);
          return done(error, null);
        }
      }
    )
  );

  // Serialize user for session (not used in JWT flow, but required)
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
}

/**
 * Generate JWT token for user
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      companyId: user.companyId,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export default passport;

// Auto-configure on import
configurePassport();
