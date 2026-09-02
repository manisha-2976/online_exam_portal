import styled from 'styled-components';
import { motion } from 'framer-motion';

export const MobileNavButton = styled(motion.button)`
  display: none;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
  }
`;

export const MobileMenu = styled(motion.div)`
  display: none;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: flex;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${({ theme }) => theme.colors.background};
    padding: 2rem;
    flex-direction: column;
    gap: 1rem;
  }
`; 