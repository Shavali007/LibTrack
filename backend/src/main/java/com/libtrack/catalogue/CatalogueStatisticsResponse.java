package com.libtrack.catalogue;

public record CatalogueStatisticsResponse(
        long totalBooks,
        long totalCategories,
        long availableCopies,
        long availableBooks,
        long unavailableBooks,
        Integer minimumPublicationYear,
        Integer maximumPublicationYear) {}
