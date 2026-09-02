import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Student, Exam } from '@/types';
import ProtectedRoute from '@/components/ProtectedRoute';

const DashboardContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Section = styled.section`
  margin-bottom: 2rem;
  background: ${({ theme }) => theme.colors.background};
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 1rem;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;

  th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }

  th {
    background: ${({ theme }) => theme.colors.backgroundAlt};
    font-weight: 600;
  }

  tr:hover {
    background: ${({ theme }) => theme.colors.backgroundAlt};
  }
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsRes, examsRes] = await Promise.all([
          api.get('/faculty/students'),
          api.get('/faculty/exams')
        ]);
        setStudents(studentsRes.data);
        setExams(examsRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <ProtectedRoute allowedRoles={['faculty']}>
      <DashboardContainer>
        <Section>
          <Title>Students</Title>
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Course</th>
                <th>Batch</th>
                <th>Exams Taken</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student._id}>
                  <td>{student.name}</td>
                  <td>{student.email}</td>
                  <td>{student.department}</td>
                  <td>{student.course}</td>
                  <td>{student.batch}</td>
                  <td>{student.examHistory?.length || 0}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Section>

        <Section>
          <Title>Created Exams</Title>
          {exams.map((exam) => (
            <Card key={exam._id}>
              <h3>{exam.title}</h3>
              <p>{exam.description}</p>
              <div>
                <span>Status: {exam.status}</span>
                <span>Total Marks: {exam.totalMarks}</span>
                <span>Duration: {exam.duration} minutes</span>
              </div>
            </Card>
          ))}
        </Section>
      </DashboardContainer>
    </ProtectedRoute>
  );
} 