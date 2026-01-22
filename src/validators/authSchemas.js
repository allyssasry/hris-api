import { z } from "zod";

/** FE kirim { identifier, password } */
export const signInSchema = z.object({
  // cukup ada isinya; tidak perlu min 3 karena bisa email/username/telepon
  identifier: z.string().trim().min(1, "identifier required"),
  password:   z.string().min(6, "password too short"),
});

/** 
 * Sign Up Schema - sesuai dengan frontend SignUp.jsx
 * Frontend mengirim: firstName, lastName, email, password, confirmPassword, companyName
 */
export const signUpSchema = z.object({
  firstName:       z.string().trim().min(1, "First name is required"),
  lastName:        z.string().trim().min(1, "Last name is required"),
  email:           z.string().trim().toLowerCase().email("Invalid email format"),
  password:        z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().optional(), // Frontend sends this for validation
  companyName:     z.string().trim().optional().nullable(), // Opsional
});

/** (opsional) employee login */
export const employeeSignInSchema = z.object({
  companyUser: z.string().trim().min(1, "companyUser required"),
  employeeId:  z.string().trim().min(1, "employeeId required"),
  password:    z.string().min(6, "password too short"),
});

export const googleTokenSchema = z
  .object({
    idToken: z.string().min(10, "idToken invalid").optional(),
    credential: z.string().min(10, "credential invalid").optional(),
  })
  .refine((data) => data.idToken || data.credential, {
    message: "idToken or credential is required",
    path: ["idToken"],
  });