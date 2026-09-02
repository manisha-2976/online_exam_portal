import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as facultyController from '../controllers/faculty.controller';

const router = Router();

// Get list of students
router.get('/students', authenticate, authorize(['faculty']), facultyController.getStudents);

// Get student details
router.get('/students/:studentId', authenticate, authorize(['faculty']), facultyController.getStudentDetails);

// Get exam results
router.get('/exams/:examId/results', authenticate, authorize(['faculty']), facultyController.getExamResults);

// Get created exams
router.get('/exams', authenticate, authorize(['faculty']), facultyController.getCreatedExams);

export default router; 