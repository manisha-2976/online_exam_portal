'use client';

import styled from 'styled-components';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { fadeIn, slideIn } from '@/config/animations';

const Background = styled.div`
  background: linear-gradient(to bottom right, #0f172a, #1e293b);
  min-height: 100vh;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const Container = styled.div`
  max-width: 1280px;
  margin: 0 auto;
`;

const Section = styled(motion.section)`
  margin: ${({ theme }) => theme.spacing.xl} 0;
`;

const Title = styled(motion.h1)`
  font-size: ${({ theme }) => theme.typography.fontSize.xxlarge};
  background: linear-gradient(90deg, #38bdf8, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Card = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
`;

const Text = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.medium};
  color: #cbd5e1;
  line-height: 1.6;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const BackButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  color: #38bdf8;
  font-size: ${({ theme }) => theme.typography.fontSize.medium};
  text-decoration: none;
  padding: ${({ theme }) => theme.spacing.sm} 0;
  transition: 0.3s;

  &:hover {
    color: #818cf8;
  }

  &::before {
    content: '←';
    font-size: 1.2em;
  }
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const FeatureCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};

  h3 {
    font-size: ${({ theme }) => theme.typography.fontSize.large};
    color: #ffffff;
    margin: 0;
  }

  p, ul {
    color: #94a3b8;
    margin: 0;
  }
`;

export default function About() {
  return (
    <Background>
      <Container>
        <Section initial="hidden" animate="visible" variants={fadeIn}>
          <BackButton href="/">Back to Home</BackButton>

          <Title variants={slideIn}>About ExamFlow</Title>

          <Card variants={slideIn}>
            <Text>
              Welcome to our state-of-the-art ExamFlow platform, designed to revolutionize the way educational institutions conduct examinations. Our platform combines cutting-edge technology with user-friendly interfaces to provide a seamless examination experience for both students and educators.
            </Text>
            <Text>
              With advanced AI-powered proctoring, real-time analytics, and enterprise-grade security, we ensure the integrity and efficiency of online assessments while making the process smooth and accessible for all users.
            </Text>
          </Card>

          <FeatureGrid>
            <FeatureCard variants={slideIn}>
              <h3>AI-Powered Proctoring</h3>
              <p>Our advanced AI system monitors examinations in real-time, detecting and preventing malpractice through:</p>
              <ul>
                <li>Face detection and tracking</li>
                <li>Multiple face detection</li>
                <li>Eye movement tracking</li>
                <li>Audio monitoring</li>
                <li>Screen activity monitoring</li>
              </ul>
            </FeatureCard>

            <FeatureCard variants={slideIn}>
              <h3>Real-time Analytics</h3>
              <p>Comprehensive analytics and reporting features including:</p>
              <ul>
                <li>Performance tracking</li>
                <li>Progress monitoring</li>
                <li>Detailed exam statistics</li>
                <li>Custom report generation</li>
                <li>Data visualization</li>
              </ul>
            </FeatureCard>

            <FeatureCard variants={slideIn}>
              <h3>Security Features</h3>
              <p>Enterprise-grade security measures ensuring:</p>
              <ul>
                <li>End-to-end encryption</li>
                <li>Secure authentication</li>
                <li>Data protection</li>
                <li>Privacy compliance</li>
                <li>Regular security audits</li>
              </ul>
            </FeatureCard>
          </FeatureGrid>
        </Section>
      </Container>
    </Background>
  );
}