package com.libtrack.recommendation;

import java.util.List;

public record StudentInterestsRequest(
        List<String> categories
) {}
