package com.libtrack.circulation;

import com.libtrack.auth.UserAccount;
import com.libtrack.catalogue.Author;
import com.libtrack.catalogue.Book;
import com.libtrack.catalogue.BookCopy;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class LoanReceiptPdfService {

    private static final Logger log = LoggerFactory.getLogger(LoanReceiptPdfService.class);

    private static final Color COLOR_PRIMARY = new Color(0, 61, 48);          // Forest Green #003D30
    private static final Color COLOR_PRIMARY_LIGHT = new Color(234, 242, 239); // Sage Tint #EAF2EF
    private static final Color COLOR_PRIMARY_BORDER = new Color(194, 214, 207);// Sage Border #C2D6CF
    private static final Color COLOR_BG_CARD = new Color(253, 252, 249);       // Canvas/Surface #FDFCF9
    private static final Color COLOR_BG_SUB = new Color(246, 244, 238);        // Sub-canvas #F6F4EE
    private static final Color COLOR_LINE = new Color(229, 224, 213);          // Border #E5E0D5
    private static final Color COLOR_TEXT_PRIMARY = new Color(31, 36, 33);     // Charcoal 900 #1F2421
    private static final Color COLOR_TEXT_MUTED = new Color(90, 98, 93);       // Charcoal 600 #5A625D
    private static final Color COLOR_WHITE = Color.WHITE;

    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("dd MMMM yyyy, hh:mm a");
    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("dd MMMM yyyy");

    public byte[] generateReceiptPdf(Loan loan, LoanReceipt receipt, ZoneId zoneId) {
        ZoneId activeZone = zoneId != null ? zoneId : ZoneId.of("Asia/Kolkata");
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            PDType1Font fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font fontRegular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDType1Font fontOblique = new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE);

            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                float startX = 40f;
                float pageWidth = 515f; // 595.28 - 2*40

                // 1. Top Header Banner (Forest Green)
                float bannerY = 745f;
                float bannerHeight = 60f;
                drawRect(cs, startX, bannerY, pageWidth, bannerHeight, COLOR_PRIMARY, null, 0);

                drawText(cs, fontBold, 16f, COLOR_WHITE, startX + 16f, bannerY + 34f, "LIBTRACK");
                drawText(cs, fontRegular, 9.5f, COLOR_PRIMARY_LIGHT, startX + 16f, bannerY + 18f, "VIT-AP UNIVERSITY LIBRARY");

                drawText(cs, fontBold, 12f, COLOR_WHITE, startX + 330f, bannerY + 34f, "BOOK ISSUE RECEIPT");
                drawText(cs, fontRegular, 8f, COLOR_PRIMARY_LIGHT, startX + 330f, bannerY + 18f, "Official Proof of Physical Circulation");

                // 2. Receipt Identification Subheader Bar
                float subBarY = 716f;
                float subBarHeight = 22f;
                drawRect(cs, startX, subBarY, pageWidth, subBarHeight, COLOR_PRIMARY_LIGHT, COLOR_PRIMARY_BORDER, 0.75f);

                String receiptNoText = "RECEIPT NO: " + (receipt != null ? receipt.getReceiptNumber() : "REC-OFFICIAL");
                drawText(cs, fontBold, 8.5f, COLOR_PRIMARY, startX + 12f, subBarY + 6.5f, receiptNoText);

                Instant createdAt = receipt != null && receipt.getCreatedAt() != null
                        ? receipt.getCreatedAt()
                        : (loan.getCreatedAt() != null ? loan.getCreatedAt() : Instant.now());
                String formattedGeneratedAt = DATE_TIME_FORMATTER.format(createdAt.atZone(activeZone)) + " (" + activeZone.getId() + ")";
                drawText(cs, fontRegular, 8f, COLOR_PRIMARY, startX + 270f, subBarY + 6.5f, "Generated: " + formattedGeneratedAt);

                // 3. Card 1: Borrower Information & Transaction Summary
                float card1Y = 575f;
                float card1Height = 132f;
                drawRect(cs, startX, card1Y, pageWidth, card1Height, COLOR_BG_CARD, COLOR_LINE, 1f);

                // Divider down the middle
                drawLine(cs, startX + 257f, card1Y + 10f, startX + 257f, card1Y + card1Height - 10f, COLOR_LINE, 0.75f);

                // Left Column: Borrower Details
                float leftColX = startX + 14f;
                drawText(cs, fontBold, 8.5f, COLOR_PRIMARY, leftColX, card1Y + card1Height - 18f, "BORROWER INFORMATION");

                UserAccount borrower = loan.getBorrower();
                String borrowerName = borrower != null && borrower.getDisplayName() != null && !borrower.getDisplayName().isBlank()
                        ? borrower.getDisplayName()
                        : (borrower != null ? borrower.getEmail().split("@")[0] : "Library Member");
                String memberId = borrower != null && borrower.getInstitutionalId() != null
                        ? borrower.getInstitutionalId()
                        : "N/A";
                String memberRole = borrower != null && borrower.getRole() != null
                        ? borrower.getRole().name()
                        : "MEMBER";
                String memberEmail = borrower != null ? borrower.getEmail() : "N/A";
                String memberDept = borrower != null && borrower.getDepartment() != null
                        ? borrower.getDepartment()
                        : "General";

                drawLabelValue(cs, fontBold, fontRegular, 8.5f, leftColX, card1Y + card1Height - 38f, "Full Name:", borrowerName, 80f);
                drawLabelValue(cs, fontBold, fontRegular, 8.5f, leftColX, card1Y + card1Height - 56f, "Member ID:", memberId, 80f);
                drawLabelValue(cs, fontBold, fontRegular, 8.5f, leftColX, card1Y + card1Height - 74f, "Member Role:", memberRole, 80f);
                drawLabelValue(cs, fontBold, fontRegular, 8.5f, leftColX, card1Y + card1Height - 92f, "Email:", memberEmail, 80f);
                drawLabelValue(cs, fontBold, fontRegular, 8.5f, leftColX, card1Y + card1Height - 110f, "Department:", memberDept, 80f);

                // Right Column: Transaction Details
                float rightColX = startX + 270f;
                drawText(cs, fontBold, 8.5f, COLOR_PRIMARY, rightColX, card1Y + card1Height - 18f, "TRANSACTION SUMMARY");

                String loanIdStr = loan.getId() != null ? loan.getId().toString() : "N/A";
                String reqIdStr = loan.getRequest() != null && loan.getRequest().getId() != null
                        ? loan.getRequest().getId().toString()
                        : "N/A";
                String issuerName = loan.getIssuedBy() != null && loan.getIssuedBy().getDisplayName() != null
                        ? loan.getIssuedBy().getDisplayName()
                        : (loan.getIssuedBy() != null ? loan.getIssuedBy().getEmail() : "Circulation Desk");

                LocalDate issueDate = loan.getIssueDate() != null ? loan.getIssueDate() : LocalDate.now(activeZone);
                LocalDate dueDate = loan.getDueDate() != null ? loan.getDueDate() : issueDate.plusDays(14);

                drawLabelValue(cs, fontBold, fontRegular, 8.5f, rightColX, card1Y + card1Height - 38f, "Transaction ID:", loanIdStr, 80f);
                drawLabelValue(cs, fontBold, fontRegular, 8.5f, rightColX, card1Y + card1Height - 56f, "Request Ref:", reqIdStr, 80f);
                drawLabelValue(cs, fontBold, fontRegular, 8.5f, rightColX, card1Y + card1Height - 74f, "Issue Date:", DATE_FORMATTER.format(issueDate), 80f);
                drawLabelValue(cs, fontBold, fontBold, 9f, rightColX, card1Y + card1Height - 94f, "Due Date:", DATE_FORMATTER.format(dueDate) + " *", 80f, COLOR_PRIMARY);
                drawLabelValue(cs, fontBold, fontRegular, 8.5f, rightColX, card1Y + card1Height - 112f, "Issued By:", issuerName, 80f);

                // 4. Card 2: Book & Physical Copy Details
                float card2Y = 445f;
                float card2Height = 118f;
                drawRect(cs, startX, card2Y, pageWidth, card2Height, COLOR_BG_CARD, COLOR_LINE, 1f);

                drawText(cs, fontBold, 8.5f, COLOR_PRIMARY, startX + 14f, card2Y + card2Height - 18f, "ISSUED ITEM & PHYSICAL COPY DETAILS");

                Book book = loan.getRequest() != null ? loan.getRequest().getBook() : null;
                BookCopy copy = loan.getCopy();

                String bookTitle = book != null && book.getTitle() != null ? book.getTitle() : "Book Title Unavailable";
                String authors = book != null && book.getAuthors() != null && !book.getAuthors().isEmpty()
                        ? book.getAuthors().stream().map(Author::getName).collect(Collectors.joining(", "))
                        : "Author Not Specified";
                String isbn = book != null && book.getIsbn() != null ? book.getIsbn() : "N/A";
                String copyId = copy != null ? copy.getCopyIdentifier() : "N/A";
                String copyLocation = copy != null && copy.getLocation() != null ? copy.getLocation() : "Main Library Stacks";

                // Book Title (may wrap if long)
                drawText(cs, fontBold, 10f, COLOR_TEXT_PRIMARY, startX + 14f, card2Y + card2Height - 36f, "Title: " + bookTitle);
                drawLabelValue(cs, fontBold, fontRegular, 8.5f, startX + 14f, card2Y + card2Height - 54f, "Author(s):", authors, 70f);
                drawLabelValue(cs, fontBold, fontRegular, 8.5f, startX + 14f, card2Y + card2Height - 72f, "ISBN:", isbn, 70f);
                drawLabelValue(cs, fontBold, fontBold, 9f, startX + 14f, card2Y + card2Height - 92f, "Copy Barcode:", copyId, 70f, COLOR_PRIMARY);
                drawLabelValue(cs, fontBold, fontRegular, 8.5f, startX + 270f, card2Y + card2Height - 92f, "Shelf Location:", copyLocation, 75f);

                // 5. Card 3: Terms and Return Policy
                float card3Y = 245f;
                float card3Height = 190f;
                drawRect(cs, startX, card3Y, pageWidth, card3Height, COLOR_BG_SUB, COLOR_LINE, 1f);

                drawText(cs, fontBold, 8.5f, COLOR_PRIMARY, startX + 14f, card3Y + card3Height - 18f, "TERMS OF CIRCULATION & BORROWER RESPONSIBILITY");

                float bulletY = card3Y + card3Height - 36f;
                float stepY = 28f;

                drawBulletPoint(cs, fontBold, fontRegular, startX + 14f, bulletY,
                        "1. Return Responsibility:",
                        "The borrowed material must be returned to the circulation desk on or before the due date (" + DATE_FORMATTER.format(dueDate) + ").");

                drawBulletPoint(cs, fontBold, fontRegular, startX + 14f, bulletY - stepY,
                        "2. Overdue Penalties:",
                        "Late returns incur a fine rate of INR " + loan.getDailyFineRate().stripTrailingZeros().toPlainString() + " per calendar day (Maximum fine: INR " + loan.getMaxFineAmount().stripTrailingZeros().toPlainString() + "). Unsettled fines restrict future borrowing.");

                drawBulletPoint(cs, fontBold, fontRegular, startX + 14f, bulletY - stepY * 2,
                        "3. Physical Custody & Care:",
                        "The borrower is held strictly accountable for the condition of the physical copy. Marking, tearing, water damage, or loss will result in mandatory replacement cost plus administrative fees.");

                drawBulletPoint(cs, fontBold, fontRegular, startX + 14f, bulletY - stepY * 3,
                        "4. Renewal Privilege:",
                        "If eligible and no reservation holds exist, a single extension renewal may be submitted through the LibTrack web portal prior to the due date.");

                drawBulletPoint(cs, fontBold, fontRegular, startX + 14f, bulletY - stepY * 4,
                        "5. Official Document Status:",
                        "This document is an authentic electronic record issued by the LibTrack Academic Management System confirming custody transfer of physical media. No signature required.");

                // 6. Card 4: Verification & Library Details Footer
                float card4Y = 150f;
                float card4Height = 85f;
                drawRect(cs, startX, card4Y, pageWidth, card4Height, COLOR_BG_CARD, COLOR_LINE, 1f);

                // Left: Verification code block
                drawText(cs, fontBold, 8f, COLOR_PRIMARY, startX + 14f, card4Y + card4Height - 16f, "DIGITAL VERIFICATION REFERENCE");
                String verifyCode = "LT-VERIFY-" + (receipt != null ? receipt.getReceiptNumber() : "REC") + "-" + (loan.getId() != null ? loan.getId().toString().substring(0, 8).toUpperCase() : "OK");
                drawText(cs, fontBold, 9f, COLOR_TEXT_PRIMARY, startX + 14f, card4Y + card4Height - 32f, verifyCode);
                drawText(cs, fontOblique, 7.5f, COLOR_TEXT_MUTED, startX + 14f, card4Y + card4Height - 46f, "Digitally signed and recorded in LibTrack Central Database.");
                drawText(cs, fontRegular, 7.5f, COLOR_TEXT_MUTED, startX + 14f, card4Y + card4Height - 60f, "Authorized Issuer ID: " + (loan.getIssuedBy() != null ? loan.getIssuedBy().getId() : "SYSTEM"));

                // Right: University Library contact details
                float footerRightX = startX + 270f;
                drawText(cs, fontBold, 8f, COLOR_PRIMARY, footerRightX, card4Y + card4Height - 16f, "VIT-AP UNIVERSITY CENTRAL LIBRARY");
                drawText(cs, fontRegular, 7.5f, COLOR_TEXT_MUTED, footerRightX, card4Y + card4Height - 32f, "Circulation Desk, Ground Floor, Academic Block");
                drawText(cs, fontRegular, 7.5f, COLOR_TEXT_MUTED, footerRightX, card4Y + card4Height - 46f, "Amaravati, Andhra Pradesh - 522237, India");
                drawText(cs, fontRegular, 7.5f, COLOR_PRIMARY, footerRightX, card4Y + card4Height - 60f, "Email: library@vitap.ac.in | Phone: +91 (863) 2370 000");

                // Page bottom footer line
                float bottomY = 125f;
                drawLine(cs, startX, bottomY, startX + pageWidth, bottomY, COLOR_LINE, 0.5f);
                drawText(cs, fontRegular, 7f, COLOR_TEXT_MUTED, startX + 130f, bottomY - 12f,
                        "LibTrack Smart Academic Library System · Issue Receipt Document · " + (receipt != null ? receipt.getReceiptNumber() : ""));
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        } catch (IOException ex) {
            log.error("Failed to generate PDF issue receipt for loan {}", loan.getId(), ex);
            throw new IllegalStateException("Could not generate book issue receipt PDF", ex);
        }
    }

    private void drawBulletPoint(PDPageContentStream cs, PDType1Font boldFont, PDType1Font regularFont,
                                 float x, float y, String boldHeading, String bodyText) throws IOException {
        drawText(cs, boldFont, 8f, COLOR_TEXT_PRIMARY, x, y, boldHeading);
        drawText(cs, regularFont, 7.5f, COLOR_TEXT_MUTED, x + 10f, y - 11f, bodyText);
    }

    private void drawLabelValue(PDPageContentStream cs, PDType1Font labelFont, PDType1Font valueFont,
                                float fontSize, float x, float y, String label, String value, float valueOffset) throws IOException {
        drawLabelValue(cs, labelFont, valueFont, fontSize, x, y, label, value, valueOffset, COLOR_TEXT_PRIMARY);
    }

    private void drawLabelValue(PDPageContentStream cs, PDType1Font labelFont, PDType1Font valueFont,
                                float fontSize, float x, float y, String label, String value, float valueOffset, Color valueColor) throws IOException {
        drawText(cs, labelFont, fontSize, COLOR_TEXT_MUTED, x, y, label);
        drawText(cs, valueFont, fontSize, valueColor, x + valueOffset, y, value);
    }

    private void drawText(PDPageContentStream cs, PDType1Font font, float fontSize, Color color,
                          float x, float y, String text) throws IOException {
        if (text == null || text.isBlank()) return;
        String safe = sanitize(text);
        cs.beginText();
        cs.setFont(font, fontSize);
        cs.setNonStrokingColor(color);
        cs.newLineAtOffset(x, y);
        cs.showText(safe);
        cs.endText();
    }

    private void drawRect(PDPageContentStream cs, float x, float y, float width, float height,
                          Color fillColor, Color strokeColor, float lineWidth) throws IOException {
        cs.saveGraphicsState();
        if (fillColor != null) {
            cs.setNonStrokingColor(fillColor);
        }
        if (strokeColor != null) {
            cs.setStrokingColor(strokeColor);
            cs.setLineWidth(lineWidth);
        }
        cs.addRect(x, y, width, height);
        if (fillColor != null && strokeColor != null) {
            cs.fillAndStroke();
        } else if (fillColor != null) {
            cs.fill();
        } else if (strokeColor != null) {
            cs.stroke();
        }
        cs.restoreGraphicsState();
    }

    private void drawLine(PDPageContentStream cs, float x1, float y1, float x2, float y2,
                          Color color, float lineWidth) throws IOException {
        cs.saveGraphicsState();
        cs.setStrokingColor(color);
        cs.setLineWidth(lineWidth);
        cs.moveTo(x1, y1);
        cs.lineTo(x2, y2);
        cs.stroke();
        cs.restoreGraphicsState();
    }

    private static String sanitize(String input) {
        if (input == null) return "";
        return input
                .replace("\u20B9", "INR ") // Rupee
                .replace("\u2014", "-")    // Em dash
                .replace("\u2013", "-")    // En dash
                .replace("\u2018", "'")    // Left single quote
                .replace("\u2019", "'")    // Right single quote
                .replace("\u201C", "\"")   // Left double quote
                .replace("\u201D", "\"")   // Right double quote
                .replace("\u2022", "* ")   // Bullet
                .replaceAll("[^\\x20-\\x7E\\xA0-\\xFF]", " ");
    }
}
