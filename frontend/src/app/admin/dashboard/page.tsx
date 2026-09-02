import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Faculty, Student, Exam } from '@/types';
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

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;

  h3 {
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: 0.5rem;
  }

  p {
    font-size: 2rem;
    font-weight: bold;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

export default function AdminDashboard() {
  const { user } = useAuth();
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState({
    totalFaculty: 0,
    totalStudents: 0,
    activeExams: 0,
    totalExams: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [facultyRes, studentsRes] = await Promise.all([
          api.get('/admin/faculty'),
          api.get('/admin/students')
        ]);
        setFaculty(facultyRes.data);
        setStudents(studentsRes.data);
        
        // Calculate statistics
        setStats({
          totalFaculty: facultyRes.data.length,
          totalStudents: studentsRes.data.length,
          activeExams: facultyRes.data.reduce((acc, f) => acc + (f.createdExams?.filter(e => e.status === 'active').length || 0), 0),
          totalExams: facultyRes.data.reduce((acc, f) => acc + (f.createdExams?.length || 0), 0)
        });
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
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardContainer>
        <StatsContainer>
          <StatCard>
            <h3>Total Faculty</h3>
            <p>{stats.totalFaculty}</p>
          </StatCard>
          <StatCard>
            <h3>Total Students</h3>
            <p>{stats.totalStudents}</p>
          </StatCard>
          <StatCard>
            <h3>Active Exams</h3>
            <p>{stats.activeExams}</p>
          </StatCard>
          <StatCard>
            <h3>Total Exams</h3>
            <p>{stats.totalExams}</p>
          </StatCard>
        </StatsContainer>

        <Section>
          <Title>Faculty Members</Title>
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Created Exams</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {faculty.map((member) => (
                <tr key={member._id}>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>{member.department}</td>
                  <td>{member.createdExams?.length || 0}</td>
                  <td>{member.isActive ? 'Active' : 'Inactive'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Section>

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
      </DashboardContainer>
    </ProtectedRoute>
  );
} 