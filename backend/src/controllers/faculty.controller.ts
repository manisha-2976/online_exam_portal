import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { Exam } from '../models/exam.model';
import { logger } from '../utils/logger';

export const getStudents = async (req: Request, res: Response) => {
  try {
    const { department, course, batch } = req.query;
    const query: any = { role: 'student', isActive: true };

    if (department) query.department = department;
    if (course) query.course = course;
    if (batch) query.batch = batch;

    const students = await User.find(query)
      .select('-password')
      .populate({
        path: 'examHistory.examId',
        select: 'title totalMarks passingMarks startTime endTime'
      });

    res.json(students);
  } catch (error) {
    logger.error('Error fetching students:', error);
    res.status(500).json({ message: 'Error fetching students' });
  }
};

export const getStudentDetails = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const student = await User.findById(studentId)
      .select('-password')
      .populate({
        path: 'examHistory.examId',
        select: 'title totalMarks passingMarks startTime endTime'
      });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    logger.error('Error fetching student details:', error);
    res.status(500).json({ message: 'Error fetching student details' });
  }
};

export const getExamResults = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const results = await User.find({
      'examHistory.examId': examId
    })
    .select('name email studentId examHistory.$')
    .populate('examHistory.examId', 'title totalMarks passingMarks');

    res.json(results);
  } catch (error) {
    logger.error('Error fetching exam results:', error);
    res.status(500).json({ message: 'Error fetching exam results' });
  }
};

export const getCreatedExams = async (req: Request, res: Response) => {
  try {
    const facultyId = req.user._id;
    const exams = await Exam.find({ createdBy: facultyId })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(exams);
  } catch (error) {
    logger.error('Error fetching created exams:', error);
    res.status(500).json({ message: 'Error fetching created exams' });
  }
}; 