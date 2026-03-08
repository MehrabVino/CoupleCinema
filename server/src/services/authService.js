export function createAuthService({ users, mailer, passwordHasher, tokenSigner }) {
  return {
    async register({ email, username, password }) {
      if (users.findByEmail(email)) return { error: "email_exists" };
      if (users.findByUsername(username)) return { error: "username_exists" };

      const passwordHash = await passwordHasher.hash(password);
      const user = users.create(email, username, passwordHash);
      await mailer.send({
        to: user.email,
        subject: "Confirm your account",
        text: `Your verification code is: ${user.verify_code}. It expires in 15 minutes.`
      });
      return {
        ok: true,
        requiresEmailConfirmation: true,
        email: user.email
      };
    },

    async login({ email, password }) {
      const user = users.findByEmail(email);
      if (!user) return { error: "invalid_credentials" };
      if (!user.email_verified) return { error: "email_not_confirmed" };

      const ok = await passwordHasher.compare(password, user.password_hash);
      if (!ok) return { error: "invalid_credentials" };

      const token = tokenSigner.sign({ sub: user.id, username: user.username });
      return { user: { id: user.id, username: user.username, public_id: user.public_id }, token };
    },

    confirmEmail({ email, code }) {
      return users.confirmEmailCode(email, code);
    },

    async resendConfirm({ email }) {
      const user = users.refreshVerifyCode(email);
      if (!user) return { error: "not_found" };
      await mailer.send({
        to: user.email,
        subject: "Confirm your account",
        text: `Your verification code is: ${user.verify_code}. It expires in 15 minutes.`
      });
      return { ok: true };
    },

    async forgotPassword({ email }) {
      const user = users.createPasswordReset(email);
      if (!user) return { ok: true };
      await mailer.send({
        to: user.email,
        subject: "Password reset code",
        text: `Your password reset code is: ${user.reset_code}. It expires in 15 minutes.`
      });
      return { ok: true };
    },

    async resetPassword({ email, code, password }) {
      const passwordHash = await passwordHasher.hash(password);
      return users.resetPasswordWithCode(email, code, passwordHash);
    }
  };
}

