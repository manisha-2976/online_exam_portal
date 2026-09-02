import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// Get list of faculty
router.get('/faculty', authenticate, authorize(['admin']), adminController.getFacultyList);

// Get faculty details
router.get('/faculty/:facultyId', authenticate, authorize(['admin']), adminController.getFacultyDetails);

// Get list of students
router.get('/students', authenticate, authorize(['admin']), adminController.getStudentList);

// Get student details
router.get('/students/:studentId', authenticate, authorize(['admin']), adminController.getStudentDetails);

// Get exam statistics
router.get('/exams/:examId/statistics', authenticate, authorize(['admin']), adminController.getExamStatistics);

export default router; 