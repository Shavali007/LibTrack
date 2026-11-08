package com.libtrack.recommendation;

import java.util.List;

public record StudentInterestsResponse(
        List<String> categories
) {}
