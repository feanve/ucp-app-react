import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/¡Universidad Católica de Pereira !/i);
  expect(linkElement).toBeInTheDocument();
});

test('Test que falla', () => {
  expect(true).toBe(false);
});
