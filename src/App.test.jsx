import { render, screen } from '@testing-library/react';
import App from './App';

test('renders fixtures view', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /fixtures/i });
  expect(heading).toBeInTheDocument();
});
