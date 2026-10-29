package com.libtrack.catalogue;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;
import java.net.URI;
import java.math.BigDecimal;
import java.time.Year;
import java.util.List;

public record BookRequest(
        @NotBlank @Size(max = 240) String title,
        @Size(max = 17) String isbn,
        @Size(max = 4000) String description,
        @Size(max = 200) String publisher,
        Integer publicationYear,
        @Size(max = 2048) String coverImageUrl,
        @NotNull CirculationPolicy circulationPolicy,
        @NotEmpty @Size(max = 12) List<@NotBlank @Size(max = 160) String> authors,
        @NotEmpty @Size(max = 10) List<@NotBlank @Size(max = 100) String> categories,
        @Min(value = 1, message = "Number of copies must be a whole number from 1 to 500")
        @Max(value = 500, message = "Number of copies must be a whole number from 1 to 500")
        @Digits(integer = 3, fraction = 0, message = "Number of copies must be a whole number from 1 to 500")
        BigDecimal numberOfCopies,
        @Size(max = 120) String location) {

    @AssertTrue(message = "ISBN must be a valid ISBN-10 or ISBN-13")
    public boolean isIsbnValid() { return IsbnValidator.isValid(isbn); }

    @AssertTrue(message = "Publication year must be between 1000 and the current year")
    public boolean isPublicationYearValid() { return publicationYear == null || (publicationYear >= 1000 && publicationYear <= Year.now().getValue()); }

    @AssertTrue(message = "Cover image URL must use HTTP or HTTPS")
    public boolean isCoverImageUrlValid() {
        if (coverImageUrl == null || coverImageUrl.isBlank()) return true;
        try {
            URI uri = URI.create(coverImageUrl.strip());
            return ("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
                    && uri.getHost() != null && uri.getUserInfo() == null;
        } catch (IllegalArgumentException exception) { return false; }
    }
}
