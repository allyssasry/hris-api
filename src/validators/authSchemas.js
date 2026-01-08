import { z } from "zod";

/** FE kirim { identifier, password } */
export const signInSchema = z.object({
  // cukup ada isinya; tidak perlu min 3 karena bisa email/username/telepon
  identifier: z.string().trim().min(1, "identifier required"),
  password:   z.string().min(6, "password too short"),
});

/** username opsional – boleh kosong/null, otomatis jadi null */
export const signUpSchema = z.object({
  firstName: z.string().trim().min(1, "first name required"),
  lastName:  z.string().trim().min(1, "last name required"),
  email:     z.string().trim().toLowerCase().email("invalid email"),
  username:  z.string().trim().min(3, "min 3 chars")
                .optional().nullable()
                .transform(v => (v && v.length ? v.toLowerCase() : null)),
  password:  z.string().min(8, "min 8 chars"),
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