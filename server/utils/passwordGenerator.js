/**
 * Generate password for newly created doctor and PG accounts
 * Default behavior: use a fixed initial password.
 * Users can later change it via the Change Password flow.
 */
function generateRandomPassword(staffId = '') {
  return '123456';
}

export default generateRandomPassword;
