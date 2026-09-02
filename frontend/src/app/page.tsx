'use client';

import Link from 'next/link';
import styled from 'styled-components';
import { motion, useScroll, useTransform } from 'framer-motion';
import { fadeIn, slideIn } from '@/config/animations';
import { ArrowRight } from 'lucide-react';
import { useRef } from 'react';

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(20, 20, 20, 0.75);
  backdrop-filter: blur(10px);
`;

const Container = styled.div`
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.lg};
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  height: 3.5rem;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const Logo = styled(Link)`
  font-weight: 700;
  font-size: 1.25rem;
  color: #ffffff;
  text-decoration: none;
`;

const NavLink = styled(Link)`
  color: #cbd5e1;
  font-size: 1rem;
  text-decoration: none;
  transition: 0.3s;

  &:hover {
    color: #38bdf8;
  }
`;

const Hero = styled(motion.section)`
  padding: 8rem 0 4rem;
  text-align: center;
  background: linear-gradient(to bottom, #0f172a, #1e293b);
`;

const Title = styled(motion.h1)`
  font-size: clamp(2rem, 5vw, 4.5rem);
  font-weight: 800;
  background: linear-gradient(90deg, #38bdf8, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 1rem;
`;

const Subtitle = styled(motion.p)`
  font-size: 1.125rem;
  color: #cbd5e1;
  max-width: 42rem;
  margin: 0 auto 2rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
`;

const PrimaryButton = styled(Link)`
  background: #38bdf8;
  color: #0f172a;
  padding: 0.5rem 1.25rem;
  font-weight: 600;
  border-radius: 1rem;
  text-decoration: none;
  transition: 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: #0ea5e9;
  }
`;

const SecondaryButton = styled(Link)`
  background: transparent;
  color: #cbd5e1;
  padding: 0.5rem 1.25rem;
  font-weight: 600;
  border: 1px solid #334155;
  border-radius: 1rem;
  text-decoration: none;
  transition: 0.3s;

  &:hover {
    background: #1e293b;
  }
`;

const Testimonial = styled.section`
  background: #0f172a;
  padding: 6rem 0;
  text-align: center;
`;

const Quote = styled(motion.blockquote)`
  font-size: 1.25rem;
  font-style: italic;
  color: #94a3b8;
  max-width: 48rem;
  margin: 0 auto 2rem;
`;

const Author = styled.p`
  font-weight: 500;
  color: #38bdf8;
`;

const Blob = styled(motion.div)`
  position: absolute;
  z-index: -1;
  width: 480px;
  height: 480px;
  filter: blur(140px);
  border-radius: 40% 60% 60% 40% / 40% 40% 60% 60%;
  opacity: 0.6;
`;

const SVGShape = styled(motion.svg)`
  position: absolute;
  z-index: -10;
  width: 800px;
  height: 800px;
  opacity: 0.2;
`;

const FloatingButton = styled(motion.div)`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: #38bdf8;
  color: #0f172a;
  padding: 0.75rem 1.25rem;
  border-radius: 9999px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.3);
  transition: 0.3s;
  z-index: 100;

  &:hover {
    background: #0ea5e9;
  }
`;

export default function Home() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref });
  const y = useTransform(scrollYProgress, [0, 1], [0, 300]);

  return (
    <div className="relative flex min-h-screen flex-col bg-[#0f172a] text-white overflow-hidden" ref={ref}>
      <Blob
        style={{ top: '-10%', left: '-10%', background: '#38bdf8' }}
        animate={{ x: [0, 30, -30, 0], y: [0, -20, 20, 0] }}
        transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
      />
      <Blob
        style={{ bottom: '-10%', right: '-10%', background: '#818cf8' }}
        animate={{ x: [0, -30, 30, 0], y: [0, 20, -20, 0] }}
        transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
      />
      <SVGShape
        style={{ top: '20%', left: '30%', y }}
        viewBox="0 0 200 200"
        fill="#ffffff"
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.path
          d="M49.7,-61.6C63.9,-53.2,75.7,-39.2,79.4,-23.6C83.1,-8,78.6,8.9,71.3,24.7C63.9,40.6,53.6,55.3,39.4,65.5C25.2,75.7,7.1,81.5,-8.5,81.1C-24.2,80.6,-38.3,74,-50.1,63.6C-61.9,53.2,-71.5,39.1,-74.5,23.8C-77.5,8.5,-74,-7.9,-67.1,-22.5C-60.2,-37,-50,-49.7,-37.1,-58.7C-24.2,-67.7,-12.1,-72.9,2.2,-76.3C16.4,-79.7,32.8,-81.5,49.7,-61.6Z"
          transform="translate(100 100)"
        />
      </SVGShape>
      <Header>
        <Container>
          <Nav>
            <Logo href="/">ExamFlow</Logo>
            <div style={{ flex: 1 }} />
            <NavLink href="/login">Login</NavLink>
            <NavLink href="/register">Register</NavLink>
          </Nav>
        </Container>
      </Header>
      <main className="flex-1">
        <Container>
          <Hero initial="hidden" animate="visible" variants={fadeIn}>
            <Title variants={slideIn}>Welcome to ExamFlow</Title>
            <Subtitle variants={slideIn}>
              A modern platform for conducting online examinations with AI-powered proctoring.
            </Subtitle>
            <ButtonGroup>
              <PrimaryButton href="/register">
                Get Started <ArrowRight size={18} />
              </PrimaryButton>
              <SecondaryButton href="/about">Learn More</SecondaryButton>
            </ButtonGroup>
          </Hero>
        </Container>
        <section className="container space-y-6 bg-[#1e293b] py-12">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center">
            <h2 className="text-4xl font-bold text-white">Features</h2>
            <p className="max-w-[85%] text-slate-300 text-lg">
              Our platform offers a comprehensive solution for online examinations
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-6 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3 lg:gap-10">
            {[
              {
                title: 'AI Proctoring',
                desc: 'Advanced AI-powered monitoring to ensure exam integrity',
              },
              {
                title: 'Real-time Analytics',
                desc: 'Comprehensive analytics and reporting for exam performance',
              },
              {
                title: 'Secure Platform',
                desc: 'Enterprise-grade security with end-to-end encryption',
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.2 }}
                viewport={{ once: true }}
                className="relative overflow-hidden rounded-2xl border border-slate-600 bg-[#0f172a] p-6 shadow-lg hover:shadow-xl transition"
              >
                <h3 className="font-semibold text-xl text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <Testimonial>
          <Quote
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
          >
            "ExamFlow revolutionized our exam process. It's reliable, secure, and easy to use."
          </Quote>
          <Author>- Dr. Shreya Mehta, Head of Department</Author>
        </Testimonial>
      </main>
      <footer className="border-t border-slate-700 py-6">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-slate-400">
            Built by{' '}
            <a href="#" target="_blank" rel="noreferrer" className="font-medium text-white underline">
              Your Team
            </a>
            . Code available on{' '}
            <a href="#" target="_blank" rel="noreferrer" className="font-medium text-white underline">
              GitHub
            </a>
            .
          </p>
        </div>
      </footer>

      <FloatingButton
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        ↑ Back to Top
      </FloatingButton>
    </div>
  );
}