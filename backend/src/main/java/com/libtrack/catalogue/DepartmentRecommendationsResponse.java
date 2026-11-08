package com.libtrack.catalogue;

import java.util.List;

public record DepartmentRecommendationsResponse(
        String department,
        List<BookSummaryResponse> books
) {}
