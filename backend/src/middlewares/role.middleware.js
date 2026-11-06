/**
 * Role-Based Authorization Middleware
 * Supports 'admin', 'employee', and legacy 'user' (treated as employee)
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userRole = req.user.role === 'user' ? 'employee' : req.user.role;

    // Check if user has one of the allowed roles
    const hasRole = allowedRoles.some((role) => {
      if (role === 'employee') {
        return userRole === 'employee' || userRole === 'admin';
      }
      return userRole === role;
    });

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${allowedRoles.join(', ')}] role`,
      });
    }

    next();
  };
};

module.exports = {
  authorize,
};
