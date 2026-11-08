package com.libtrack.wishlist;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import com.libtrack.LibTrackIntegrationTest;
import com.libtrack.auth.AccountRole;
import com.libtrack.auth.AccountUserDetails;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.catalogue.Author;
import com.libtrack.catalogue.AuthorRepository;
import com.libtrack.catalogue.Book;
import com.libtrack.catalogue.BookCopyBulkCreateRequest;
import com.libtrack.catalogue.BookCopyRepository;
import com.libtrack.catalogue.BookDetailResponse;
import com.libtrack.catalogue.BookRepository;
import com.libtrack.catalogue.BookRequest;
import com.libtrack.catalogue.CatalogueService;
import com.libtrack.catalogue.Category;
import com.libtrack.catalogue.CategoryRepository;
import com.libtrack.catalogue.CirculationPolicy;
import com.libtrack.notifications.AppNotification;
import com.libtrack.notifications.NotificationRecord;
import com.libtrack.notifications.NotificationRepository;
import com.libtrack.notifications.NotificationService;
import com.libtrack.notifications.UserNotificationPreference;
import com.libtrack.notifications.UserNotificationPreferenceRepository;

@LibTrackIntegrationTest
@Transactional
class WishlistNewBookNotificationIntegrationTest {

    @Autowired private WishlistService wishlistService;
    @Autowired private WishlistRepository wishlistRepository;
    @Autowired private CatalogueService catalogueService;
    @Autowired private BookRepository bookRepository;
    @Autowired private BookCopyRepository copyRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private AuthorRepository authorRepository;
    @Autowired private UserAccountRepository accountRepository;
    @Autowired private NotificationService notificationService;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private UserNotificationPreferenceRepository preferenceRepository;
    @Autowired private PasswordEncoder encoder;

    private UserAccount librarian;
    private UserAccount studentWithCsWishlist;
    private UserAccount studentWithMultiWishlistSameCategory;
    private UserAccount facultyWithMultiCategories;
    private UserAccount studentWithOtherCategory;
    private UserAccount studentWithEmptyWishlist;
    private UserAccount disabledStudent;
    private UserAccount pendingStudent;
    private UserAccount librarianUser;

    private Category csCategory;
    private Category mathCategory;
    private Category litCategory;

    private Book existingCsBook1;
    private Book existingCsBook2;
    private Book existingMathBook;
    private Book existingLitBook;

