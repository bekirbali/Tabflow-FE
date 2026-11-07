import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchBar from '../SearchBar';

describe('SearchBar Component', () => {
  const mockOnQueryChange = vi.fn();
  const mockOnClear = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input with placeholder', () => {
    render(
      <SearchBar
        query=""
        onQueryChange={mockOnQueryChange}
        onClear={mockOnClear}
        isLoading={false}
      />
    );

    const input = screen.getByPlaceholderText(/Videolarda ara.../i);
    expect(input).toBeInTheDocument();
    expect(input.value).toBe("");
  });

  it('calls onQueryChange when user types', () => {
    render(
      <SearchBar
        query=""
        onQueryChange={mockOnQueryChange}
        onClear={mockOnClear}
        isLoading={false}
      />
    );

    const input = screen.getByPlaceholderText(/Videolarda ara.../i);
    fireEvent.change(input, { target: { value: 'Python' } });
    expect(mockOnQueryChange).toHaveBeenCalledWith('Python');
  });

  it('shows clear button when query is not empty and calls onClear on click', () => {
    render(
      <SearchBar
        query="React"
        onQueryChange={mockOnQueryChange}
        onClear={mockOnClear}
        isLoading={false}
        isSearchActive={true}
      />
    );

    const clearBtn = screen.getByTitle(/Aramayı temizle/i);
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);
    expect(mockOnClear).toHaveBeenCalled();
  });

  it('triggers onClear when Escape key is pressed', () => {
    render(
      <SearchBar
        query="NextJS"
        onQueryChange={mockOnQueryChange}
        onClear={mockOnClear}
        isLoading={false}
        isSearchActive={true}
      />
    );

    const input = screen.getByPlaceholderText(/Videolarda ara.../i);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(mockOnClear).toHaveBeenCalled();
  });
});

