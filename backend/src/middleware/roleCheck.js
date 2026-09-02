// Middleware to check if user is a teacher or admin
const isTeacherOrAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'teacher' && req.user.role !== 'faculty' && req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'Access denied. Teachers and admins only.' });
  }
  next();
};

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

module.exports = {
  isTeacherOrAdmin,
  isAdmin
}; 