    @BeforeEach
    void setup() {
        notificationRepository.deleteAll();
        wishlistRepository.deleteAll();

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        librarian = accountRepository.save(UserAccount.initialLibrarian(
                "librarian." + suffix + "@vitap.ac.in", encoder.encode("Secret123!")));

        studentWithCsWishlist = createProvisionedAccount("student.cs." + suffix + "@vitapstudent.ac.in", AccountRole.STUDENT, "Alice CS");
        studentWithMultiWishlistSameCategory = createProvisionedAccount("student.multi." + suffix + "@vitapstudent.ac.in", AccountRole.STUDENT, "Bob Multi");
        facultyWithMultiCategories = createProvisionedAccount("prof.mathcs." + suffix + "@vitap.ac.in", AccountRole.FACULTY, "Dr. Turing");
        studentWithOtherCategory = createProvisionedAccount("student.lit." + suffix + "@vitapstudent.ac.in", AccountRole.STUDENT, "Clara Lit");
        studentWithEmptyWishlist = createProvisionedAccount("student.empty." + suffix + "@vitapstudent.ac.in", AccountRole.STUDENT, "Dave Empty");

        disabledStudent = createProvisionedAccount("student.disabled." + suffix + "@vitapstudent.ac.in", AccountRole.STUDENT, "Eve Disabled");
        disabledStudent.deactivate();
        disabledStudent = accountRepository.save(disabledStudent);

        pendingStudent = accountRepository.save(UserAccount.pendingSelfRegistration(
                "student.pending." + suffix + "@vitapstudent.ac.in",
                encoder.encode("Secret123!"),
                AccountRole.STUDENT,
                "Frank Pending",
                "PEND-" + suffix
        ));

        librarianUser = accountRepository.save(UserAccount.initialLibrarian(
                "librarian.other." + suffix + "@vitap.ac.in", encoder.encode("Secret123!")));

        csCategory = categoryRepository.findByNormalizedName("computer science")
                .orElseGet(() -> categoryRepository.save(new Category("Computer Science", "computer science")));
        mathCategory = categoryRepository.findByNormalizedName("mathematics")
                .orElseGet(() -> categoryRepository.save(new Category("Mathematics", "mathematics")));
        litCategory = categoryRepository.findByNormalizedName("literature")
                .orElseGet(() -> categoryRepository.save(new Category("Literature", "literature")));

        Author author = authorRepository.findByNormalizedName("ada lovelace")
                .orElseGet(() -> authorRepository.save(new Author("Ada Lovelace", "ada lovelace")));

        existingCsBook1 = createBookInDb("Algorithms 101", "978" + Math.abs((suffix + "1").hashCode()), Set.of(author), Set.of(csCategory));
        existingCsBook2 = createBookInDb("Data Structures", "978" + Math.abs((suffix + "2").hashCode()), Set.of(author), Set.of(csCategory));
        existingMathBook = createBookInDb("Discrete Mathematics", "978" + Math.abs((suffix + "3").hashCode()), Set.of(author), Set.of(mathCategory));
        existingLitBook = createBookInDb("Shakespeare Complete", "978" + Math.abs((suffix + "4").hashCode()), Set.of(author), Set.of(litCategory));

        // Setup Wishlists
        wishlistRepository.save(new WishlistItem(studentWithCsWishlist, existingCsBook1, Instant.now()));

        wishlistRepository.save(new WishlistItem(studentWithMultiWishlistSameCategory, existingCsBook1, Instant.now()));
        wishlistRepository.save(new WishlistItem(studentWithMultiWishlistSameCategory, existingCsBook2, Instant.now()));

        wishlistRepository.save(new WishlistItem(facultyWithMultiCategories, existingCsBook1, Instant.now()));
        wishlistRepository.save(new WishlistItem(facultyWithMultiCategories, existingMathBook, Instant.now()));

        wishlistRepository.save(new WishlistItem(studentWithOtherCategory, existingLitBook, Instant.now()));
        wishlistRepository.save(new WishlistItem(disabledStudent, existingCsBook1, Instant.now()));
        wishlistRepository.save(new WishlistItem(pendingStudent, existingCsBook1, Instant.now()));
        wishlistRepository.save(new WishlistItem(librarianUser, existingCsBook1, Instant.now()));

        authenticateAs(librarian);
    }

    private UserAccount createProvisionedAccount(String email, AccountRole role, String name) {
        UserAccount acc = accountRepository.save(UserAccount.provisionMember(
                email,
                encoder.encode("Secret123!"),
                role,
                "ID-" + UUID.randomUUID().toString().substring(0, 8),
                librarian.getId(),
                Instant.now(),
                name
        ));
        acc.setDepartment("Computer Science and Engineering");
        return accountRepository.save(acc);
    }

    private Book createBookInDb(String title, String isbn, Set<Author> authors, Set<Category> categories) {
        Book b = new Book(title, isbn, "Description", "Publisher", 2024, null, CirculationPolicy.STANDARD, "Computer Science and Engineering", authors, categories);
        return bookRepository.save(b);
    }

