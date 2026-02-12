-- Allow credentials login lookup before tenant context exists.
-- This policy only exposes the row matching app.auth_email for the current transaction.

CREATE POLICY auth_user_lookup_policy ON users
  FOR SELECT
  TO PUBLIC
  USING (
    current_setting('app.auth_email', TRUE) IS NOT NULL
    AND email = current_setting('app.auth_email', TRUE)
  );
