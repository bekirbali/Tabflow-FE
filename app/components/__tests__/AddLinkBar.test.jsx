import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddLinkBar from '../AddLinkBar';

describe('AddLinkBar Component', () => {
  const mockOnAddLink = vi.fn();
  const mockAddToast = vi.fn();
  const mockOnSecretUnlock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders input field with placeholder and disabled add button initially', () => {
    render(
      <AddLinkBar
        onAddLink={mockOnAddLink}
        addToast={mockAddToast}
        onSecretUnlock={mockOnSecretUnlock}
      />
    );

    const input = screen.getByPlaceholderText(/Bir link yapıştırın/i);
    expect(input).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Akışa Ekle/i });
    expect(submitBtn).toBeDisabled();
  });

  it('shows error validation message when invalid url is typed', () => {
    render(
      <AddLinkBar
        onAddLink={mockOnAddLink}
        addToast={mockAddToast}
        onSecretUnlock={mockOnSecretUnlock}
      />
    );

    const input = screen.getByPlaceholderText(/Bir link yapıştırın/i);
    // Strings with spaces or broken schemes cause WHATWG new URL() to throw
    fireEvent.change(input, { target: { value: 'http://invalid url with spaces' } });

    // The validation error should appear
    expect(screen.getByText(/Geçersiz URL formatı/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Akışa Ekle/i });
    expect(submitBtn).toBeDisabled();
  });

  it('submits valid URL and calls onAddLink on successful metadata fetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        title: 'Harika Bir Makale',
        source_name: 'Medium',
        type: 'article',
      }),
    });

    render(
      <AddLinkBar
        onAddLink={mockOnAddLink}
        addToast={mockAddToast}
        onSecretUnlock={mockOnSecretUnlock}
      />
    );

    const input = screen.getByPlaceholderText(/Bir link yapıştırın/i);
    fireEvent.change(input, { target: { value: 'https://medium.com/@dev/post' } });

    const submitBtn = screen.getByRole('button', { name: /Akışa Ekle/i });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnAddLink).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://medium.com/@dev/post',
          title: 'Harika Bir Makale',
          source_name: 'Medium',
        })
      );
    });

    expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('eklendi'), 'success');
  });

  it('toggles secret password input when secret icon is clicked', () => {
    render(
      <AddLinkBar
        onAddLink={mockOnAddLink}
        addToast={mockAddToast}
        onSecretUnlock={mockOnSecretUnlock}
      />
    );

    // Initial state: secret input is inside max-h-0 container
    const secretInput = screen.getByPlaceholderText(/Gizli akış şifresi/i);
    expect(secretInput).toBeInTheDocument();

    // Link2 button is the first button inside the bar
    const buttons = screen.getAllByRole('button');
    const secretTriggerBtn = buttons[0]; // Link2 button

    fireEvent.click(secretTriggerBtn);

    // After click, the container opens
    expect(secretInput).toBeVisible();
  });
});
