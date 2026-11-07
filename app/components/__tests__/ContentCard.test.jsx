import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ContentCard from '../ContentCard';

describe('ContentCard Component', () => {
  const mockVideo = {
    id: 'link-uuid-123',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    video_id: 'dQw4w9WgXcQ',
    title: 'Harika Bir Yazılım Dersi',
    source_name: 'Furkan Çevik',
    author_name: 'Furkan Çevik',
    duration: '12:45',
    liked: false,
    bookmarked: false,
    is_clean: false,
    category: 'Yazılım',
  };

  const mockOnLike = vi.fn();
  const mockOnDislike = vi.fn();
  const mockOnBookmark = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnAction = vi.fn();
  const mockOnFocusClick = vi.fn();
  const mockAddToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders card title, author and duration correctly', () => {
    render(
      <ContentCard
        video={mockVideo}
        activeTab="feed"
        onLike={mockOnLike}
        onBookmark={mockOnBookmark}
        onDelete={mockOnDelete}
        onAction={mockOnAction}
        onFocusClick={mockOnFocusClick}
        addToast={mockAddToast}
      />
    );

    expect(screen.getByText('Harika Bir Yazılım Dersi')).toBeInTheDocument();
    expect(screen.getByText('Furkan Çevik')).toBeInTheDocument();
    expect(screen.getByText('12:45')).toBeInTheDocument();
  });

  it('triggers onLike callback when like button is clicked', () => {
    render(
      <ContentCard
        video={mockVideo}
        activeTab="feed"
        onLike={mockOnLike}
        onBookmark={mockOnBookmark}
        onDelete={mockOnDelete}
        onAction={mockOnAction}
        onFocusClick={mockOnFocusClick}
        addToast={mockAddToast}
      />
    );

    const likeButton = screen.getByTitle('Beğen (Like)');
    fireEvent.click(likeButton);

    expect(mockOnLike).toHaveBeenCalledWith('link-uuid-123');
  });

  it('triggers onBookmark callback when bookmark button is clicked', () => {
    render(
      <ContentCard
        video={mockVideo}
        activeTab="feed"
        onLike={mockOnLike}
        onBookmark={mockOnBookmark}
        onDelete={mockOnDelete}
        onAction={mockOnAction}
        onFocusClick={mockOnFocusClick}
        addToast={mockAddToast}
      />
    );

    // Find the bookmark button by SVG class or container
    const likeButton = screen.getByTitle('Beğen (Like)');
    const buttonGroup = likeButton.parentElement;
    const bookmarkButton = buttonGroup.querySelectorAll('button')[2]; // [like, dislike, bookmark]

    fireEvent.click(bookmarkButton);
    expect(mockOnBookmark).toHaveBeenCalledWith('link-uuid-123');
  });

  it('triggers onAction callback when Mark as Clean (Tamamlandı) button is clicked', () => {
    vi.useFakeTimers();

    render(
      <ContentCard
        video={mockVideo}
        activeTab="feed"
        onLike={mockOnLike}
        onBookmark={mockOnBookmark}
        onDelete={mockOnDelete}
        onAction={mockOnAction}
        onFocusClick={mockOnFocusClick}
        addToast={mockAddToast}
      />
    );

    const actionButton = screen.getByRole('button', { name: /Tamamlandı/i });
    fireEvent.click(actionButton);

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(mockOnAction).toHaveBeenCalledWith('link-uuid-123');
    vi.useRealTimers();
  });

  it('triggers onDelete callback when delete button is clicked', () => {
    vi.useFakeTimers();

    render(
      <ContentCard
        video={mockVideo}
        activeTab="feed"
        onLike={mockOnLike}
        onBookmark={mockOnBookmark}
        onDelete={mockOnDelete}
        onAction={mockOnAction}
        onFocusClick={mockOnFocusClick}
        addToast={mockAddToast}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: 'Kalıcı Sil' });
    fireEvent.click(deleteBtn);

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(mockOnDelete).toHaveBeenCalledWith('link-uuid-123');
    vi.useRealTimers();
  });
});
