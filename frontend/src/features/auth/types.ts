export type LoginValues = {
  email: string;
  password: string;
};

export type RegistrationValues = LoginValues & {
  username: string;
  display_name: string;
};

export type AuthFieldName = keyof RegistrationValues;

export type FieldErrors = Partial<Record<AuthFieldName, string>>;

export type RegistrationResponse = {
  user: {
    id: string;
    email: string;
    username: string;
    display_name: string;
    bio: string | null;
    created_at: string;
    updated_at: string;
  };
};

export type TokenResponse = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
};

export type UserAccount = RegistrationResponse["user"];

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "error";
