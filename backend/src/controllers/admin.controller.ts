import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { Exam } from '../models/exam.model';
import logger from '../utils/logger';

export const getFacultyList = async (req: Request, res: Response) => {
  try {
    const faculty = await User.find({ role: 'faculty', isActive: true })
      .select('-password')
      .populate('createdExams', 'title status startTime endTime');

    res.json(faculty);
  } catch (error) {
    logger.error('Error fetching faculty list:', error);
    res.status(500).json({ message: 'Error fetching faculty list' });
  }
};

export const getFacultyDetails = async (req: Request, res: Response) => {
  try {
    const { facultyId } = req.params;
    const faculty = await User.findById(facultyId)
      .select('-password')
      .populate('createdExams', 'title status startTime endTime totalMarks');

    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    res.json(faculty);
  } catch (error) {
    logger.error('Error fetching faculty details:', error);
    res.status(500).json({ message: 'Error fetching faculty details' });
  }
};

export const getStudentList = async (req: Request, res: Response) => {
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
    logger.error('Error fetching student list:', error);
    res.status(500).json({ message: 'Error fetching student list' });
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

export const getExamStatistics = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const results = await User.find({
      'examHistory.examId': examId
    })
    .select('examHistory.$')
    .populate('examHistory.examId', 'title totalMarks passingMarks');

    const statistics = {
      totalAttempts: results.length,
      passed: results.filter(r => r.examHistory[0].percentage >= 40).length,
      failed: results.filter(r => r.examHistory[0].percentage < 40).length,
      averageScore: results.reduce((acc, curr) => acc + curr.examHistory[0].percentage, 0) / results.length,
      highestScore: Math.max(...results.map(r => r.examHistory[0].percentage)),
      lowestScore: Math.min(...results.map(r => r.examHistory[0].percentage))
    };

    res.json(statistics);
  } catch (error) {
    logger.error('Error fetching exam statistics:', error);
    res.status(500).json({ message: 'Error fetching exam statistics' });
  }
}; 