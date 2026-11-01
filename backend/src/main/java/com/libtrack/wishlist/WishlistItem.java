package com.libtrack.wishlist;

import com.libtrack.auth.UserAccount;
import com.libtrack.catalogue.Book;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(
        name = "book_wishlist",
        uniqueConstraints = @UniqueConstraint(name = "uq_book_wishlist_user_book", columnNames = {"user_account_id", "book_id"})
)
public class WishlistItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_account_id", nullable = false)
    private UserAccount user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected WishlistItem() {}

    public WishlistItem(UserAccount user, Book book, Instant createdAt) {
        this.user = Objects.requireNonNull(user, "User cannot be null");
        this.book = Objects.requireNonNull(book, "Book cannot be null");
        this.createdAt = Objects.requireNonNull(createdAt, "CreatedAt cannot be null");
    }

    public UUID getId() {
        return id;
    }

    public UserAccount getUser() {
        return user;
    }

    public Book getBook() {
        return book;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
