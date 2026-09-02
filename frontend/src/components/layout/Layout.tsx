import styled from 'styled-components';
import { motion } from 'framer-motion';

export const Layout = styled(motion.div)`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

export const MainContent = styled(motion.main)`
  flex: 1;
  padding: 2rem 0;
  max-width: ${({ theme }) => theme.breakpoints.wide};
  margin: 0 auto;
  width: 100%;
  padding: 0 1rem;

  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 0 2rem;
  }
`; 