    private void authenticateAs(UserAccount account) {
        AccountUserDetails details = new AccountUserDetails(account);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities())
        );
    }

    @Test
    @DisplayName("1. Book creation triggers notifications to users with matching category in wishlist")
    void testBookCreationTriggersNotificationToWishlistUsers() {
        BookRequest req = new BookRequest(
                "Introduction to Neural Networks",
                "9780131103627",
                "Deep learning and neural computation",
                "MIT Press",
                2025,
                null,
                CirculationPolicy.STANDARD,
                "Computer Science and Engineering",
                List.of("Geoffrey Hinton"),
                List.of(csCategory.getName()),
                BigDecimal.valueOf(2),
                "Shelf CS-1"
        );

        BookDetailResponse created = catalogueService.createBook(req);
        assertThat(created).isNotNull();

        // Check studentWithCsWishlist received notification
        Page<NotificationRecord> notifs = notificationService.getNotificationsForUser(
                studentWithCsWishlist.getId(), studentWithCsWishlist.getRole(), "ALL", "LATEST", 0, 10
        );

        List<NotificationRecord> wishlistNotifs = notifs.getContent().stream()
                .filter(n -> "NEW_BOOK_IN_WISHLIST_CATEGORY".equals(n.category()))
                .toList();

        assertThat(wishlistNotifs).hasSize(1);
        NotificationRecord record = wishlistNotifs.get(0);
        assertThat(record.title()).isEqualTo("A new book matches your interests!");
        assertThat(record.message()).contains("Introduction to Neural Networks");
        assertThat(record.message()).contains(csCategory.getName());
        assertThat(record.actionRoute()).isEqualTo("/workspace/books/" + created.id());
    }

    @Test
    @DisplayName("2. User with multiple wishlisted books in the same category receives only ONE notification")
    void testUserWithMultipleWishlistBooksInSameCategoryReceivesOnlyOneNotification() {
        BookRequest req = new BookRequest(
                "Advanced Operating Systems 2026",
                "9780131103634",
                "Operating systems guide",
                "Pearson",
                2026,
                null,
                CirculationPolicy.STANDARD,
                "Computer Science and Engineering",
                List.of("Andrew Tanenbaum"),
                List.of(csCategory.getName()),
                BigDecimal.valueOf(2),
                "Shelf CS-2"
        );

        catalogueService.createBook(req);

        // Bob has both existingCsBook1 and existingCsBook2 in CS
        Page<NotificationRecord> bobNotifs = notificationService.getNotificationsForUser(
                studentWithMultiWishlistSameCategory.getId(), studentWithMultiWishlistSameCategory.getRole(), "ALL", "LATEST", 0, 10
        );

        List<NotificationRecord> wishlistNotifs = bobNotifs.getContent().stream()
                .filter(n -> "NEW_BOOK_IN_WISHLIST_CATEGORY".equals(n.category()))
                .toList();

        assertThat(wishlistNotifs).hasSize(1);
    }

    @Test
    @DisplayName("3. User with wishlist books in multiple matching categories receives ONE notification mentioning those categories")
    void testUserWithWishlistInMultipleMatchingCategoriesReceivesCombinedNotification() {
        // Book with both CS and Mathematics
        BookRequest req = new BookRequest(
                "Concrete Mathematics & Algorithms",
                "9780131103641",
                "Foundational math for CS",
                "Addison-Wesley",
                2025,
                null,
                CirculationPolicy.STANDARD,
                "Computer Science and Engineering",
                List.of("Donald Knuth"),
                List.of(csCategory.getName(), mathCategory.getName()),
                BigDecimal.valueOf(2),
                "Shelf MATH-1"
        );

        catalogueService.createBook(req);

        Page<NotificationRecord> profNotifs = notificationService.getNotificationsForUser(
                facultyWithMultiCategories.getId(), facultyWithMultiCategories.getRole(), "ALL", "LATEST", 0, 10
        );

        List<NotificationRecord> wishlistNotifs = profNotifs.getContent().stream()
                .filter(n -> "NEW_BOOK_IN_WISHLIST_CATEGORY".equals(n.category()))
                .toList();

        assertThat(wishlistNotifs).hasSize(1);
        NotificationRecord record = wishlistNotifs.get(0);
        assertThat(record.message()).contains(csCategory.getName());
        assertThat(record.message()).contains(mathCategory.getName());
    }

    @Test
    @DisplayName("4. User with wishlisted books in non-matching categories does NOT receive a notification")
    void testUserWithNonMatchingWishlistCategoryDoesNotReceiveNotification() {
        BookRequest req = new BookRequest(
                "Quantum Computation Primer",
                "9780131103658",
                "Quantum physics and computing",
                "Oxford",
                2026,
                null,
                CirculationPolicy.STANDARD,
                "Computer Science and Engineering",
                List.of("David Deutsch"),
                List.of(csCategory.getName()),
                BigDecimal.valueOf(2),
                "Shelf CS-3"
        );

        catalogueService.createBook(req);

        // Clara only has Literature
        Page<NotificationRecord> claraNotifs = notificationService.getNotificationsForUser(
                studentWithOtherCategory.getId(), studentWithOtherCategory.getRole(), "ALL", "LATEST", 0, 10
        );

        List<NotificationRecord> wishlistNotifs = claraNotifs.getContent().stream()
                .filter(n -> "NEW_BOOK_IN_WISHLIST_CATEGORY".equals(n.category()))
                .toList();

        assertThat(wishlistNotifs).isEmpty();
    }

    @Test
    @DisplayName("5. User with empty wishlist does NOT receive a notification")
    void testUserWithEmptyWishlistDoesNotReceiveNotification() {
        BookRequest req = new BookRequest(
                "Distributed Cloud Architecture",
                "9780131103665",
                "Cloud computing fundamentals",
                "O'Reilly",
                2026,
                null,
                CirculationPolicy.STANDARD,
                "Computer Science and Engineering",
                List.of("Martin Fowler"),
                List.of(csCategory.getName()),
                BigDecimal.valueOf(2),
                "Shelf CS-4"
        );

        catalogueService.createBook(req);

        // Dave has no books in wishlist
        Page<NotificationRecord> daveNotifs = notificationService.getNotificationsForUser(
                studentWithEmptyWishlist.getId(), studentWithEmptyWishlist.getRole(), "ALL", "LATEST", 0, 10
        );

        List<NotificationRecord> wishlistNotifs = daveNotifs.getContent().stream()
                .filter(n -> "NEW_BOOK_IN_WISHLIST_CATEGORY".equals(n.category()))
                .toList();

        assertThat(wishlistNotifs).isEmpty();
    }

    @Test
    @DisplayName("6. Librarian accounts do NOT receive wishlist-based new book arrival notifications")
    void testLibrarianAccountsDoNotReceiveWishlistNewBookNotification() {
        BookRequest req = new BookRequest(
                "Database System Concepts",
                "9780131103672",
                "Database internals",
                "McGraw-Hill",
                2026,
                null,
                CirculationPolicy.STANDARD,
                "Computer Science and Engineering",
                List.of("Silberschatz"),
                List.of(csCategory.getName()),
                BigDecimal.valueOf(2),
                "Shelf CS-5"
        );

        catalogueService.createBook(req);

        Page<NotificationRecord> libNotifs = notificationService.getNotificationsForUser(
                librarianUser.getId(), librarianUser.getRole(), "ALL", "LATEST", 0, 10
        );

        List<NotificationRecord> wishlistNotifs = libNotifs.getContent().stream()
                .filter(n -> "NEW_BOOK_IN_WISHLIST_CATEGORY".equals(n.category()))
                .toList();

        assertThat(wishlistNotifs).isEmpty();
    }

    @Test
    @DisplayName("7. Unapproved / disabled user accounts do NOT receive notifications")
    void testUnapprovedOrDisabledUsersDoNotReceiveNotifications() {
        BookRequest req = new BookRequest(
                "Computer Networking Basics",
                "9780131103689",
                "Top down networking approach",
                "Pearson",
                2026,
                null,
                CirculationPolicy.STANDARD,
                "Computer Science and Engineering",
                List.of("Kurose & Ross"),
                List.of(csCategory.getName()),
                BigDecimal.valueOf(2),
                "Shelf CS-6"
        );

        catalogueService.createBook(req);

        // Disabled student
        Page<NotificationRecord> disabledNotifs = notificationService.getNotificationsForUser(
                disabledStudent.getId(), disabledStudent.getRole(), "ALL", "LATEST", 0, 10
        );
        assertThat(disabledNotifs.getContent().stream()
                .filter(n -> "NEW_BOOK_IN_WISHLIST_CATEGORY".equals(n.category()))
                .toList()).isEmpty();

        // Pending student
        Page<NotificationRecord> pendingNotifs = notificationService.getNotificationsForUser(
                pendingStudent.getId(), pendingStudent.getRole(), "ALL", "LATEST", 0, 10
        );
        assertThat(pendingNotifs.getContent().stream()
                .filter(n -> "NEW_BOOK_IN_WISHLIST_CATEGORY".equals(n.category()))
                .toList()).isEmpty();
    }

    @Test
    @DisplayName("8. Dedup check: triggering notifyWishlistUsersForNewBook twice does not duplicate notifications")
    void testDedupKeyPreventsDuplicateNotifications() {
        BookRequest req = new BookRequest(
                "Artificial Intelligence A Modern Approach",
                "9780131103696",
                "AI standard reference",
                "Pearson",
                2026,
                null,
                CirculationPolicy.STANDARD,
                "Computer Science and Engineering",
                List.of("Stuart Russell", "Peter Norvig"),
                List.of(csCategory.getName()),
                BigDecimal.valueOf(2),
                "Shelf CS-7"
        );

        BookDetailResponse created = catalogueService.createBook(req);
        Book book = bookRepository.findById(created.id()).orElseThrow();

        // Second manual dispatch
        int secondDispatchCount = wishlistService.notifyWishlistUsersForNewBook(book);
        assertThat(secondDispatchCount).isEqualTo(0);

        Page<NotificationRecord> notifs = notificationService.getNotificationsForUser(
                studentWithCsWishlist.getId(), studentWithCsWishlist.getRole(), "ALL", "LATEST", 0, 10
        );

        List<NotificationRecord> wishlistNotifs = notifs.getContent().stream()
                .filter(n -> "NEW_BOOK_IN_WISHLIST_CATEGORY".equals(n.category()))
                .toList();

        assertThat(wishlistNotifs).hasSize(1);
    }

    @Test
    @DisplayName("9. Notification preference disabled: user with matching category but wishlistBookAlerts disabled does not receive notification")
    void testDisabledNotificationPreferenceSkipsWishlistNotification() {
        // Disable wishlist book alerts preference for studentWithCsWishlist, while leaving newBookArrivals ON
        UserNotificationPreference pref = preferenceRepository.findByUserAccountId(studentWithCsWishlist.getId())
                .orElseGet(() -> new UserNotificationPreference(studentWithCsWishlist));
        pref.setNewBookArrivals(true);
        pref.setWishlistBookAlerts(false);
        preferenceRepository.save(pref);

        BookRequest req = new BookRequest(
                "Compiler Design Principles",
                "9780131103702",
                "Dragon book",
                "Addison-Wesley",
                2026,
                null,
                CirculationPolicy.STANDARD,
                "Computer Science and Engineering",
                List.of("Aho", "Ullman"),
                List.of(csCategory.getName()),
                BigDecimal.valueOf(2),
                "Shelf CS-8"
        );

        catalogueService.createBook(req);

        Page<NotificationRecord> notifs = notificationService.getNotificationsForUser(
                studentWithCsWishlist.getId(), studentWithCsWishlist.getRole(), "ALL", "LATEST", 0, 10
        );

        List<NotificationRecord> wishlistNotifs = notifs.getContent().stream()
                .filter(n -> "NEW_BOOK_IN_WISHLIST_CATEGORY".equals(n.category()))
                .toList();

        assertThat(wishlistNotifs).isEmpty();
    }

    @Test
    @DisplayName("9b. Preference Matrix verification for independent controls")
    void testNotificationPreferenceMatrix() {
        UUID studentId = studentWithCsWishlist.getId();
        UserNotificationPreference pref = preferenceRepository.findByUserAccountId(studentId)
                .orElseGet(() -> new UserNotificationPreference(studentWithCsWishlist));

        // Case 1: Both ON (default)
        pref.setNewBookArrivals(true);
        pref.setWishlistBookAlerts(true);
        preferenceRepository.save(pref);
        assertThat(notificationService.isNotificationAllowed(studentId, "NEW_BOOK_ARRIVAL")).isTrue();
        assertThat(notificationService.isNotificationAllowed(studentId, "NEW_BOOK_IN_WISHLIST_CATEGORY")).isTrue();

        // Case 2: New Book Arrivals ON, Wishlist-Based Book Alerts OFF
        pref.setNewBookArrivals(true);
        pref.setWishlistBookAlerts(false);
        preferenceRepository.save(pref);
        assertThat(notificationService.isNotificationAllowed(studentId, "NEW_BOOK_ARRIVAL")).isTrue();
        assertThat(notificationService.isNotificationAllowed(studentId, "NEW_BOOK_IN_WISHLIST_CATEGORY")).isFalse();

        // Case 3: New Book Arrivals OFF, Wishlist-Based Book Alerts ON
        pref.setNewBookArrivals(false);
        pref.setWishlistBookAlerts(true);
        preferenceRepository.save(pref);
        assertThat(notificationService.isNotificationAllowed(studentId, "NEW_BOOK_ARRIVAL")).isFalse();
        assertThat(notificationService.isNotificationAllowed(studentId, "NEW_BOOK_IN_WISHLIST_CATEGORY")).isTrue();

        // Case 4: Both OFF
        pref.setNewBookArrivals(false);
        pref.setWishlistBookAlerts(false);
        preferenceRepository.save(pref);
        assertThat(notificationService.isNotificationAllowed(studentId, "NEW_BOOK_ARRIVAL")).isFalse();
        assertThat(notificationService.isNotificationAllowed(studentId, "NEW_BOOK_IN_WISHLIST_CATEGORY")).isFalse();
    }

    @Test
    @DisplayName("9c. Preference persistence and default values")
    void testPreferencePersistenceAndDefault() {
        // Fresh user default check
        UserNotificationPreference pref = new UserNotificationPreference(studentWithCsWishlist);
        assertThat(pref.isWishlistBookAlerts()).isTrue();
        assertThat(pref.isNewBookArrivals()).isTrue();

        // Persistence check
        pref.setWishlistBookAlerts(false);
        UserNotificationPreference saved = preferenceRepository.save(pref);
        UserNotificationPreference loaded = preferenceRepository.findById(saved.getId()).orElseThrow();
        assertThat(loaded.isWishlistBookAlerts()).isFalse();

        loaded.setWishlistBookAlerts(true);
        UserNotificationPreference updated = preferenceRepository.save(loaded);
        assertThat(updated.isWishlistBookAlerts()).isTrue();
    }

    @Test
    @DisplayName("10. Book update does NOT trigger new book notifications")
    void testBookUpdateDoesNotTriggerNewBookNotification() {
        BookRequest req = new BookRequest(
                "Original Title Edition 1",
                "9780131103719",
                "Original description",
                "Publisher A",
                2025,
                null,
                CirculationPolicy.STANDARD,
                "Computer Science and Engineering",
                List.of("Author One"),
                List.of(csCategory.getName()),
                BigDecimal.valueOf(1),
                "Shelf CS-9"
        );

        BookDetailResponse created = catalogueService.createBook(req);

        int countBeforeUpdate = notificationRepository.findAll().stream()
                .filter(n -> "NEW_BOOK_IN_WISHLIST_CATEGORY".equals(n.getCategory()))
                .toList().size();

        BookRequest updateReq = new BookRequest(
                "Original Title Edition 2 Updated",
                "9780131103719",
                "Updated description",
                "Publisher A",
                2026,
                null,
                CirculationPolicy.STANDARD,
                "Computer Science and Engineering",
                List.of("Author One"),
                List.of(csCategory.getName()),
                BigDecimal.valueOf(1),
                "Shelf CS-9"
        );

        catalogueService.updateBook(created.id(), updateReq);

        int countAfterUpdate = notificationRepository.findAll().stream()
                .filter(n -> "NEW_BOOK_IN_WISHLIST_CATEGORY".equals(n.getCategory()))
                .toList().size();

        assertThat(countAfterUpdate).isEqualTo(countBeforeUpdate);
    }

    @Test
    @DisplayName("11. Copy addition does NOT trigger new book notifications")
    void testCopyAdditionDoesNotTriggerNewBookNotification() {
        BookRequest req = new BookRequest(
                "Software Engineering Practice",
                "9780131103726",
                "SE best practices",
                "Wiley",
                2025,
                null,
                CirculationPolicy.STANDARD,
                "Computer Science and Engineering",
                List.of("Ian Sommerville"),
                List.of(csCategory.getName()),
                BigDecimal.valueOf(1),
                "Shelf CS-10"
        );

        BookDetailResponse created = catalogueService.createBook(req);

        int countBeforeCopy = notificationRepository.findAll().stream()
                .filter(n -> "NEW_BOOK_IN_WISHLIST_CATEGORY".equals(n.getCategory()))
                .toList().size();

        catalogueService.addCopies(created.id(), new BookCopyBulkCreateRequest(BigDecimal.valueOf(3), "Shelf CS-10"));

        int countAfterCopy = notificationRepository.findAll().stream()
                .filter(n -> "NEW_BOOK_IN_WISHLIST_CATEGORY".equals(n.getCategory()))
                .toList().size();

        assertThat(countAfterCopy).isEqualTo(countBeforeCopy);
    }

    @Test
    @DisplayName("12. Notification entity has correct fields populated (title, message, related_entity_type, related_entity_id, action_route, dedup_key)")
    void testNotificationEntityFieldsPopulatedCorrectly() {
        BookRequest req = new BookRequest(
                "Deep Learning Architectures",
                "9780131103733",
                "Neural architecture exploration",
                "Academic Press",
                2026,
                null,
                CirculationPolicy.STANDARD,
                "Computer Science and Engineering",
                List.of("Ian Goodfellow"),
                List.of(csCategory.getName()),
                BigDecimal.valueOf(1),
                "Shelf CS-11"
        );

        BookDetailResponse created = catalogueService.createBook(req);

        List<AppNotification> notifs = notificationRepository.findAll().stream()
                .filter(n -> "NEW_BOOK_IN_WISHLIST_CATEGORY".equals(n.getCategory()))
                .filter(n -> n.getRecipient() != null && n.getRecipient().getId().equals(studentWithCsWishlist.getId()))
                .toList();

        assertThat(notifs).hasSize(1);
        AppNotification notif = notifs.get(0);

        assertThat(notif.getTitle()).isEqualTo("A new book matches your interests!");
        assertThat(notif.getMessage()).isEqualTo(
                "A new book, Deep Learning Architectures, has been added to the Computer Science category. Since you have books from this category in your wishlist, you might be interested in exploring it."
        );
        assertThat(notif.getCategory()).isEqualTo("NEW_BOOK_IN_WISHLIST_CATEGORY");
        assertThat(notif.getRelatedEntityType()).isEqualTo("BOOK");
        assertThat(notif.getRelatedEntityId()).isEqualTo(created.id());
        assertThat(notif.getActionRoute()).isEqualTo("/workspace/books/" + created.id());
        assertThat(notif.getDedupKey()).isEqualTo("NEW_BOOK_IN_WISHLIST_CATEGORY:" + created.id() + ":" + studentWithCsWishlist.getId());
        assertThat(notif.isRead()).isFalse();
        assertThat(notif.getReadAt()).isNull();
        assertThat(notif.getCreatedAt()).isNotNull();
    }

    @Test
    @DisplayName("13. Marking notification as read updates read status correctly")
    void testMarkAsReadUpdatesStatusCorrectly() {
        BookRequest req = new BookRequest(
                "Reinforcement Learning Intro",
                "9780131103740",
                "RL theory and practice",
                "MIT Press",
                2026,
                null,
                CirculationPolicy.STANDARD,
                "Computer Science and Engineering",
                List.of("Sutton & Barto"),
                List.of(csCategory.getName()),
                BigDecimal.valueOf(1),
                "Shelf CS-12"
        );

        catalogueService.createBook(req);

        Page<NotificationRecord> unreadNotifs = notificationService.getNotificationsForUser(
                studentWithCsWishlist.getId(), studentWithCsWishlist.getRole(), "UNREAD", "LATEST", 0, 10
        );

        NotificationRecord target = unreadNotifs.getContent().stream()
                .filter(n -> "NEW_BOOK_IN_WISHLIST_CATEGORY".equals(n.category()))
                .findFirst()
                .orElseThrow();

        assertThat(target.isRead()).isFalse();

        // Mark as read
        notificationService.markAsRead(target.id(), studentWithCsWishlist.getId(), studentWithCsWishlist.getRole());

        NotificationRecord afterRead = notificationService.getNotification(
                target.id(), studentWithCsWishlist.getId(), studentWithCsWishlist.getRole()
        );

        assertThat(afterRead.isRead()).isTrue();
        assertThat(afterRead.readAt()).isNotNull();
    }
}
