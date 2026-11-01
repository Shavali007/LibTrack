-- V18: Book Wishlist Module
CREATE TABLE book_wishlist (
    id BINARY(16) NOT NULL,
    user_account_id BINARY(16) NOT NULL,
    book_id BINARY(16) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_book_wishlist PRIMARY KEY (id),
    CONSTRAINT uq_book_wishlist_user_book UNIQUE (user_account_id, book_id),
    CONSTRAINT fk_book_wishlist_user FOREIGN KEY (user_account_id) REFERENCES user_account (id) ON DELETE CASCADE,
    CONSTRAINT fk_book_wishlist_book FOREIGN KEY (book_id) REFERENCES book (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_book_wishlist_user ON book_wishlist (user_account_id);
CREATE INDEX idx_book_wishlist_book ON book_wishlist (book_id);
CREATE INDEX idx_book_wishlist_created ON book_wishlist (created_at);
